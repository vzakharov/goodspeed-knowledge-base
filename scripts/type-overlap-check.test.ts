/**
 * End-to-end tests for the type-overlap gate.
 *
 * Each case materializes a throwaway source tree in the OS temp directory and
 * runs the real script against it with `cwd` set there — the script takes its
 * scan root from `process.cwd()`, so a fixture tree needs no test hook in
 * production code, and what is asserted is the artifact `pnpm type-overlap`
 * actually runs: its exit code and the exact report text.
 *
 * Fixtures are written at runtime rather than committed, because a committed
 * `.ts` fixture that trips the gate would be scanned by the repo's own run.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

// Resolved from this file, not from cwd — cwd is what each case reassigns.
const ROOT = path.resolve(import.meta.dirname, '..');
const TSX = path.join(ROOT, 'node_modules/.bin/tsx');
const SCRIPT = path.join(ROOT, 'scripts/type-overlap-check.ts');

const CLEAN_LINE =
  'type-overlap: clean — no shared members (min=1), no repeated base combinations (min=2).\n';

const MEMBERS_HEADING = '== Overlapping type shapes (threshold=1) ==';
const BASES_HEADING = '== Repeated base combinations (threshold=2) ==';
const MEMBERS_FIX = '- members → `type Foo = SomeBase & { …own members… }`';
const BASES_FIX =
  '- bases   → `type SomeBase = A & B`, then `type Foo = SomeBase & { … }`';

/** Fixture source files, keyed by path relative to the scan root. */
type Tree = Record<string, string>;

type Run = { status: number; stdout: string; stderr: string };

function run(tree: Tree, overrides: Record<string, string> = {}): Run {
  const dir = mkdtempSync(path.join(tmpdir(), 'type-overlap-'));
  for (const [rel, source] of Object.entries(tree)) {
    const full = path.join(dir, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, source);
  }

  // Drop the thresholds from the ambient environment so a developer who has
  // one exported does not change what these cases measure.
  const env = { ...process.env, ...overrides };
  for (const name of ['TYPE_OVERLAP_MIN', 'TYPE_OVERLAP_BASES_MIN'])
    if (!(name in overrides)) delete env[name];

  const { error, status, stdout, stderr } = spawnSync(TSX, [SCRIPT], {
    cwd: dir,
    encoding: 'utf8',
    env,
  });
  assert.equal(error, undefined);
  return { status: status ?? -1, stdout, stderr };
}

const BASES = `
export type Titled = { title: string };
export type Described = { description: string };
`;

describe('type-overlap: clean runs', () => {
  it('exits 0 and names both passes when nothing overlaps', () => {
    const { status, stdout } = run({
      'lib/types.ts': `
        export type Author = { name: string };
        export type Post = { slug: string };
      `,
    });
    assert.equal(status, 0);
    assert.equal(stdout, CLEAN_LINE);
  });

  it('leaves a combination spelled once alone', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/one.ts': `
        import type { Titled, Described } from './bases';
        export type Summarized = Titled & Described;
      `,
    });
    assert.equal(status, 0);
    assert.equal(stdout, CLEAN_LINE);
  });

  it('goes clean once both types reuse the named combination', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/summarized.ts': `
        import type { Titled, Described } from './bases';
        export type Summarized = Titled & Described;
      `,
      'lib/cards.ts': `
        import type { Summarized } from './summarized';
        export type Card = Summarized & { href: string };
        export type Tile = Summarized & { icon: string };
      `,
    });
    assert.equal(status, 0);
    assert.equal(stdout, CLEAN_LINE);
  });
});

describe('type-overlap: the member pass', () => {
  it('flags a single member two types both declare', () => {
    const { status, stdout } = run({
      'lib/a.ts': 'export type A = { title: string; href: string };',
      'lib/b.ts': 'export type B = { title: string; icon: string };',
    });
    assert.equal(status, 1);
    assert.match(stdout, new RegExp(escapeRegExp(MEMBERS_HEADING)));
    assert.match(stdout, /1 shared members across 2 types:/);
    assert.match(stdout, /^ {5}title: string;$/m);
    assert.match(stdout, /^ {5}lib\/a\.ts {2}A$/m);
    assert.match(stdout, /^ {5}lib\/b\.ts {2}B$/m);
  });

  it('treats the named constituents of an intersection as inherited', () => {
    const { status, stdout } = run({
      'lib/bases.ts': 'export type Titled = { title: string };',
      'lib/uses.ts': `
        import type { Titled } from './bases';
        export type Card = Titled & { href: string };
        export type Tile = Titled & { icon: string };
      `,
    });
    assert.equal(status, 0);
    assert.equal(stdout, CLEAN_LINE);
  });
});

describe('type-overlap: the base-combination pass', () => {
  it('flags a combination spelled across two types', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/card.ts': `
        import type { Titled, Described } from './bases';
        export type Card = Titled & Described & { href: string };
      `,
      'lib/tile.ts': `
        import type { Titled, Described } from './bases';
        export type Tile = Titled & Described & { icon: string };
      `,
    });
    assert.equal(status, 1);
    assert.match(stdout, new RegExp(escapeRegExp(BASES_HEADING)));
    assert.match(stdout, /2 shared bases across 2 types:/);
    assert.match(stdout, /^ {5}Described & Titled$/m);
    assert.match(stdout, /^ {5}lib\/card\.ts {2}Card$/m);
    assert.match(stdout, /^ {5}lib\/tile\.ts {2}Tile$/m);
  });

  it('pulls the existing pure-combination alias into the group', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/summarized.ts': `
        import type { Titled, Described } from './bases';
        export type Summarized = Titled & Described;
      `,
      'lib/card.ts': `
        import type { Titled, Described } from './bases';
        export type Card = Titled & Described & { href: string };
      `,
    });
    assert.equal(status, 1);
    assert.match(stdout, /2 shared bases across 2 types:/);
    assert.match(stdout, /^ {5}lib\/summarized\.ts {2}Summarized$/m);
  });

  it('leaves a single shared base alone, that being the intended end state', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/uses.ts': `
        import type { Titled, Described } from './bases';
        export type Card = Titled & { href: string };
        export type Tile = Titled & { icon: string };
        export type Note = Described & { body: string };
      `,
    });
    assert.equal(status, 0);
    assert.equal(stdout, CLEAN_LINE);
  });
});

describe('type-overlap: the fix bullets', () => {
  it('prints only the firing pass’s sub-bullet', () => {
    const { stdout } = run({
      'lib/a.ts': 'export type A = { title: string; href: string };',
      'lib/b.ts': 'export type B = { title: string; icon: string };',
    });
    assert.ok(stdout.includes(MEMBERS_FIX));
    assert.ok(!stdout.includes(BASES_FIX));
  });

  it('prints both sections and both sub-bullets when both passes fire', () => {
    const { status, stdout } = run({
      'lib/bases.ts': BASES,
      'lib/card.ts': `
        import type { Titled, Described } from './bases';
        export type Card = Titled & Described & { href: string };
      `,
      'lib/tile.ts': `
        import type { Titled, Described } from './bases';
        export type Tile = Titled & Described & { href: string };
      `,
    });
    assert.equal(status, 1);
    assert.ok(stdout.includes(MEMBERS_HEADING));
    assert.ok(stdout.includes(BASES_HEADING));
    assert.ok(stdout.includes(MEMBERS_FIX));
    assert.ok(stdout.includes(BASES_FIX));
    assert.ok(stdout.indexOf(MEMBERS_HEADING) < stdout.indexOf(BASES_HEADING));
  });
});

describe('type-overlap: thresholds', () => {
  it('accepts an upward override and suppresses the finding below it', () => {
    const { status, stdout } = run(
      {
        'lib/a.ts': 'export type A = { title: string; href: string };',
        'lib/b.ts': 'export type B = { title: string; icon: string };',
      },
      { TYPE_OVERLAP_MIN: '2' },
    );
    assert.equal(status, 0);
    assert.match(stdout, /no shared members \(min=2\)/);
  });

  it('refuses to lower a floor', () => {
    const { status, stderr } = run(
      { 'lib/a.ts': 'export type A = { title: string };' },
      { TYPE_OVERLAP_BASES_MIN: '1' },
    );
    assert.notEqual(status, 0);
    assert.match(stderr, /TYPE_OVERLAP_BASES_MIN must be an integer >= 2/);
  });

  it('refuses a non-integer', () => {
    const { status, stderr } = run(
      { 'lib/a.ts': 'export type A = { title: string };' },
      { TYPE_OVERLAP_MIN: 'nope' },
    );
    assert.notEqual(status, 0);
    assert.match(stderr, /TYPE_OVERLAP_MIN must be an integer >= 1, got: nope/);
  });
});

describe('type-overlap: what the scan skips', () => {
  const duplicate = 'export type Dup = { title: string; body: string };';

  for (const [label, rel] of [
    ['scratch under tmp/', 'tmp/probe.ts'],
    ['test files', 'lib/probe.test.ts'],
    ['ambient declarations', 'lib/probe.d.ts'],
    ['dot-directories', '.scratch/probe.ts'],
    ['assets under public/', 'public/probe.ts'],
  ] as const) {
    it(`ignores ${label}`, () => {
      const { status, stdout } = run({
        'lib/real.ts': duplicate.replace('Dup', 'Real'),
        [rel]: duplicate,
      });
      assert.equal(status, 0);
      assert.equal(stdout, CLEAN_LINE);
    });
  }
});

function escapeRegExp(literal: string): string {
  return literal.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}
