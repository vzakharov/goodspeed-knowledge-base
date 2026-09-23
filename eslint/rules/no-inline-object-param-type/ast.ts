import type { Rule, SourceCode } from 'eslint';
import type * as ESTree from 'estree';

import { type AstNode, tsType, type WithAnnotation } from '../estree-mixins';

/** A parameter node that may carry a TS type annotation (Identifier/ObjectPattern). */
export type AnnotatedNode = ESTree.Node & {
  optional?: boolean;
  typeAnnotation?: { typeAnnotation?: ESTree.Node & { type: string } };
};

export type FunctionNode = (
  | ESTree.FunctionDeclaration
  | ESTree.FunctionExpression
  | ESTree.ArrowFunctionExpression
) &
  Rule.NodeParentExtension;

export const isTypeLiteral = (node: ESTree.Node | undefined): boolean =>
  node?.type === tsType('TSTypeLiteral');

/**
 * The node that actually carries the type annotation for a parameter, plus
 * whether the parameter is optional at the call site and the parameter's own
 * default value (the `= …` right-hand side, `null` when the parameter isn't
 * defaulted). Unwraps `AssignmentPattern` (a defaulted param) to its `.left`,
 * and treats a default value as "optional".
 */
export function annotationCarrier(param: ESTree.Node): {
  carrier: AnnotatedNode;
  optional: boolean;
  paramDefault: ESTree.Node | null;
} {
  if (param.type === 'AssignmentPattern') {
    return {
      carrier: param.left,
      optional: true,
      paramDefault: param.right,
    };
  }
  const carrier = param as AnnotatedNode;
  return {
    carrier,
    optional: carrier.optional === true,
    paramDefault: null,
  };
}

/** An object-literal-typed parameter and everything the rule needs about it. */
export type ObjectTypedParam = WithAnnotation & {
  /** The inline `TSTypeLiteral` node (the `{ … }` shape). */
  literal: ESTree.Node;
  /** The annotated `Identifier`/`ObjectPattern`. */
  carrier: AnnotatedNode;
  optional: boolean;
  /** The parameter's own name (`null` when destructured in place). */
  paramName: string | null;
  /** The parameter's default value, when defaulted (`= …`). */
  paramDefault: ESTree.Node | null;
};

/**
 * Object-literal-typed params, keeping the literal node, the annotation wrapper,
 * the carrier, optionality, the parameter's own name (`null` when destructured
 * in place — an `ObjectPattern` has no single name), and its default value.
 */
export function objectTypedParams(fn: FunctionNode): ObjectTypedParam[] {
  const result: ObjectTypedParam[] = [];
  for (const param of fn.params) {
    if (param.type === 'RestElement' || param.type === 'ArrayPattern') continue;
    const { carrier, optional, paramDefault } = annotationCarrier(param);
    if (carrier.type !== 'Identifier' && carrier.type !== 'ObjectPattern') {
      continue;
    }
    const annotation = carrier.typeAnnotation;
    const literal = annotation?.typeAnnotation;
    if (isTypeLiteral(literal)) {
      const paramName =
        carrier.type === 'Identifier'
          ? (carrier as ESTree.Node as ESTree.Identifier).name
          : null;
      result.push({
        literal: literal!,
        annotation: annotation as unknown as ESTree.Node,
        carrier,
        optional,
        paramName,
        paramDefault,
      });
    }
  }
  return result;
}

const PRIMITIVE_KEYWORDS = new Set([
  'TSStringKeyword',
  'TSNumberKeyword',
  'TSBooleanKeyword',
]);

/** A node with a possibly-computed key — an object-pattern property or a type-literal member. */
type KeyedNode = { computed?: boolean; key?: ESTree.Node };

/** The Identifier key name of a non-computed pattern/type member, else `null`. */
function memberKeyName(node: KeyedNode): string | null {
  if (node.computed === true) return null;
  return node.key?.type === 'Identifier' ? node.key.name : null;
}

/**
 * Whether a destructured object parameter's inline type annotation is redundant:
 * every destructured field has a default, the parameter itself defaults to an
 * empty `{}`, and every annotated field is an optional primitive
 * (`string`/`number`/`boolean`) keyed exactly to the destructured fields. Under
 * those conditions TypeScript infers precisely the same `{ field?: T; … }` from
 * the field defaults, so the annotation adds nothing — the fix drops it rather
 * than extracting an alias. The primitive/optional/same-keys guard is what keeps
 * it from firing where the annotation actually narrows inference (a literal
 * union like `'month' | 'year'`, a `Record<…>`, a required field), which would
 * silently widen the type.
 */
export function isRedundantDefaultedObjectParam(
  carrier: AnnotatedNode,
  paramDefault: ESTree.Node | null,
  literal: ESTree.Node,
): boolean {
  if (carrier.type !== 'ObjectPattern') return false;
  if (
    paramDefault?.type !== 'ObjectExpression' ||
    paramDefault.properties.length > 0
  ) {
    return false;
  }
  const { properties } = carrier as ESTree.Node as ESTree.ObjectPattern;
  if (properties.length === 0) return false;
  const destructuredKeys = new Set<string>();
  for (const prop of properties) {
    if (prop.type !== 'Property' || prop.value.type !== 'AssignmentPattern') {
      return false;
    }
    const key = memberKeyName(prop);
    if (key === null) return false;
    destructuredKeys.add(key);
  }

  const members = (literal as AstNode as { members?: AstNode[] }).members ?? [];
  if (members.length !== destructuredKeys.size) return false;
  return members.every((member) => {
    if (
      member.type !== tsType('TSPropertySignature') ||
      (member as { optional?: boolean }).optional !== true
    ) {
      return false;
    }
    const key = memberKeyName(member as KeyedNode);
    if (key === null || !destructuredKeys.has(key)) return false;
    const annotated = (
      member as { typeAnnotation?: { typeAnnotation?: { type?: string } } }
    ).typeAnnotation?.typeAnnotation;
    return (
      annotated !== undefined && PRIMITIVE_KEYWORDS.has(annotated.type ?? '')
    );
  });
}

/**
 * The node's parent, or `null` at the root. ESLint types `parent` as
 * non-nullable, so a walk reading it directly gets a termination check the
 * type checker calls dead.
 */
export function parentOf(node: Rule.Node): Rule.Node | null {
  return (node as { parent?: Rule.Node | null }).parent ?? null;
}

/** Whether `anchor`'s direct parent is the module root (a safe insertion point). */
function isModuleTopLevel(anchor: ESTree.Node): boolean {
  const parent = (anchor as Rule.Node).parent as ESTree.Node | null;
  return parent !== null && parent.type === 'Program';
}

/**
 * The nearest top-level statement enclosing `fn` — the node whose parent is the
 * `Program`. Always exists and is always a legal spot to insert a `type` alias.
 */
export function topLevelAnchor(fn: FunctionNode): ESTree.Node {
  let node = fn as unknown as Rule.Node;
  while (!isModuleTopLevel(node)) {
    node = node.parent!;
  }
  return node;
}

type Ranged = { range?: [number, number] };

/**
 * Source offset to insert the alias before — the start of the anchor, moved up
 * past any leading comment block directly attached to it so a function's
 * doc/JSDoc comment stays with the function rather than being orphaned above the
 * new alias. A blank line between a comment and the anchor breaks attachment.
 */
export function leadingInsertPos(
  sourceCode: SourceCode,
  anchor: ESTree.Node,
): number {
  const comments = sourceCode.getCommentsBefore(anchor);
  const text = sourceCode.getText();
  let start = (anchor as Ranged).range![0];
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i]! as ESTree.Comment & Ranged;
    const gap = text.slice(comment.range![1], start);
    if ((gap.match(/\n/g)?.length ?? 0) > 1) break;
    start = comment.range![0];
  }
  return start;
}

export { type AstNode, tsType } from '../estree-mixins';
