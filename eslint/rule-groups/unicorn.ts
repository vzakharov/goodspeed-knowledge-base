import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// eslint-plugin-unicorn — the recommended preset is spread in the orchestrator. Here we
// enable non-recommended rules and disable the recommended/non-recommended ones that fight
// this project's conventions. Rules with options stay explicit; the rest are grouped by
// severity with per-rule rationale inline.
export const unicornRules = {
  ...withSeverity('error', [
    // Non-recommended rules — enabled:
    'unicorn/better-regex',
    'unicorn/consistent-destructuring',
    'unicorn/custom-error-definition',
    'unicorn/no-unused-properties',
    'unicorn/prefer-import-meta-properties',
    'unicorn/require-post-message-target-origin',
  ]),

  // Passing an undefined to a function is idiomatic when we use
  // `someArg: SomeType | undefined` instead of `someArg?: SomeType`.
  'unicorn/no-useless-undefined': ['error', { checkArguments: false }],

  ...withSeverity('off', [
    // Non-recommended rules — disabled:
    'unicorn/no-keyword-prefix', // to allow `classNames` etc.
    'unicorn/prefer-json-parse-buffer', // niche Node.js file reading optimization, not relevant for app code
    // Recommended rules — disabled:
    'unicorn/no-await-expression-member', // `(await import(…)).default` is the idiomatic dynamic-import form
    'unicorn/prevent-abbreviations', // would rename props, ref, e, err, fn — fights React/TS conventions
    'unicorn/no-null', // React components return null to render nothing
  ]),
} satisfies Linter.RulesRecord;
