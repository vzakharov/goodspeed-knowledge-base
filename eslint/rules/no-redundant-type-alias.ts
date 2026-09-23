import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import type { WithStringType } from './estree-mixins';

// Flags a redundant type alias — `type A = B` whose right-hand side is *just
// another named type*, with no transformation. These accumulate as leftovers of
// our other type-shaping gates (e.g. `no-inline-object-param-type` extracts an
// inline literal to a named alias; type-overlap / `no-zod-parse-typed-input`
// cleanups leave a param type pointing at an already-named type), so the alias
// is a second name for one type that drifts silently. Use the referenced type
// directly at the use site and delete the alias.
//
// Only the pure-rename shape is flagged: `type A = B;` and `type A = Ns.B;`.
// Deliberately NOT flagged, because each is a real definition rather than a
// rename:
//   - object literals (`type A = { x: number }`), unions/intersections
//     (`B | C`, `B & C`), and other composite types;
//   - primitive/keyword aliases (`type UserId = string`) — naming a primitive
//     is an intentional documentation pattern, not an alias of another type;
//   - generic instantiations (`type Props = Foo<Bar>`) — these name a
//     specialization and carry real information;
//   - generic aliases (`type Maybe<T> = T`) — the alias itself abstracts.

/** Cast a TS-only node `type` string that @types/estree's union doesn't include. */
const tsType = (name: string): ESTree.Node['type'] =>
  name as ESTree.Node['type'];

// Minimal shapes for the TS-specific nodes this rule reads — @types/estree's
// union doesn't include them, so we describe just the fields we touch. Named
// object types (not an index-signature `Record`) keep property access
// statically checked under `noPropertyAccessFromIndexSignature`.
type WithTypeParameters = { typeParameters?: unknown };

type TSTypeReferenceNode = WithStringType &
  WithTypeParameters & {
    typeName: ESTree.Node;
    /** Generic instantiation args — `typeArguments` (newer parser) / `typeParameters` (older). */
    typeArguments?: unknown;
  };
type TSTypeAliasNode = WithTypeParameters & {
  id: ESTree.Identifier;
  /** The right-hand side type. */
  typeAnnotation?: { type: string };
};

const rule: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow a redundant type alias that just renames another named type (type A = B) — use the referenced type directly',
    },
    schema: [],
    messages: {
      redundant:
        'Redundant type alias: `{{name}}` is just another name for `{{target}}`. Use `{{target}}` directly at the use site and delete this alias.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      [tsType('TSTypeAliasDeclaration')](node: ESTree.Node) {
        const alias = node as unknown as TSTypeAliasNode;

        // A generic alias (`type Maybe<T> = …`) abstracts — never a rename.
        if (alias.typeParameters !== undefined) return;

        if (alias.typeAnnotation?.type !== tsType('TSTypeReference')) return;
        const rhs = alias.typeAnnotation as unknown as TSTypeReferenceNode;

        // A generic instantiation (`type Props = Foo<Bar>`) names a
        // specialization — the field is `typeArguments` (newer parser) or
        // `typeParameters` (older); either present means it's not a bare rename.
        if (rhs.typeArguments !== undefined || rhs.typeParameters !== undefined)
          return;

        const id = alias.id;
        const { name } = id;
        const target = sourceCode.getText(rhs.typeName);

        context.report({
          node: id,
          messageId: 'redundant',
          data: { name, target },
        });
      },
    };
  },
};

export default rule;
