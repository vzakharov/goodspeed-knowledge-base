// Keep this config .mjs, not .ts: cosmiconfig loads a .ts config through a
// transient sidecar in the repo root, which the checks vet.sh runs beside
// steiger race against — ENOENT the moment steiger deletes it.
import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next's App Router requires a root layout, which is app-layer UI wherever
    // it is filed — `no-ui-in-app` has no answer for a framework that mandates one.
    files: ['./apps/web/src/app/ui/**'],
    rules: {
      'fsd/no-ui-in-app': 'off',
    },
  },
]);
