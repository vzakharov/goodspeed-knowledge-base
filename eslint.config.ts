// ESLint configuration philosophy: every rule is listed explicitly — enabled, or
// disabled with a comment explaining why — so nothing is silently inherited, the
// eslint-config-next spreads' rules included. Severity policy and grandfathering:
// .claude/rules/eslint.md.
//
// The rule set is split by plugin family into eslint/rule-groups/*.ts, each group
// listing a severity's rules via `withSeverity` and its rules with options
// explicitly. This file orchestrates the groups: preset spreads, plugin
// registration, the merged rule set, and the scoped overrides.
//
// Formatting is Prettier's alone: eslint-config-prettier disables the rules that
// would fight it, and `pnpm format:check` is the check that enforces it.
//
// This config is TypeScript; ESLint loads it via jiti (a direct devDependency).

import eslintReact from '@eslint-react/eslint-plugin';
import { type Config, defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import boundariesPlugin from 'eslint-plugin-boundaries';
import reactCompiler from 'eslint-plugin-react-compiler';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unicornPlugin from 'eslint-plugin-unicorn';

import { coreRules } from './eslint/rule-groups/core';
import { importSortRules } from './eslint/rule-groups/import-sort';
import { jsxA11yRules } from './eslint/rule-groups/jsx-a11y';
import { nextRules } from './eslint/rule-groups/next';
import { reactRules } from './eslint/rule-groups/react';
import { typescriptRules } from './eslint/rule-groups/typescript';
import { unicornRules } from './eslint/rule-groups/unicorn';
import { vovaRules } from './eslint/rule-groups/vova';
import noDefaultTrue from './eslint/rules/no-default-true';
import noInlineObjectParamType from './eslint/rules/no-inline-object-param-type';
import noRedundantDefaultedParamType from './eslint/rules/no-redundant-defaulted-param-type';
import noRedundantPropertyCopy from './eslint/rules/no-redundant-property-copy';
import noRedundantTypeAlias from './eslint/rules/no-redundant-type-alias';
import noSplitJsxSpreads from './eslint/rules/no-split-jsx-spreads';
import noUncausedRethrow from './eslint/rules/no-uncaused-rethrow';
import preferShorthandSpread from './eslint/rules/prefer-shorthand-spread';

// FSD layers, highest first. Each may import from the layers below it plus
// `shared`, and from its own slice. See .claude/rules/fsd.md.
const FSD_LAYERS = ['pages', 'widgets', 'features', 'entities'];

// A closed list, so any other `index.*.ts` is still reaching into internals.
// See .claude/rules/fsd.md.
const PUBLIC_API = ['index.ts', 'index.server-only.ts', 'index.node-safe.ts'];

// `shared/lib` holds one sub-library per file instead of a segment-wide barrel,
// so a file there is its own public API — there is nothing beside it to hide.
// Entry stays at the top level: `*.ts` does not cross a slash, so anything a
// sub-library grows a directory for is internals again. See .claude/rules/fsd.md.
const SHARED_LIB_ENTRY = {
  type: 'shared',
  captured: { segmentName: 'lib' },
  fileInternalPath: '*.ts',
};

// Steiger (`pnpm lint:fsd`) checks the same directionality and public-API
// discipline at CLI time; boundaries restates them as inline editor feedback,
// which Steiger has no live extension for. Scoped to apps/web/src/ — the
// routing directory `apps/web/app/` sits above every slice, so it imports
// downward by definition.
//
// `boundaries/dependencies` carries all of it, entry points included.
const boundariesConfig: Config = {
  plugins: { boundaries: boundariesPlugin },
  files: ['apps/web/src/**/*.{ts,tsx}'],
  settings: {
    'boundaries/elements': [
      // The app layer is segmented, not sliced — like `shared`, and unlike
      // every layer in FSD_LAYERS.
      {
        type: 'app',
        pattern: ['apps/web/src/app/(*)/**'],
        capture: ['segmentName'],
        partialMatch: false,
      },
      ...FSD_LAYERS.map((layer) => ({
        type: layer,
        pattern: [`apps/web/src/${layer}/(*)/**`],
        capture: ['sliceName'],
        partialMatch: false,
      })),
      {
        type: 'shared',
        pattern: ['apps/web/src/shared/(*)/**'],
        capture: ['segmentName'],
        partialMatch: false,
      },
    ],
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          // The app layer sits above all of them, so it may import any,
          // through their public API.
          {
            from: { element: { type: 'app' } },
            allow: {
              to: {
                element: {
                  types: { anyOf: [...FSD_LAYERS, 'shared'] },
                  fileInternalPath: PUBLIC_API,
                },
              },
            },
          },
          // It is one unit rather than a set of isolated slices, so its
          // segments reach each other directly.
          {
            from: { element: { type: 'app' } },
            allow: { to: { element: { type: 'app' } } },
          },
          // Entering `shared/lib` does not vary by the layer doing it, so one
          // policy grants it to every layer above shared.
          {
            from: { element: { types: { anyOf: ['app', ...FSD_LAYERS] } } },
            allow: { to: { element: SHARED_LIB_ENTRY } },
          },
          ...FSD_LAYERS.flatMap((layer, index) => [
            // Downward, and only through the target's public API.
            {
              from: { element: { type: layer } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [...FSD_LAYERS.slice(index + 1), 'shared'],
                    },
                    fileInternalPath: PUBLIC_API,
                  },
                },
              },
            },
            // Inside its own slice, a file reaches any sibling directly.
            {
              from: { element: { type: layer } },
              allow: {
                to: {
                  element: {
                    type: layer,
                    captured: { sliceName: '{{ from.captured.sliceName }}' },
                  },
                },
              },
            },
          ]),
          // Shared is a layer and a slice at once (FSD's own exception), so its
          // files reach each other directly; its public API is for the layers
          // above.
          {
            from: { element: { type: 'shared' } },
            allow: { to: { element: { type: 'shared' } } },
          },
        ],
      },
    ],
    'boundaries/no-ignored-dependencies': 'error',
    'boundaries/no-unknown-dependencies': 'error',
    'boundaries/no-unknown-files': 'error',
  },
};

// A workspace under packages/, reached through its package name. It resolves
// to its build through the workspace symlink, so to the checker it is a local
// file rather than an external module.
const WORKSPACE_PACKAGE = {
  type: 'workspace-package',
  pattern: ['packages/*/**'],
};

// The API's layout, lighter than the web's. Infrastructure — configuration,
// HTTP plumbing, the database client, auth, the model layer — may be used by
// every feature module. A feature module reaches another only through its
// `index.ts`: the Nest module and the providers it exports. And `ai/` is
// reached only by the modules that call a model, so which ones do is written
// down here rather than discovered.
const API_FEATURES = ['documents', 'ingestion', 'chat', 'usage'];
const API_MODEL_CALLERS = ['ingestion', 'chat', 'usage'];
const API_INFRASTRUCTURE = ['config', 'http', 'database', 'auth'];

const apiBoundariesConfig: Config = {
  plugins: { boundaries: boundariesPlugin },
  files: ['apps/api/src/**/*.ts'],
  ignores: [
    // The files at the root of src/ assemble the app, so like the web's
    // routing directory they import every module by definition.
    'apps/api/src/*.ts',
    // A test reaches across to `test/`'s fakes, which are no module's.
    'apps/api/src/**/*.test.ts',
  ],
  settings: {
    'boundaries/elements': [
      { type: 'api-ai', pattern: ['apps/api/src/ai/**'] },
      ...API_INFRASTRUCTURE.map((name) => ({
        type: 'api-infrastructure',
        pattern: [`apps/api/src/${name}/**`],
      })),
      ...API_FEATURES.map((name) => ({
        type: 'api-feature',
        pattern: [`apps/api/src/(${name})/**`],
        capture: ['featureName'],
      })),
      WORKSPACE_PACKAGE,
    ],
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          {
            from: {
              element: { types: { anyOf: ['api-ai', 'api-infrastructure'] } },
            },
            allow: {
              to: {
                element: {
                  types: {
                    anyOf: [
                      'api-ai',
                      'api-infrastructure',
                      'workspace-package',
                    ],
                  },
                },
              },
            },
          },
          {
            from: { element: { type: 'api-feature' } },
            allow: {
              to: {
                element: {
                  types: { anyOf: ['api-infrastructure', 'workspace-package'] },
                },
              },
            },
          },
          {
            from: {
              element: {
                type: 'api-feature',
                captured: { featureName: API_MODEL_CALLERS },
              },
            },
            allow: {
              to: { element: { type: 'api-ai', fileInternalPath: 'index.ts' } },
            },
          },
          // Within a feature module, a file reaches any sibling directly.
          {
            from: { element: { type: 'api-feature' } },
            allow: {
              to: {
                element: {
                  type: 'api-feature',
                  captured: {
                    featureName: '{{ from.captured.featureName }}',
                  },
                },
              },
            },
          },
          {
            from: { element: { type: 'api-feature' } },
            allow: {
              to: {
                element: { type: 'api-feature', fileInternalPath: 'index.ts' },
              },
            },
          },
        ],
      },
    ],
    'boundaries/no-ignored-dependencies': 'error',
    'boundaries/no-unknown-dependencies': 'error',
    'boundaries/no-unknown-files': 'error',
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The Next app is a workspace, not the repository root, and @next/next's
  // rules look for its `app/` and `pages/` from here.
  { settings: { next: { rootDir: 'apps/web/' } } },

  // --- @eslint-react: supersedes most eslint-plugin-react and react-hooks rules ---
  eslintReact.configs['recommended-type-checked'],
  // Turn off react/* rules that @eslint-react supersedes (avoids duplicate diagnostics):
  eslintReact.configs['disable-conflict-eslint-plugin-react'],
  // Turn off react-hooks/* rules that @eslint-react supersedes:
  eslintReact.configs['disable-conflict-eslint-plugin-react-hooks'],

  // --- React Compiler: flags patterns that break compiler optimization (Next.js 16) ---
  reactCompiler.configs.recommended,

  // --- Unicorn: code quality, filename-case, modern JS patterns ---
  unicornPlugin.configs.recommended,

  // Prettier must follow every preset above, to switch off their formatting rules.
  prettierConfig,
  boundariesConfig,
  apiBoundariesConfig,

  // Project-local ESLint rules (eslint/rules/).
  {
    plugins: {
      vova: {
        rules: {
          'no-default-true': noDefaultTrue,
          'no-inline-object-param-type': noInlineObjectParamType,
          'no-redundant-defaulted-param-type': noRedundantDefaultedParamType,
          'no-redundant-property-copy': noRedundantPropertyCopy,
          'no-redundant-type-alias': noRedundantTypeAlias,
          'no-split-jsx-spreads': noSplitJsxSpreads,
          'no-uncaused-rethrow': noUncausedRethrow,
          'prefer-shorthand-spread': preferShorthandSpread,
        },
      },
    },
  },
  // Import sorting (deterministic, auto-fixable, Prettier-compatible).
  { plugins: { 'simple-import-sort': simpleImportSort } },
  {
    // Restrict to same file types as nextVitals so jsx-a11y/@next/next/@typescript-eslint
    // plugin scopes (declared there with files: ['**/*.{js,...}']) cover this config too.
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    languageOptions: {
      parserOptions: {
        // Type information, which the type-aware rules (no-floating-promises,
        // no-unsafe-*, the vova ones that read types) need.
        projectService: true,
      },
    },
    // The full rule set, merged from the per-plugin groups in eslint/rule-groups/.
    rules: {
      ...coreRules,
      ...typescriptRules,
      ...nextRules,
      ...reactRules,
      ...jsxA11yRules,
      ...unicornRules,
      ...importSortRules,
      ...vovaRules,
    },
  },
  // Custom ESLint rule implementations (eslint/) and the root tooling configs.
  // Relax only the patterns intrinsic to AST-walking rule code; everything else is linted.
  {
    files: ['eslint/**/*.ts', '*.config.{ts,mts,cts,mjs,cjs,js}'],
    rules: {
      // Rule visitors are closures over `context`/`sourceCode`; hoisting them to
      // module scope would mean threading those through every call.
      'unicorn/consistent-function-scoping': 'off',
      // Walking the AST indexes into arrays whose bounds the traversal already
      // guarantees; noUncheckedIndexedAccess makes the assertions unavoidable.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Type-guard predicates are passed by reference to .filter()/.map() so the
      // result is narrowed — inlining them as arrows would drop the narrowing.
      'unicorn/no-array-callback-reference': 'off',
      // @types/estree does not model the TS-only node kinds rule code reads, so
      // narrowing a node to one is an assertion with no type-safe alternative.
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
    },
  },
  // The API is Nest, whose provider definitions spell `useFactory`, `useValue`
  // and `useClass` — object keys @eslint-react reads as hook names, though no
  // React runs anywhere in the workspace.
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      '@eslint-react/no-unnecessary-use-prefix': 'off',
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next, re-stated for `apps/*` because each
    // app builds into its own directory rather than the repository root, plus
    // the Nest build output and Turborepo's cache.
    '**/.next/**',
    '**/out/**',
    'build/**',
    '**/next-env.d.ts',
    '**/dist/**',
    '**/.turbo/**',
    // Generated from the schema by `pnpm db:types`; its shape is the
    // generator's.
    'apps/api/src/database/database.types.ts',
    // Dev artifacts (gitignored, transient — CLAUDE.md § "Key principles"):
    'tmp/**',
  ]),
]);

export default eslintConfig;
