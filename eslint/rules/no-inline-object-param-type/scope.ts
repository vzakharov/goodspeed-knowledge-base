import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

import { type AstNode, type FunctionNode, parentOf, tsType } from './ast';

/** The leftmost identifier of a `typeof X`/`typeof X.y` query's `exprName`. */
function typeQueryRoot(exprName: AstNode | undefined): string | null {
  let node = exprName;
  while (node?.type === tsType('TSQualifiedName')) {
    node = (node as unknown as { left?: AstNode }).left;
  }
  return node?.type === 'Identifier'
    ? (node as unknown as ESTree.Identifier).name
    : null;
}

/** Value names a `typeof` query in `node` depends on (the query roots). */
export function collectTypeofRoots(
  node: ESTree.Node | null | undefined,
): Set<string> {
  const names = new Set<string>();
  if (node === null || node === undefined) return names;
  const isNode = (value: unknown): value is AstNode =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string';
  const visit = (current: AstNode): void => {
    if (current.type === tsType('TSTypeQuery')) {
      const root = typeQueryRoot(
        (current as unknown as { exprName?: AstNode }).exprName,
      );
      if (root !== null) names.add(root);
    }
    for (const key of Object.keys(current)) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const value = (current as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        for (const child of value) if (isNode(child)) visit(child);
      } else if (isNode(value)) {
        visit(value);
      }
    }
  };
  visit(node as AstNode);
  return names;
}

/** Add every identifier bound by a parameter/declarator pattern to `out`. */
function collectPatternNames(
  pattern: AstNode | undefined,
  out: Set<string>,
): void {
  if (pattern === undefined) return;
  if (pattern.type === 'Identifier') {
    out.add((pattern as unknown as ESTree.Identifier).name);
    return;
  }
  if (pattern.type === 'ObjectPattern') {
    for (const prop of (pattern as unknown as ESTree.ObjectPattern)
      .properties) {
      collectPatternNames(
        (prop.type === 'RestElement' ? prop.argument : prop.value) as AstNode,
        out,
      );
    }
    return;
  }
  if (pattern.type === 'ArrayPattern') {
    for (const element of (pattern as unknown as ESTree.ArrayPattern)
      .elements) {
      if (element !== null) collectPatternNames(element as AstNode, out);
    }
    return;
  }
  if (pattern.type === 'AssignmentPattern') {
    collectPatternNames(
      (pattern as unknown as ESTree.AssignmentPattern).left as AstNode,
      out,
    );
    return;
  }
  if (pattern.type === 'RestElement') {
    collectPatternNames(
      (pattern as unknown as ESTree.RestElement).argument as AstNode,
      out,
    );
  }
}

/**
 * Names bound in scopes between the literal and the top-level anchor — `type`/
 * `interface` (type space) and enclosing-function params + block-local
 * `const`/`let`/`var`/`function`/`class` declarations (value space). A hoisted
 * alias can't see any of these, so a literal that references one (directly for a
 * type, or via `typeof` for a value) can't be safely extracted — the caller
 * withholds the fix.
 */
export function blockLocalBindings(
  fn: FunctionNode,
  anchor: ESTree.Node,
): { typeNames: Set<string>; valueNames: Set<string> } {
  const typeNames = new Set<string>();
  const valueNames = new Set<string>();
  let node: Rule.Node | null = fn;
  while (node !== null && node !== anchor) {
    const params = (node as { params?: unknown }).params;
    if (Array.isArray(params)) {
      for (const param of params as AstNode[])
        collectPatternNames(param, valueNames);
    }
    const addDecl = (decl: AstNode): void => {
      if (
        decl.type === tsType('TSTypeAliasDeclaration') ||
        decl.type === tsType('TSInterfaceDeclaration')
      ) {
        const id = (decl as unknown as { id?: ESTree.Node }).id;
        if (id?.type === 'Identifier') typeNames.add(id.name);
        return;
      }
      if (decl.type === 'VariableDeclaration') {
        for (const d of (decl as unknown as ESTree.VariableDeclaration)
          .declarations) {
          collectPatternNames(d.id as AstNode, valueNames);
        }
        return;
      }
      if (
        decl.type === 'FunctionDeclaration' ||
        decl.type === 'ClassDeclaration'
      ) {
        const id = (decl as unknown as { id?: ESTree.Node }).id;
        if (id?.type === 'Identifier') valueNames.add(id.name);
      }
    };
    const body = (node as { body?: unknown }).body;
    if (Array.isArray(body)) {
      for (const statement of body as AstNode[]) {
        addDecl(
          statement.type === 'ExportNamedDeclaration'
            ? ((statement as unknown as { declaration?: AstNode })
                .declaration ?? statement)
            : statement,
        );
      }
    }
    node = parentOf(node);
  }
  return { typeNames, valueNames };
}
