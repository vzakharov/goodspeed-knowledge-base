#!/usr/bin/env node

/**
 * Holds the per-component Mantine stylesheet imports in
 * `apps/web/src/app/ui/theme-provider.tsx` to what the sites actually render:
 *
 *   pnpm check:mantine-styles
 *
 * Why that list needs holding, order included, is `.claude/rules/styling.md`
 * § Styling; this is the half that measures it, in three directions — a class
 * rendered with no rule behind it, a sheet whose classes nothing renders, and
 * sheets loaded out of the order Mantine's own aggregate composes them in.
 *
 * All three read the **built HTML and CSS** rather than the import list, which
 * is what covers the classes Mantine composes in: `Button` renders
 * `UnstyledButton`'s, and no import in the tree names it. That is also the
 * limit — a component rendered only after an interaction never reaches a static
 * export, so one that grows that shape needs its sheet confirmed by eye.
 *
 * Bare Node runs this file, relying on its type stripping: it reads the build
 * output and `node_modules`, and imports nothing from the app.
 */

/* eslint-disable no-console -- stdout is this script's interface: which sheet
   is missing, unused or out of order is the whole report the non-zero exit
   refers to. The rule stays `error` in the app, where a stray log ships to a
   user. */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.join(import.meta.dirname, '..');
// The web app's own copy: under pnpm a dependency is installed beside the
// workspace that declares it, not at the root.
const MANTINE_CORE = path.join(
  REPO_ROOT,
  'apps/web/node_modules/@mantine/core',
);

/** One stylesheet per component, which is what `theme-provider.tsx` imports. */
const MANTINE_STYLES = path.join(MANTINE_CORE, 'styles');

/** All of them in one file, in the order Mantine composes them. */
const MANTINE_AGGREGATE = path.join(MANTINE_CORE, 'styles.layer.css');

/** Mantine's own class names, hashed at publish time and unique to it. */
const MANTINE_CLASS = /m_[\da-f]{7,8}/g;

/** The same names as CSS selectors, so the hash shape is stated once. */
const MANTINE_SELECTOR = new RegExp(String.raw`\.${MANTINE_CLASS.source}`, 'g');

/** The layered half of each stylesheet — the half `theme-provider.tsx` imports. */
const SHEET_SUFFIX = '.layer.css';

const importLine = (sheet: string) =>
  `  import '@mantine/core/styles/${sheet}${SHEET_SUFFIX}';`;

/**
 * The three files that carry no component of their own — the reset, the
 * element defaults and the `--mantine-*` block. Nothing renders a class from
 * them, so the unused half below would report them every run.
 */
const CORE_SHEETS = new Set(['baseline', 'default-css-variables', 'global']);

function walk(dir: string, extension: string): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) return walk(full, extension);

    return entry.name.endsWith(extension) ? [full] : [];
  });
}

function classesIn(files: string[], pattern: RegExp): Set<string> {
  return new Set(
    files.flatMap((file) => [
      ...(fs.readFileSync(file, 'utf8').match(pattern) ?? []),
    ]),
  );
}

/** Which of Mantine's stylesheets declares each class it ships. */
function sheetsByClass(): Map<string, string> {
  const byClass = new Map<string, string>();

  for (const file of fs.readdirSync(MANTINE_STYLES)) {
    if (!file.endsWith(SHEET_SUFFIX)) continue;

    const sheet = file.slice(0, -SHEET_SUFFIX.length);
    const declared =
      fs
        .readFileSync(path.join(MANTINE_STYLES, file), 'utf8')
        .match(MANTINE_SELECTOR) ?? [];

    for (const selector of declared) byClass.set(selector.slice(1), sheet);
  }

  return byClass;
}

function outDirs(): string[] {
  const apps = path.join(REPO_ROOT, 'apps');

  return fs
    .readdirSync(apps, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(apps, entry.name, 'out'))
    .filter((dir) => fs.existsSync(dir));
}

const built = outDirs();

if (built.length === 0) {
  console.error(
    'No built site found under apps/*/out — run `pnpm build` first.\n' +
      'This check reads the rendered HTML, so it has nothing to say without it.',
  );
  process.exit(1);
}

// Each site's HTML is answered by its own CSS. Pooling the two would let one
// site's stylesheet cover the other's markup — which, with a single shared
// import list, differs from the truth only when one `out/` is staler than the
// other, and that is exactly the case worth catching.
const sites = built.map((dir) => ({
  name: path.basename(path.dirname(dir)),
  rendered: classesIn(walk(dir, '.html'), MANTINE_CLASS),
  styled: classesIn(walk(dir, '.css'), MANTINE_CLASS),
}));

const owner = sheetsByClass();

/**
 * Each sheet's place in Mantine's aggregate, as a dense rank. Ordering by where
 * a sheet's first rule lands there is what makes a base sheet sort before every
 * composite that renders its class.
 */
function canonicalRanks(): Map<string, number> {
  const aggregate = fs.readFileSync(MANTINE_AGGREGATE, 'utf8');
  const firstRule = new Map<string, number>();

  for (const [className, sheet] of owner) {
    const at = aggregate.indexOf(`.${className}`);

    if (at === -1) continue;

    firstRule.set(sheet, Math.min(firstRule.get(sheet) ?? at, at));
  }

  return new Map(
    [...firstRule]
      .toSorted(([, a], [, b]) => a - b)
      .map(([sheet], rank) => [sheet, rank]),
  );
}

/** The sheets a stylesheet carries, in the order its rules first appear. */
function sheetSequence(css: string): string[] {
  const seen = new Set<string>();

  return [...css.matchAll(MANTINE_SELECTOR)].flatMap(([selector]) => {
    const sheet = owner.get(selector.slice(1));

    if (sheet === undefined || seen.has(sheet)) return [];

    seen.add(sheet);

    return [sheet];
  });
}

/**
 * The stylesheets a page links, in document order — which is the order the
 * cascade resolves them in. Read off the HTML rather than off the directory: a
 * page links the chunks it needs, and nothing says two of them sort the way
 * their filenames do.
 */
const STYLESHEET_HREF = /href="([^"]+\.css)"/g;

function linkedSequence(html: string, dir: string): string[] {
  const seen = new Set<string>();

  return [...html.matchAll(STYLESHEET_HREF)].flatMap(([, href]) => {
    if (href === undefined) return [];

    const file = path.join(dir, href);

    if (seen.has(file) || !fs.existsSync(file)) return [];

    seen.add(file);

    return sheetSequence(fs.readFileSync(file, 'utf8'));
  });
}

/** Every sheet a page loads after one Mantine's own aggregate puts it before. */
function inversionsIn(
  sequence: string[],
  ranks: Map<string, number>,
): string[] {
  let furthest = { sheet: '', rank: -1 };

  return sequence.flatMap((sheet) => {
    const rank = ranks.get(sheet);

    if (rank === undefined) return [];

    if (rank > furthest.rank) {
      furthest = { sheet, rank };

      return [];
    }

    return [`${sheet} after ${furthest.sheet}`];
  });
}

const ranks = canonicalRanks();
const misordered = new Map<string, Set<string>>();

for (const dir of built) {
  const site = path.basename(path.dirname(dir));

  for (const page of walk(dir, '.html')) {
    for (const pair of inversionsIn(
      linkedSequence(fs.readFileSync(page, 'utf8'), dir),
      ranks,
    )) {
      misordered.set(site, (misordered.get(site) ?? new Set()).add(pair));
    }
  }
}

const missing = new Map<string, string[]>();

for (const site of sites) {
  for (const className of site.rendered) {
    if (site.styled.has(className)) continue;

    const sheet = owner.get(className) ?? '(unknown)';

    missing.set(sheet, [
      ...(missing.get(sheet) ?? []),
      `${className} on ${site.name}`,
    ]);
  }
}

const rendered = new Set(sites.flatMap((site) => [...site.rendered]));
const styled = new Set(sites.flatMap((site) => [...site.styled]));

/** `?? []` over `?? undefined` so the result narrows to the sheets that exist. */
function sheetsFor(classNames: Set<string>): Set<string> {
  return new Set([...classNames].flatMap((name) => owner.get(name) ?? []));
}

const alphabetical = (a: string, b: string) => a.localeCompare(b);

// A sheet is in use when the build ships a class it declares. Read off the
// emitted CSS rather than the import list, so a sheet pulled in transitively
// counts as used by whoever pulls it.
const renderedSheets = sheetsFor(rendered);
const unused = [...sheetsFor(styled)]
  .filter((sheet) => !CORE_SHEETS.has(sheet) && !renderedSheets.has(sheet))
  .toSorted(alphabetical);

/**
 * Opens a finding, blank line between it and the last. The list it grows is
 * also what the exit code turns on, so "anything to report" has one spelling.
 */
const reported: string[] = [];

function report(heading: string): void {
  console.error(`${reported.length > 0 ? '\n' : ''}${heading}`);
  reported.push(heading);
}

if (missing.size > 0) {
  report('Rendered with no rule behind it — add to theme-provider.tsx:');
  for (const [sheet, classNames] of [...missing].toSorted(([a], [b]) =>
    alphabetical(a, b),
  )) {
    console.error(
      `${importLine(sheet)}  (${classNames.toSorted(alphabetical).join(', ')})`,
    );
  }
}

if (unused.length > 0) {
  report('Imported but never rendered — drop from theme-provider.tsx:');
  for (const sheet of unused) {
    console.error(importLine(sheet));
  }
}

if (misordered.size > 0) {
  report(
    "Loaded out of Mantine's own order — a later sheet overrides the one it composes:",
  );
  for (const [site, pairs] of [...misordered].toSorted(([a], [b]) =>
    alphabetical(a, b),
  )) {
    console.error(`  ${site}: ${[...pairs].toSorted(alphabetical).join(', ')}`);
  }
  console.error(
    '\nPut the component imports in theme-provider.tsx in this order:',
  );
  for (const sheet of [...renderedSheets].toSorted(
    (a, b) => (ranks.get(a) ?? 0) - (ranks.get(b) ?? 0),
  )) {
    console.error(importLine(sheet));
  }
}

if (reported.length > 0) process.exit(1);

console.log(
  `mantine styles OK — ${rendered.size} classes rendered across ${built.length} sites, all styled`,
);
