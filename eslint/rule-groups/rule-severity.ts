import type { Linter } from 'eslint';

import { fromEntries } from '../from-entries';

/**
 * Build a `{ [ruleName]: severity }` record from one severity + a flat list of
 * rule names, so a group of rules sharing a severity can be declared as
 * `withSeverity('error', [...])` / `withSeverity('off', [...])` instead of
 * repeating the severity on every line. Severity comes first so it reads as the
 * heading of the group at the call site.
 *
 * Rules that need options, or whose 'off' carries a per-rule rationale worth
 * keeping in the audit trail, stay declared explicitly alongside the spread of
 * this record.
 *
 * Built on the strictly-typed `fromEntries` so the result is
 * `Record<<the listed names>, <severity>>` — names stay a literal union rather
 * than widening to `string`.
 */
export function withSeverity<
  const V extends Linter.RuleSeverity,
  const T extends string,
>(severity: V, names: readonly T[]): Record<T, V> {
  return fromEntries(names.map((name) => [name, severity] as const));
}
