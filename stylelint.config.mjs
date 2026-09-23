/** @type {import('stylelint').Config} */
const config = {
  extends: ['stylelint-config-standard-scss'],
  // Build output (each app builds into its own directory, hence the leading
  // `**`) and `tmp/`, where dev artifacts and vet's logs go — nothing authored.
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
