import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// @eslint-react (recommended-type-checked preset is spread in the orchestrator) plus the
// eslint-plugin-react rules @eslint-react does NOT supersede. The preset defaults many
// rules to warn; we upgrade them to error. Rules with options stay explicit; the rest are
// grouped by severity with per-rule rationale inline.
export const reactRules = {
  ...withSeverity('error', [
    // --- @eslint-react: upgraded from warn → error (preset defaults them to warn) ---
    '@eslint-react/exhaustive-deps',
    '@eslint-react/jsx-no-key-after-spread',
    '@eslint-react/jsx-no-comment-textnodes',
    '@eslint-react/no-children-count',
    '@eslint-react/no-children-for-each',
    '@eslint-react/no-children-map',
    '@eslint-react/no-children-only',
    '@eslint-react/no-children-to-array',
    '@eslint-react/no-clone-element',
    '@eslint-react/no-set-state-in-component-did-mount',
    '@eslint-react/no-set-state-in-component-did-update',
    '@eslint-react/no-set-state-in-component-will-update',
    '@eslint-react/no-unnecessary-use-prefix',
    '@eslint-react/no-unsafe-component-will-mount',
    '@eslint-react/no-unsafe-component-will-receive-props',
    '@eslint-react/no-unsafe-component-will-update',
    '@eslint-react/no-unused-class-component-members',
    '@eslint-react/purity',
    '@eslint-react/set-state-in-effect',
    '@eslint-react/use-state',
    '@eslint-react/dom-no-dangerously-set-innerhtml',
    '@eslint-react/dom-no-script-url',
    '@eslint-react/dom-no-unsafe-iframe-sandbox',
    '@eslint-react/web-api-no-leaked-event-listener',
    '@eslint-react/web-api-no-leaked-fetch',
    '@eslint-react/web-api-no-leaked-intersection-observer',
    '@eslint-react/web-api-no-leaked-interval',
    '@eslint-react/web-api-no-leaked-resize-observer',
    '@eslint-react/web-api-no-leaked-timeout',
    '@eslint-react/naming-convention-context-name',
    '@eslint-react/naming-convention-id-name',
    '@eslint-react/naming-convention-ref-name',
    // @eslint-react upgrades with React 19-specific rationale:
    '@eslint-react/no-context-provider', // was warn in preset — React 19 removes Provider wrapper
    '@eslint-react/no-forward-ref', // was warn in preset — React 19 passes ref as prop
    '@eslint-react/no-use-context', // was warn in preset — React 19 use() API preferred
    // Enabling rules that are off in the preset:
    '@eslint-react/dom-no-string-style-prop',
    '@eslint-react/dom-no-unknown-property',

    // --- eslint-plugin-react (rules NOT superseded by @eslint-react) ---
    'react/checked-requires-onchange-or-readonly',
    'react/jsx-no-duplicate-props',
    'react/no-invalid-html-attribute',
    'react/no-unescaped-entities',
    'react/style-prop-object',
    'react/self-closing-comp',
  ]),

  // eslint-plugin-react with options:
  'react/jsx-boolean-value': ['error', 'never'], // omit ={true}; JSX presence implies true
  'react/jsx-curly-brace-presence': [
    'error',
    { props: 'never', children: 'never' },
  ],

  ...withSeverity('off', [
    '@eslint-react/no-array-index-key', // the CV renders fixed, statically-authored lists from the message catalogs — the index is stable
    'react/jsx-no-bind', // inline handlers are idiomatic in React 19; blanket ban adds ceremony
    'react/no-multi-comp', // co-locating a small helper component with its only consumer beats a file per component
    'react/prefer-stateless-function', // class components don't exist; rule is irrelevant
  ]),
} satisfies Linter.RulesRecord;
