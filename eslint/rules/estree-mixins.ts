// AST vocabulary the project-local rules share. A member the app's type catalog
// already declares is re-exported from it, so `pnpm type-overlap` sees one
// declaration.

import type * as ESTree from 'estree';

// Relative, not `@/` — jiti gives `eslint/` no path alias.
export type { Named, WithText } from '../../apps/web/src/shared/typings';

/** Loosely-typed AST node — the TS-specific node kinds aren't in @types/estree. */
export type AstNode = ESTree.Node & Record<string, unknown>;

/** Cast a TS-only node `type` string that @types/estree's union doesn't include. */
export const tsType = (name: string): ESTree.Node['type'] =>
  name as ESTree.Node['type'];

/** The `TSTypeAnnotation` wrapper (`: Foo`) a rule reports or autofixes over. */
export type WithAnnotation = { annotation: ESTree.Node };

/** The `type` key as a bare `string` — an ESTree node kind before it is narrowed. */
export type WithStringType = { type: string };
