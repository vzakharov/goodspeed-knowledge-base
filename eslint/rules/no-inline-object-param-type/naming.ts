import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import { tsType } from './ast';

export const capitalize = (name: string): string =>
  name.charAt(0).toUpperCase() + name.slice(1);

/**
 * The class name that owns a `constructor` `MethodDefinition` — from the class's
 * own `id`, or from the `const C = class {…}` declarator for a class expression.
 */
function enclosingClassName(method: ESTree.Node): string | null {
  const classNode = ((method as Rule.Node).parent as Rule.Node | undefined)
    ?.parent as (ESTree.Node & { id?: ESTree.Identifier | null }) | undefined;
  if (classNode === undefined) return null;
  if (
    classNode.type === 'ClassDeclaration' ||
    classNode.type === 'ClassExpression'
  ) {
    if (classNode.id !== null && classNode.id !== undefined) {
      return classNode.id.name;
    }
    const owner = (classNode as Rule.Node).parent;
    if (
      owner?.type === 'VariableDeclarator' &&
      owner.id.type === 'Identifier'
    ) {
      return owner.id.name;
    }
  }
  return null;
}

/**
 * A name derivable directly from a single ancestor node, or `null` if this node
 * carries no name (keep walking outward).
 */
function nameFromAncestor(node: ESTree.Node): string | null {
  if (
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  ) {
    const { id } = node;
    return id === null || id === undefined ? null : id.name;
  }
  if (node.type === 'VariableDeclarator') {
    return node.id.type === 'Identifier' ? node.id.name : null;
  }
  if (node.type === 'Property') {
    if (node.computed) return null;
    return node.key.type === 'Identifier' ? node.key.name : null;
  }
  if (
    node.type === tsType('MethodDefinition') ||
    node.type === tsType('PropertyDefinition')
  ) {
    const def = node as unknown as {
      kind?: string;
      computed?: boolean;
      key: ESTree.Node;
    };
    if (def.kind === 'constructor') return enclosingClassName(node);
    if (def.computed === true) return null;
    return def.key.type === 'Identifier' ? def.key.name : null;
  }
  return null;
}

/**
 * The base name for the alias: walk outward from the function to the nearest
 * ancestor that yields a name (see `nameFromAncestor`). `null` when nothing up
 * the chain to module top is named (`export default function () {}`, a computed
 * method key with no other enclosing name) — reported without a fix.
 */
export function deriveBaseName(fn: Rule.Node): string | null {
  let node: Rule.Node = fn;
  while (node.type !== 'Program') {
    const name = nameFromAncestor(node);
    if (name !== null) return name;
    node = node.parent;
  }
  return null;
}

/** Top-level declared names (value- and type-space) for the collision guard. */
export function collectDeclaredNames(program: ESTree.Program): Set<string> {
  const names = new Set<string>();
  const add = (id: ESTree.Node | null | undefined): void => {
    if (id?.type === 'Identifier') names.add(id.name);
  };
  for (const statement of program.body) {
    const node =
      statement.type === 'ExportNamedDeclaration' ||
      statement.type === 'ExportDefaultDeclaration'
        ? ((statement.declaration ?? statement) as ESTree.Node)
        : statement;
    const loose = node as ESTree.Node & {
      id?: ESTree.Node | null;
      declarations?: ESTree.VariableDeclarator[];
      specifiers?: Array<{ local: ESTree.Identifier }>;
    };
    add(loose.id);
    for (const d of loose.declarations ?? []) add(d.id);
    for (const s of loose.specifiers ?? []) add(s.local);
  }
  return names;
}

/**
 * The role/name suffix for the alias. The parameter's own name wins
 * (`writeCsv(options: {…})` → `WriteCsvOptions`), after stripping the leading
 * underscores a deliberately-unused param carries (`_settings` → `Settings`) and
 * normalizing common abbreviations to their spelled-out role word (`opts` →
 * `Options`, `ctx` → `Context`). A destructured-in-place param (no name) or a
 * single-letter param (`o`, `u`, …) carries no meaning worth surfacing, so it
 * falls back to a role suffix (`Props` for a PascalCase/component base, else
 * `Options`/`Params`).
 */
export function deriveSuffix(
  paramName: string | null,
  base: string,
  optional: boolean,
): string {
  const cleaned = paramName?.replace(/^_+/, '') ?? null;
  const normalized = cleaned?.toLowerCase();
  if (normalized === 'opts' || normalized === 'options') return 'Options';
  if (normalized === 'ctx' || normalized === 'context') return 'Context';
  if (cleaned !== null && cleaned.length > 1) return capitalize(cleaned);
  if (/^[A-Z]/.test(base)) return 'Props';
  return optional ? 'Options' : 'Params';
}

/** `<Base><Suffix>`. */
export function buildAliasName(base: string, suffix: string): string {
  return `${capitalize(base)}${suffix}`;
}
