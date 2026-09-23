import type { Linter } from 'eslint';

import { fromEntries } from '../from-entries';

/**
 * `{ [name]: severity }` for a group of rules sharing one severity. The keys stay
 * a literal union (see `fromEntries`), so a mistyped rule name is a type error.
 */
export function withSeverity<
  const V extends Linter.RuleSeverity,
  const T extends string,
>(severity: V, names: readonly T[]): Record<T, V> {
  return fromEntries(names.map((name) => [name, severity] as const));
}
