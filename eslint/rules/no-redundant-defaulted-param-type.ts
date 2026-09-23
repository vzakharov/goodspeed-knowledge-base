import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import type * as ts from 'typescript';

import { type AstNode, tsType, type WithAnnotation } from './estree-mixins';
import { hasTypeServices, type TypeServices } from './type-services';

/** The named-type of a `TSTypeReference`, or null when it isn't a bare identifier. */
function referenceName(typeRef: AstNode): string | null {
  const typeName = typeRef['typeName'] as AstNode | undefined;
  return typeName?.type === 'Identifier'
    ? (typeName as unknown as ESTree.Identifier).name
    : null;
}

type Candidate = WithAnnotation & {
  /** Referenced type's name, or null when it isn't a bare identifier. */
  typeName: string | null;
  /** The `AssignmentPattern` (`field = default`) of each destructured field. */
  fields: ESTree.AssignmentPattern[];
};

/**
 * The AST gate for the target shape `{ a = …, b = … }: Named = {}`. Requires a
 * `TSTypeReference` annotation — inline `{ … }` literals belong to
 * `no-inline-object-param-type`. A match is only a candidate; the per-field
 * type-equivalence check still decides whether the annotation is redundant.
 */
function candidateParam(param: ESTree.Node): Candidate | null {
  if (param.type !== 'AssignmentPattern') return null;
  const { left, right } = param;
  if (right.type !== 'ObjectExpression' || right.properties.length > 0) {
    return null;
  }
  if (left.type !== 'ObjectPattern') return null;

  const annotation = (left as { typeAnnotation?: AstNode }).typeAnnotation;
  const typeNode = annotation?.['typeAnnotation'] as AstNode | undefined;
  if (typeNode?.type !== tsType('TSTypeReference')) return null;

  const { properties } = left;
  if (properties.length === 0) return null;
  const fields: ESTree.AssignmentPattern[] = [];
  for (const prop of properties) {
    if (prop.type !== 'Property' || prop.computed) return null;
    if (prop.value.type !== 'AssignmentPattern') return null;
    if (prop.value.left.type !== 'Identifier') return null;
    fields.push(prop.value);
  }

  return {
    annotation: annotation as unknown as ESTree.Node,
    typeName: referenceName(typeNode),
    fields,
  };
}

/**
 * Whether a field's annotated type is exactly what its default alone would
 * infer, so the annotation adds nothing. `getBaseTypeOfLiteralType` is the
 * load-bearing step — it widens the default's fresh literal (`'month'` → string)
 * that `getWidenedType` alone leaves intact. Mutual assignability backs up the
 * string comparison against distinct types that print identically.
 */
function fieldIsRedundant(
  services: TypeServices,
  checker: ts.TypeChecker,
  field: ESTree.AssignmentPattern,
): boolean {
  const annotated = services.getTypeAtLocation(field.left);
  const inferred = checker.getWidenedType(
    checker.getBaseTypeOfLiteralType(services.getTypeAtLocation(field.right)),
  );

  if (checker.typeToString(annotated) !== checker.typeToString(inferred)) {
    return false;
  }
  return (
    checker.isTypeAssignableTo(annotated, inferred) &&
    checker.isTypeAssignableTo(inferred, annotated)
  );
}

/** Depth-first visit of every `.type`-bearing node under `root` (skips cycles). */
function walk(root: ESTree.Node, visit: (node: AstNode) => void): void {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }
    if (typeof current !== 'object' || current === null) continue;
    const node = current as Record<string, unknown>;
    if (typeof node['type'] === 'string') visit(node as AstNode);
    for (const key of Object.keys(node)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      stack.push(node[key]);
    }
  }
}

/** The name of a top-level `type`/`interface` declaration, else null. */
function typeDeclName(decl: AstNode | undefined): string | null {
  if (
    decl?.type !== tsType('TSTypeAliasDeclaration') &&
    decl?.type !== tsType('TSInterfaceDeclaration')
  ) {
    return null;
  }
  const id = decl.id as AstNode | undefined;
  return id?.type === 'Identifier'
    ? (id as unknown as ESTree.Identifier).name
    : null;
}

/**
 * Per-file `TSTypeReference` counts by name and the set of exported type names —
 * the inputs to the autofix-safety check: only a single-use, non-exported type
 * is safe to auto-remove, since removing a shared/exported one could orphan its
 * declaration.
 */
function collectTypeUsage(ast: ESTree.Program): {
  counts: Map<string, number>;
  exported: Set<string>;
} {
  const counts = new Map<string, number>();
  const exported = new Set<string>();

  walk(ast, (node) => {
    if (node.type === tsType('TSTypeReference')) {
      const name = referenceName(node);
      if (name !== null) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  });

  for (const statement of ast.body as unknown as AstNode[]) {
    if (statement.type !== tsType('ExportNamedDeclaration')) continue;
    const name = typeDeclName(statement.declaration as AstNode | undefined);
    if (name !== null) exported.add(name);
  }

  return { counts, exported };
}

/**
 * Flags a named type annotation on a fully-defaulted destructured parameter when
 * a per-field type-equivalence check proves it adds nothing — the target shape is
 * `function f({ a = 1, b = false }: Named = {}) {}`. It never fires where the
 * annotation carries type information a default can't reproduce (literal unions,
 * `Record`/index types, nullable members), so it can't silently widen types.
 *
 * Inline `{ … }` literals are deliberately out of scope — `no-inline-object-param-type`
 * owns those; this rule handles only the `TSTypeReference` gap that rule can't see
 * through. Type-aware (reads the parser-services checker); stays silent without it.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Disallow a redundant named type annotation on a fully-defaulted destructured parameter',
    },
    schema: [],
    messages: {
      redundant:
        'Redundant type annotation on a fully-defaulted destructured parameter — TypeScript infers the same type from the field defaults. Remove it.',
      redundantShared:
        'Redundant type annotation on a fully-defaulted destructured parameter — TypeScript infers the same type from the field defaults. The referenced type is shared or exported, so remove the annotation by hand (and drop the type if it becomes unused).',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    if (!hasTypeServices(services)) return {};
    const checker = services.program.getTypeChecker();

    let usage: ReturnType<typeof collectTypeUsage> | null = null;
    const typeUsage = () => (usage ??= collectTypeUsage(sourceCode.ast));

    const checkFunction = (node: ESTree.Node): void => {
      const { params } = node as unknown as { params: ESTree.Node[] };
      for (const param of params) {
        const candidate = candidateParam(param);
        if (candidate === null) continue;
        if (
          !candidate.fields.every((field) =>
            fieldIsRedundant(services, checker, field),
          )
        ) {
          continue;
        }

        const { counts, exported } = typeUsage();
        const name = candidate.typeName;
        const autofixable =
          name !== null && (counts.get(name) ?? 0) === 1 && !exported.has(name);

        context.report({
          node: candidate.annotation,
          messageId: autofixable ? 'redundant' : 'redundantShared',
          fix: autofixable
            ? (fixer) => fixer.remove(candidate.annotation)
            : undefined,
        });
      }
    };

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};

export default rule;
