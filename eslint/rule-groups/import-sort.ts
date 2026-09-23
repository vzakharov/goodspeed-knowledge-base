import type { Linter } from 'eslint';

import { withSeverity } from './rule-severity';

// simple-import-sort — deterministic, auto-fixable, Prettier-compatible import and
// export ordering.
export const importSortRules = {
  ...withSeverity('error', ['simple-import-sort/exports']),

  // Import ordering, bottom-up by dependency direction: side-effects → external →
  // the FSD layers in the order an import may point (`shared` upward to `app`,
  // see .claude/rules/fsd.md) → relative.
  'simple-import-sort/imports': [
    'error',
    {
      groups: [
        // Side-effect imports (CSS, polyfills)
        [String.raw`^\u0000`],
        // External packages
        ['^'],
        // FSD layers, lowest first
        ['^@/shared/'],
        ['^@/entities/'],
        ['^@/features/'],
        ['^@/widgets/'],
        ['^@/pages/'],
        ['^@/app/'],
        // Relative imports
        [String.raw`^\.`],
      ],
    },
  ],
} satisfies Linter.RulesRecord;
