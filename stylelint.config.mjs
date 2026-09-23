/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard-scss'],
  // Build output and the scratch tree. Each app builds into its own directory,
  // hence the leading `**`; `tmp/` is where every dev artifact goes (CLAUDE.md),
  // including vet's own logs — nothing authored, nothing to lint.
  ignoreFiles: [
    '**/.next/**',
    '**/out/**',
    '**/dist/**',
    '**/node_modules/**',
    'tmp/**',
  ],
  rules: {
    // Mantine ships as `@layer mantine`, so every unlayered rule in this tree
    // already outranks it whatever the specificity. An `!important` here can
    // only be fighting another rule of ours.
    'declaration-no-important': true,
    // CSS-module class and keyframe names are camelCase here, which the
    // standard config's kebab-case patterns reject.
    'selector-class-pattern': null,
    'keyframes-name-pattern': null,
    // CSS-modules syntax the standard config does not know about.
    'selector-pseudo-class-no-unknown': [
      true,
      { ignorePseudoClasses: ['global', 'local'] },
    ],
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
  },
};

export default config;
