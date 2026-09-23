import type * as ESTree from 'estree';

import type { AstNode } from './estree-mixins';

/** Visits every `.type`-bearing node under `root`, in no particular order. */
export function walkAst(
  root: ESTree.Node,
  visit: (node: AstNode) => void,
): void {
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
