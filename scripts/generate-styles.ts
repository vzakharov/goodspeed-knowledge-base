#!/usr/bin/env node

/**
 * Generates the Sass partials under `apps/web/styles/` whose contents are fixed by a
 * TypeScript declaration. Run it after editing either source:
 *
 *   pnpm styles:codegen
 *
 * There is no check-only mode: it **exits non-zero when it had to write**, so
 * one run both repairs the drift and reports it. That is what lets the vet run
 * fail on a stale partial while still leaving it fixed — `git diff` is the
 * report, and a second run is green.
 *
 * Both partials exist because Sass and TypeScript each need the same names and
 * numbers and neither can read the other's declaration: Mantine resolves
 * responsive props (`cols={{ base: 1, md: 2 }}`) from `theme.breakpoints` and
 * `cssColor()` types the `--color-*` names, while Sass needs the breakpoints as
 * literals — a media-query condition cannot read a custom property — and is
 * what declares the tokens in the first place. TypeScript is the source in both
 * cases because it is the side a type can constrain.
 *
 * Bare Node runs this file, relying on its type stripping, so the imports of
 * the sources carry their `.ts` extension.
 */

/* eslint-disable no-console -- stderr is how this script reports drift: which
   partial it rewrote, and the summary the vet run's non-zero exit refers to.
   The rule stays `error` in the app, where a stray log ships to a user. */

import fs from 'node:fs';
import path from 'node:path';

import { breakpoints } from '../apps/web/src/app/styles/breakpoints.ts';
import { CSS_COLORS } from '../apps/web/src/shared/ui/css-color.ts';

const REPO_ROOT = path.join(import.meta.dirname, '..');

function scale(): string {
  return Object.entries(breakpoints)
    .map(([name, value]) => `$breakpoint-${name}: ${value};`)
    .join('\n');
}

// One parameter per line: the four-token signature is past Prettier's print
// width on one, and a generated file has to come out already formatted or
// `pnpm format:check` fails on it.
function colorMixin(): string {
  const parameters = CSS_COLORS.map((name) => `  $${name}`).join(',\n');
  const declarations = CSS_COLORS.map(
    (name) => `  --color-${name}: #{$${name}};`,
  ).join('\n');

  return `@mixin colors(\n${parameters}\n) {\n${declarations}\n}`;
}

const PARTIALS = [
  {
    source: 'apps/web/src/app/styles/breakpoints.ts',
    output: 'apps/web/styles/_breakpoints.scss',
    body: scale(),
  },
  {
    source: 'apps/web/src/shared/ui/css-color.ts',
    output: 'apps/web/styles/_tokens.scss',
    body: colorMixin(),
  },
];

// Shape derived from the list rather than declared: the three members are the
// list's own, and a named record here collides with unrelated `body`/`source`
// declarations under `pnpm type-overlap` for no shared concept.
function render({ source, body }: (typeof PARTIALS)[number]): string {
  return `// Generated from ${source}
// by \`pnpm styles:codegen\`. Edit the source, not here — the vet run
// regenerates this file and fails when it had to.

${body}
`;
}

let rewrote = false;

for (const partial of PARTIALS) {
  const outputPath = path.join(REPO_ROOT, partial.output);
  const expected = render(partial);

  const found = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, 'utf8')
    : '';

  // Left alone when it already matches, so a run that finds nothing stale
  // writes nothing at all and no reader of these files can catch one truncated.
  if (found === expected) continue;

  fs.writeFileSync(outputPath, expected);
  console.error(`regenerated ${partial.output} from ${partial.source}`);
  rewrote = true;
}

if (rewrote) {
  console.error('A generated partial was stale and has been rewritten.');
  process.exit(1);
}
