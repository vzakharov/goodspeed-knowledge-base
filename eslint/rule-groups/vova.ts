import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// vova (project-local rules, implemented under eslint/rules/). The trailing comment on
// each documents what the custom rule enforces and why.
export const vovaRules = {
  ...withSeverity('error', [
    'vova/no-default-true', // boolean params must default off — invert (enabled=true → disabled=false) instead of defaulting true
    'vova/no-inline-object-param-type', // inline object type literals in function params must be extracted to a named type alias
    'vova/no-redundant-defaulted-param-type', // drop a named type annotation on a fully-defaulted destructured param when types prove it redundant (type-aware; inline literals stay with no-inline-object-param-type)
    'vova/no-redundant-property-copy', // prefer destructuring over key: source.key
    'vova/no-redundant-type-alias', // `type A = B` that just renames another named type is a leftover — use B directly and delete the alias
    'vova/no-split-jsx-spreads', // multiple {...{ prop }} spreads on one element belong in one — merged when no attribute between them invokes anything
    'vova/no-uncaused-rethrow', // `throw new X(…)` in a catch block must carry the caught error as `{ cause }` (type-aware: a non-Error cause carries no stack)
    'vova/prefer-shorthand-spread', // enforce {...{ prop }} over prop={prop}
  ]),
} satisfies Linter.RulesRecord;
