import type { Rule, SourceCode } from 'eslint';
import type * as ESTree from 'estree';

import type { Named, WithText } from '../estree-mixins';
import { walkAst } from '../walk-ast';
import { type AstNode, type FunctionNode, parentOf, tsType } from './ast';

/** All `TSTypeReference` identifier names appearing anywhere under `node`. */
export function collectTypeReferences(
  node: ESTree.Node | null | undefined,
): Set<string> {
  const names = new Set<string>();
  if (node === null || node === undefined) return names;
  walkAst(node, (current) => {
    if (current.type === tsType('TSTypeReference')) {
      const typeName = (current as unknown as { typeName?: ESTree.Node })
        .typeName;
      if (typeName?.type === 'Identifier') names.add(typeName.name);
    }
  });
  return names;
}

/** An in-scope type parameter: its name, verbatim declaration text, and the
 * type names its constraint/default reference (for the transitive closure). */
export type ScopedTypeParam = Named &
  WithText & {
    constraintRefs: Set<string>;
  };

/**
 * Type parameters in scope at the flagged function — declared on it and on every
 * enclosing function/class up to (and including) the top-level anchor. Ordered
 * outermost-first so a later param that constrains on an earlier one
 * (`<T, U extends keyof T>`) keeps a valid declaration order.
 */
export function collectInScopeTypeParams(
  fn: FunctionNode,
  anchor: ESTree.Node,
  sourceCode: SourceCode,
): ScopedTypeParam[] {
  const declarations: AstNode[][] = [];
  let node: Rule.Node | null = fn;
  while (node !== null) {
    const typeParams = (node as { typeParameters?: AstNode }).typeParameters;
    if (
      typeParams?.type === tsType('TSTypeParameterDeclaration') &&
      Array.isArray((typeParams as { params?: unknown }).params)
    ) {
      declarations.push(
        (typeParams as unknown as { params: AstNode[] }).params,
      );
    }
    if (node === anchor) break;
    node = parentOf(node);
  }
  declarations.reverse();
  const result: ScopedTypeParam[] = [];
  for (const params of declarations) {
    for (const param of params) {
      const loose = param as unknown as {
        name?: { name?: string };
        constraint?: ESTree.Node;
        default?: ESTree.Node;
      };
      const name = loose.name?.name;
      if (typeof name !== 'string') continue;
      const constraintRefs = new Set<string>([
        ...collectTypeReferences(loose.constraint),
        ...collectTypeReferences(loose.default),
      ]);
      result.push({ name, text: sourceCode.getText(param), constraintRefs });
    }
  }
  return result;
}

/**
 * The in-scope type params the literal actually depends on — those it references
 * directly, plus the transitive closure over their constraints/defaults (a
 * referenced `U extends keyof T` drags in `T`). Preserves `inScope` order.
 */
export function referencedTypeParams(
  literal: ESTree.Node,
  inScope: ScopedTypeParam[],
): ScopedTypeParam[] {
  const byName = new Map(inScope.map((param) => [param.name, param]));
  const referenced = new Set<string>();
  const queue = [...collectTypeReferences(literal)].filter((name) =>
    byName.has(name),
  );
  while (queue.length > 0) {
    const name = queue.pop()!;
    if (referenced.has(name)) continue;
    referenced.add(name);
    for (const dep of byName.get(name)!.constraintRefs) {
      if (byName.has(dep) && !referenced.has(dep)) queue.push(dep);
    }
  }
  return inScope.filter((param) => referenced.has(param.name));
}
