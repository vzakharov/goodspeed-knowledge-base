import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// @typescript-eslint. Rules already provided by eslint-config-next/typescript are
// listed here for transparency and to upgrade warn → error where needed. Rules with
// options stay declared explicitly; everything else is grouped by severity, with each
// rule's rationale (supersession, core-rule replacement, why-off) kept as an inline
// comment.
export const typescriptRules = {
  ...withSeverity('error', [
    // From recommended (already enabled by nextTs spread — listed for transparency):
    '@typescript-eslint/ban-ts-comment',
    '@typescript-eslint/no-array-constructor',
    '@typescript-eslint/no-duplicate-enum-values',
    '@typescript-eslint/no-empty-object-type',
    '@typescript-eslint/no-explicit-any',
    '@typescript-eslint/no-extra-non-null-assertion',
    '@typescript-eslint/no-misused-new',
    '@typescript-eslint/no-namespace',
    '@typescript-eslint/no-non-null-asserted-optional-chain',
    '@typescript-eslint/no-require-imports',
    '@typescript-eslint/no-this-alias',
    '@typescript-eslint/no-unnecessary-type-constraint',
    '@typescript-eslint/no-unsafe-declaration-merging',
    '@typescript-eslint/no-unsafe-function-type',
    '@typescript-eslint/no-wrapper-object-types',
    '@typescript-eslint/prefer-as-const',
    '@typescript-eslint/triple-slash-reference',
    '@typescript-eslint/no-unused-expressions', // was 'warn' in spread — override to error
    '@typescript-eslint/prefer-namespace-keyword',
    '@typescript-eslint/prefer-ts-expect-error', // prefer ts-expect-error: self-documenting, whereas ts-ignore silently stays stale

    // Replace the corresponding core rule (core copy is turned 'off' in core.ts):
    '@typescript-eslint/default-param-last', // replaces core default-param-last
    '@typescript-eslint/no-empty-function', // replaces core no-empty-function
    '@typescript-eslint/no-implied-eval', // replaces core no-implied-eval
    '@typescript-eslint/no-loop-func', // replaces core no-loop-func
    '@typescript-eslint/no-loss-of-precision', // replaces core no-loss-of-precision
    '@typescript-eslint/no-unused-private-class-members', // replaces core no-unused-private-class-members
    '@typescript-eslint/no-useless-constructor', // replaces core no-useless-constructor
    '@typescript-eslint/only-throw-error', // replaces core no-throw-literal
    '@typescript-eslint/prefer-promise-reject-errors', // replaces core prefer-promise-reject-errors
    '@typescript-eslint/require-await', // replaces core require-await

    // Correctness (no type-checking required):
    '@typescript-eslint/no-array-delete',
    '@typescript-eslint/no-confusing-non-null-assertion',
    '@typescript-eslint/no-dupe-class-members',
    '@typescript-eslint/no-invalid-this',
    '@typescript-eslint/no-mixed-enums',
    '@typescript-eslint/no-non-null-asserted-nullish-coalescing',
    '@typescript-eslint/no-shadow',
    '@typescript-eslint/no-useless-empty-export',
    '@typescript-eslint/related-getter-setter-pairs',

    // Code quality / style (no type-checking required):
    '@typescript-eslint/adjacent-overload-signatures',
    '@typescript-eslint/ban-tslint-comment',
    '@typescript-eslint/no-confusing-void-expression',
    '@typescript-eslint/no-import-type-side-effects',
    '@typescript-eslint/no-inferrable-types',
    '@typescript-eslint/no-meaningless-void-operator',
    '@typescript-eslint/no-non-null-assertion',
    '@typescript-eslint/no-unnecessary-template-expression',
    '@typescript-eslint/no-useless-default-assignment',
    '@typescript-eslint/non-nullable-type-assertion-style',
    '@typescript-eslint/prefer-find',
    '@typescript-eslint/prefer-for-of',
    '@typescript-eslint/prefer-function-type',
    '@typescript-eslint/prefer-includes',
    '@typescript-eslint/prefer-string-starts-ends-with',
    '@typescript-eslint/unified-signatures',

    // Correctness (require type information — enabled via projectService: true):
    '@typescript-eslint/await-thenable',
    '@typescript-eslint/no-for-in-array',
    '@typescript-eslint/no-misused-promises',
    '@typescript-eslint/no-misused-spread',
    '@typescript-eslint/no-unsafe-argument',
    '@typescript-eslint/no-unsafe-assignment',
    '@typescript-eslint/no-unsafe-call',
    '@typescript-eslint/no-unsafe-enum-comparison',
    '@typescript-eslint/no-unsafe-member-access',
    '@typescript-eslint/no-unsafe-return',
    '@typescript-eslint/no-unsafe-type-assertion',
    '@typescript-eslint/no-unsafe-unary-minus',
    '@typescript-eslint/prefer-nullish-coalescing',
    '@typescript-eslint/prefer-optional-chain',
    '@typescript-eslint/switch-exhaustiveness-check',
    '@typescript-eslint/unbound-method',
    '@typescript-eslint/use-unknown-in-catch-callback-variable',

    // Code quality (require type information — enabled via projectService: true):
    '@typescript-eslint/no-base-to-string',
    '@typescript-eslint/no-redundant-type-constituents',
    '@typescript-eslint/no-unnecessary-boolean-literal-compare',
    '@typescript-eslint/no-unnecessary-qualifier',
    '@typescript-eslint/no-unnecessary-type-arguments',
    '@typescript-eslint/no-unnecessary-type-assertion',
    '@typescript-eslint/no-unnecessary-type-conversion',
    '@typescript-eslint/no-unnecessary-type-parameters',
    '@typescript-eslint/prefer-readonly',
    '@typescript-eslint/prefer-regexp-exec',
    '@typescript-eslint/prefer-return-this-type',
    '@typescript-eslint/promise-function-async',
    '@typescript-eslint/require-array-sort-compare',
    '@typescript-eslint/restrict-plus-operands',
    '@typescript-eslint/restrict-template-expressions',
    '@typescript-eslint/return-await',
    '@typescript-eslint/strict-boolean-expressions',
    '@typescript-eslint/strict-void-return',
  ]),

  // Options:
  '@typescript-eslint/no-floating-promises': [
    'error',
    {
      // `node:test` awaits the promise its own `describe`/`it` return; a caller
      // that handled it would be racing the runner.
      allowForKnownSafeCalls: [
        { from: 'package', package: 'node:test', name: ['describe', 'it'] },
      ],
    },
  ],
  '@typescript-eslint/no-use-before-define': [
    'error',
    { functions: false, classes: true, variables: true },
  ],
  // Replaces the core rule (core copy is turned 'off' in core.ts). Off because
  // nothing is banned by specifier; a ban arrives as this rule's `paths` list.
  '@typescript-eslint/no-restricted-imports': 'off',
  '@typescript-eslint/array-type': ['error', { default: 'array-simple' }],
  '@typescript-eslint/class-literal-property-style': ['error', 'fields'],
  '@typescript-eslint/consistent-generic-constructors': [
    'error',
    'constructor',
  ],
  '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
  '@typescript-eslint/consistent-type-assertions': [
    'error',
    { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
  ],
  // `type` over `interface`: interfaces allow unintentional declaration merging,
  // and the type-overlap gate scans type aliases only — the ban is what makes
  // that scope cover every named object shape rather than a subset.
  // See scripts/type-overlap-check.README.md.
  '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
  '@typescript-eslint/consistent-type-exports': [
    'error',
    { fixMixedExportsWithInlineTypeSpecifier: true },
  ],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
  ],
  '@typescript-eslint/method-signature-style': ['error', 'property'], // property style is more precise — method style allows bivariant params
  '@typescript-eslint/no-unnecessary-condition': [
    'error',
    {
      allowConstantLoopConditions: true,
    },
  ],

  ...withSeverity('off', [
    // Superseded by tsconfig or another rule:
    '@typescript-eslint/no-unused-vars', // superseded by noUnusedLocals and noUnusedParameters in tsconfig.json
    '@typescript-eslint/consistent-return', // superseded by noImplicitReturns in tsconfig.json
    '@typescript-eslint/dot-notation', // not compatible with noPropertyAccessFromIndexSignature in tsconfig.json
    '@typescript-eslint/no-redeclare', // "it is not recommended to turn on this rule in new TypeScript projects"

    // Wrong for this project:
    '@typescript-eslint/class-methods-use-this', // no classes in this codebase
    '@typescript-eslint/explicit-function-return-type', // inference is the point of TypeScript; enforcing explicit returns on every function is noise
    '@typescript-eslint/explicit-member-accessibility', // no classes in this codebase
    '@typescript-eslint/explicit-module-boundary-types', // inferred return types on exports are fine in a well-typed codebase
    '@typescript-eslint/init-declarations', // too strict — lazy init and conditional assignment are valid patterns
    '@typescript-eslint/max-params', // use parameter objects by convention, not enforcement
    '@typescript-eslint/member-ordering', // enforcing member order across components and helper modules adds friction without benefit
    '@typescript-eslint/naming-convention', // TypeScript naming is already conventional; the rule is noisy against library prop shapes
    '@typescript-eslint/no-dynamic-delete', // computed delete is occasionally the clearest way to normalize a record
    '@typescript-eslint/no-empty-interface', // superseded by no-empty-object-type (already enabled)
    '@typescript-eslint/no-extraneous-class', // no classes to constrain; the rule has nothing to act on
    '@typescript-eslint/no-invalid-void-type', // void in callback return positions is idiomatic TypeScript
    '@typescript-eslint/no-magic-numbers', // impractical in layout and animation code; would require a named constant per spacing value
    '@typescript-eslint/no-type-alias', // deprecated; superseded by consistent-type-definitions
    '@typescript-eslint/no-var-requires', // superseded by no-require-imports (already enabled)
    '@typescript-eslint/parameter-properties', // no classes in this codebase
    '@typescript-eslint/prefer-destructuring', // style preference, not a correctness issue
    '@typescript-eslint/prefer-enum-initializers', // enums not used; project prefers union types
    '@typescript-eslint/prefer-literal-enum-member', // enums not used
    '@typescript-eslint/prefer-readonly-parameter-types', // too aggressive for React props and callback patterns
    '@typescript-eslint/prefer-reduce-type-parameter', // minor style; does not improve correctness
    '@typescript-eslint/sort-type-constituents', // purely cosmetic
    '@typescript-eslint/typedef', // redundant with strict TypeScript; forces explicit types where inference is cleaner
  ]),
} satisfies Linter.RulesRecord;
