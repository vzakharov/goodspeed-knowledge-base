import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// Core ESLint rules not covered by eslint-config-next or TypeScript.
export const coreRules = {
  ...withSeverity('error', [
    // Security
    'no-debugger',
    'no-eval',
    'no-new-func',
    'no-script-url',
    'no-console', // the API logs through Nest's `Logger`, which carries level and context; the static export has nowhere to log

    // Correctness
    'array-callback-return',
    'default-case',
    'default-case-last',
    'eqeqeq',
    'for-direction',
    'getter-return',
    'grouped-accessor-pairs',
    'no-async-promise-executor',
    'no-await-in-loop',
    'no-case-declarations',
    'no-compare-neg-zero',
    'no-cond-assign',
    'no-constant-binary-expression',
    'no-constant-condition',
    'no-constructor-return',
    'no-control-regex',
    'no-delete-var',
    'no-duplicate-case',
    'no-duplicate-imports',
    'no-empty',
    'no-empty-character-class',
    'no-empty-pattern',
    'no-empty-static-block',
    'no-ex-assign',
    'no-extend-native',
    'no-extra-bind',
    'no-fallthrough',
    'no-global-assign',
    'no-implicit-coercion',
    'no-invalid-regexp',
    'no-irregular-whitespace',
    'no-iterator',
    'no-labels',
    'no-lone-blocks',
    'no-misleading-character-class',
    'no-multi-str',
    'no-new-native-nonconstructor',
    'no-nonoctal-decimal-escape',
    'no-obj-calls',
    'no-octal',
    'no-octal-escape',
    'no-promise-executor-return',
    'no-proto',
    'no-prototype-builtins',
    'no-regex-spaces',
    'no-return-assign',
    'no-self-assign',
    'no-self-compare',
    'no-sequences',
    'no-setter-return',
    'no-shadow-restricted-names',
    'no-sparse-arrays',
    'no-template-curly-in-string',
    'no-this-before-super',
    'no-unexpected-multiline',
    'no-unmodified-loop-condition',
    'no-unreachable',
    'no-unreachable-loop',
    'no-unsafe-finally',
    'no-unsafe-negation',
    'no-unsafe-optional-chaining',
    'no-unused-labels',
    'no-useless-backreference',
    'no-useless-catch',
    'no-useless-escape',
    'no-with',
    'require-atomic-updates',
    'require-yield',
    'use-isnan',
    'valid-typeof',

    // Code quality
    'accessor-pairs',
    'block-scoped-var',
    'guard-for-in',
    'no-caller',
    'no-else-return',
    'no-eq-null',
    'no-extra-label',
    'no-implicit-globals',
    'no-inner-declarations',
    'no-label-var',
    'no-multi-assign',
    'no-new',
    'no-new-object',
    'no-new-wrappers',
    'no-object-constructor',
    'no-undef-init',
    'no-unneeded-ternary',
    'no-useless-call',
    'no-useless-computed-key',
    'no-useless-concat',
    'no-useless-rename',
    'no-useless-return',
    'no-void',
    'object-shorthand',
    'operator-assignment',
    'prefer-arrow-callback',
    'prefer-exponentiation-operator',
    'prefer-numeric-literals',
    'prefer-object-has-own',
    'prefer-object-spread',
    'prefer-regex-literals',
    'prefer-template',
    'radix',
    'symbol-description',
    'yoda',
  ]),

  // Code quality with options
  'func-style': ['error', 'declaration', { allowArrowFunctions: true }], // prefer named declarations; arrows still allowed inline

  ...withSeverity('off', [
    // Superseded by @typescript-eslint equivalents (or another plugin / tsconfig):
    'no-implied-eval', // superseded by @typescript-eslint/no-implied-eval
    'consistent-return', // superseded by noImplicitReturns in tsconfig.json
    'default-param-last', // superseded by @typescript-eslint/default-param-last
    'dot-notation', // superseded by @typescript-eslint/dot-notation
    'no-empty-function', // superseded by @typescript-eslint/no-empty-function
    'no-extra-boolean-cast', // conflicts with @typescript-eslint/strict-boolean-expressions
    'no-loop-func', // superseded by @typescript-eslint/no-loop-func
    'no-loss-of-precision', // superseded by @typescript-eslint/no-loss-of-precision
    'no-restricted-imports', // superseded by @typescript-eslint/no-restricted-imports
    'no-throw-literal', // superseded by @typescript-eslint/only-throw-error
    'no-unused-private-class-members', // superseded by @typescript-eslint/no-unused-private-class-members
    'require-await', // superseded by @typescript-eslint/require-await
    'no-lonely-if', // superseded by unicorn/no-lonely-if
    'no-useless-constructor', // superseded by @typescript-eslint/no-useless-constructor
    'prefer-promise-reject-errors', // superseded by @typescript-eslint/prefer-promise-reject-errors

    // False positive or superseded by TypeScript:
    'new-cap', // false positive on JSX components (e.g. <ThemeProvider>)
    'no-undef', // superseded by TypeScript — tsc catches undefined references at compile time
    'no-unused-vars', // superseded by noUnusedLocals and noUnusedParameters in tsconfig.json
  ]),
} satisfies Linter.RulesRecord;
