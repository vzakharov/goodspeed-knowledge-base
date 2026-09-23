import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// eslint-plugin-jsx-a11y — all 39 rules enabled as error. eslint-config-next enables only
// 6 at warn; we upgrade and add the rest. Rules with options or a deprecation note stay
// explicit.
export const jsxA11yRules = {
  ...withSeverity('error', [
    // Upgraded from warn (eslint-config-next default) to error:
    'jsx-a11y/alt-text',
    'jsx-a11y/aria-props',
    'jsx-a11y/aria-proptypes',
    'jsx-a11y/aria-unsupported-elements',
    'jsx-a11y/role-has-required-aria-props',
    'jsx-a11y/role-supports-aria-props',

    // From recommended (not in eslint-config-next's partial list):
    'jsx-a11y/anchor-has-content',
    'jsx-a11y/anchor-is-valid',
    'jsx-a11y/aria-activedescendant-has-tabindex',
    'jsx-a11y/autocomplete-valid',
    'jsx-a11y/click-events-have-key-events',
    'jsx-a11y/heading-has-content',
    'jsx-a11y/html-has-lang',
    'jsx-a11y/iframe-has-title',
    'jsx-a11y/img-redundant-alt',
    'jsx-a11y/interactive-supports-focus',
    'jsx-a11y/label-has-associated-control',
    'jsx-a11y/media-has-caption',
    'jsx-a11y/mouse-events-have-key-events',
    'jsx-a11y/no-access-key',
    'jsx-a11y/no-autofocus',
    'jsx-a11y/no-distracting-elements',
    'jsx-a11y/no-interactive-element-to-noninteractive-role',
    'jsx-a11y/no-noninteractive-element-interactions',
    'jsx-a11y/no-noninteractive-element-to-interactive-role',
    'jsx-a11y/no-noninteractive-tabindex',
    'jsx-a11y/no-redundant-roles',
    'jsx-a11y/no-static-element-interactions',
    'jsx-a11y/scope',
    'jsx-a11y/tabindex-no-positive',

    // Were off in jsx-a11y recommended — enabled per project philosophy:
    'jsx-a11y/anchor-ambiguous-text',
    'jsx-a11y/control-has-associated-label',
    'jsx-a11y/no-aria-hidden-on-focusable',
    'jsx-a11y/prefer-tag-over-role',

    // Deprecated by the plugin but still present — enable and disable with a reason if
    // they ever cause problems:
    'jsx-a11y/accessible-emoji',
    'jsx-a11y/label-has-for',
    'jsx-a11y/no-onchange',
  ]),

  'jsx-a11y/aria-role': ['error', { ignoreNonDOM: true }],
} satisfies Linter.RulesRecord;
