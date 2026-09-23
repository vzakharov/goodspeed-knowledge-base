import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// @next/next — all 21 rules listed explicitly as error. eslint-config-next/core-web-vitals
// already enables most; we make them all visible and upgrade any remaining warns.
export const nextRules = {
  ...withSeverity('error', [
    // Already error in eslint-config-next (listed for transparency):
    '@next/next/inline-script-id',
    '@next/next/no-assign-module-variable',
    '@next/next/no-document-import-in-page',
    '@next/next/no-duplicate-head',
    '@next/next/no-head-import-in-document',
    '@next/next/no-html-link-for-pages', // upgraded to error by core-web-vitals
    '@next/next/no-script-component-in-head',
    '@next/next/no-sync-scripts', // upgraded to error by core-web-vitals

    // Upgraded from warn to error:
    '@next/next/next-script-for-ga',
    '@next/next/no-async-client-component',
    '@next/next/no-before-interactive-script-outside-document',
    '@next/next/no-css-tags',
    '@next/next/no-head-element',
    '@next/next/no-img-element',
    '@next/next/no-page-custom-font',
    '@next/next/no-styled-jsx-in-document',
    '@next/next/no-title-in-document-head',
    '@next/next/no-typos',
    '@next/next/no-unwanted-polyfillio',

    // Not in eslint-config-next recommended — newly added:
    '@next/next/google-font-display',
    '@next/next/google-font-preconnect',
  ]),
} satisfies Linter.RulesRecord;
