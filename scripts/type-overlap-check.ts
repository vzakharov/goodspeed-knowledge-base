#!/usr/bin/env tsx
/**
 * Cross-file duplicate type-shape detector; scripts/type-overlap-check.README.md
 * is the reference — the two passes, their floors, and how to work a finding.
 *
 * Usage:
 *   pnpm type-overlap                             # floors: members 1, bases 2
 *   TYPE_OVERLAP_MIN=3 pnpm type-overlap          # raise the shared-member floor
 *   TYPE_OVERLAP_BASES_MIN=3 pnpm type-overlap    # raise the shared-base floor
 *
 * Exit code is non-zero when either pass has findings.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import type { Named, WithId } from '../apps/web/src/shared/typings';

// The scan root is the working directory, not the script's own location:
// `pnpm type-overlap` runs from the repo root, and the tests drive this same
// entrypoint over a fixture tree by pointing cwd at it.
const ROOT = process.cwd();

// A skip-list, not an allowlist, so a new source directory is scanned the day it
// appears. Dot-directories are skipped too, in `scan`.
const SKIP_DIRS = new Set([
  'node_modules',
  'out',
  'build',
  'dist',
  'coverage',
  'public',
  'tmp',
]);

// An override may only raise the floor (README §2).
function readThreshold(name: string, floor: number): number {
  const override = process.env[name];
  const value = Number(override ?? floor);
  if (!Number.isInteger(value) || value < floor) {
    throw new Error(`${name} must be an integer >= ${floor}, got: ${override}`);
  }
  return value;
}

const MEMBERS_MIN = readThreshold('TYPE_OVERLAP_MIN', 1);
const BASES_MIN = readThreshold('TYPE_OVERLAP_BASES_MIN', 2);

/** Normalized own-member signatures. */
type WithMembers = { members: string[] };

/** Normalized text of the named constituents of an intersection. */
type WithBases = { bases: string[] };

// --- Collect type aliases ---
// `id` is the decl locator `rel/path.ts#TypeName`, with a `#n` suffix on name
// collisions; `name` is the type's own name.
type TypeDecl = WithId &
  Named &
  WithMembers &
  WithBases & {
    // Repo-relative, e.g. src/shared/ui/card.tsx.
    filePath: string;
  };

const decls: TypeDecl[] = [];
const usedIds = new Set<string>();

function normalize(text: string): string {
  // getText() includes the trailing `;`/`,` separator — strip it so it doesn't
  // affect identity (and so `;` vs `,` styles match) and re-added at render.
  return text
    .replaceAll(/\s+/g, ' ')
    .replace(/\s*[,;]\s*$/, '')
    .trim();
}

function ownMembers(typeNode: ts.TypeNode, sf: ts.SourceFile): string[] {
  const out: string[] = [];
  const collect = (members: ts.NodeArray<ts.TypeElement>): void => {
    for (const m of members) {
      // Only property signatures (name: type). Methods, index/call signatures
      // are out of scope for this repo's params-object types.
      if (ts.isPropertySignature(m)) out.push(normalize(m.getText(sf)));
    }
  };
  if (ts.isTypeLiteralNode(typeNode)) {
    collect(typeNode.members);
  } else if (ts.isIntersectionTypeNode(typeNode)) {
    // Object-literal constituents are own members; named refs are inherited.
    for (const c of typeNode.types)
      if (ts.isTypeLiteralNode(c)) collect(c.members);
  }
  return out;
}

function namedConstituents(typeNode: ts.TypeNode, sf: ts.SourceFile): string[] {
  if (!ts.isIntersectionTypeNode(typeNode)) return [];
  // Exactly what `ownMembers` discards, so the two halves partition an
  // intersection with no carve-out to keep in sync.
  return typeNode.types
    .filter((c) => !ts.isTypeLiteralNode(c))
    .map((c) => normalize(c.getText(sf)));
}

function walk(node: ts.Node, sf: ts.SourceFile, rel: string): void {
  if (ts.isTypeAliasDeclaration(node)) {
    const members = ownMembers(node.type, sf);
    const bases = namedConstituents(node.type, sf);
    // A pure combination alias (`type Summarized = Titled & Described`) has no
    // own members and still participates, so a type respelling its combination
    // is flagged against it rather than against nothing.
    if (members.length > 0 || bases.length > 0) {
      const name = node.name.text;
      let id = `${rel}#${name}`;
      for (let n = 2; usedIds.has(id); n++) id = `${rel}#${name}#${n}`;
      usedIds.add(id);
      decls.push({ id, name, filePath: rel, members, bases });
    }
  }
  ts.forEachChild(node, (child) => {
    walk(child, sf, rel);
  });
}

function scan(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
      scan(full);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (/\.test\.tsx?$/.test(entry.name)) continue;
    const rel = path.relative(ROOT, full);
    const text = readFileSync(full, 'utf8');
    const sf = ts.createSourceFile(
      full,
      text,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      entry.name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    walk(sf, sf, rel);
  }
}
scan(ROOT);

/** The entries a pair was found to have in common — members or bases. */
type WithShared = { shared: string[] };

type Overlap = WithShared & { a: TypeDecl; b: TypeDecl };
type Group = WithShared & { types: Map<string, TypeDecl> };

type Findings = {
  groups: Group[];
  pairs: number;
  typesInvolved: number;
};

// --- Pairwise intersection, collapsed into shared-shape groups ---
// N types sharing one set are N-choose-2 pairs, grouped by that set so one
// extraction clears the group. A type in several groups needs each base — that
// is correct, not double-counting.
function findOverlaps(
  select: (d: TypeDecl) => string[],
  threshold: number,
): Findings {
  const overlaps: Overlap[] = [];
  for (const [i, a] of decls.entries()) {
    const aSet = new Set(select(a));
    for (const b of decls.slice(i + 1)) {
      const shared = [...new Set(select(b))].filter((m) => aSet.has(m));
      if (shared.length >= threshold) overlaps.push({ a, b, shared });
    }
  }

  const groups = new Map<string, Group>();
  const typesInvolved = new Set<string>();
  for (const o of overlaps) {
    typesInvolved.add(o.a.id);
    typesInvolved.add(o.b.id);
    const shared = o.shared.toSorted((x, y) => x.localeCompare(y));
    const key = shared.join('\n');
    let g = groups.get(key);
    if (!g) {
      g = { shared, types: new Map() };
      groups.set(key, g);
    }
    g.types.set(o.a.id, o.a);
    g.types.set(o.b.id, o.b);
  }

  return {
    groups: [...groups.values()].toSorted(
      (x, y) =>
        y.shared.length - x.shared.length ||
        y.types.size - x.types.size ||
        x.shared.join('\n').localeCompare(y.shared.join('\n')),
    ),
    pairs: overlaps.length,
    typesInvolved: typesInvolved.size,
  };
}

// --- Report ---
// A pass's threshold and wording are stated once, here: the scan, the section,
// the fix bullet and the clean line all read them from this descriptor, so they
// cannot drift apart — a disagreement between them is silent in the output.
type Pass = {
  threshold: number;
  select: (d: TypeDecl) => string[];
  heading: string;
  /** Plural noun for the shared entries, as the group and summary lines read. */
  noun: string;
  /** Renders one group's shared set as report lines. */
  renderShared: (shared: string[]) => string[];
  /** The sub-bullet under fix step 1, printed only when this pass fires. */
  fixStep: string;
  /** How the clean line names this pass having found nothing. */
  cleanPhrase: string;
};

const PASSES: Pass[] = [
  {
    threshold: MEMBERS_MIN,
    select: (d) => d.members,
    heading: 'Overlapping type shapes',
    noun: 'members',
    renderShared: (shared) => shared.map((m) => `     ${m};`),
    fixStep: '       - members → `type Foo = SomeBase & { …own members… }`',
    cleanPhrase: 'no shared members',
  },
  {
    threshold: BASES_MIN,
    select: (d) => d.bases,
    heading: 'Repeated base combinations',
    noun: 'bases',
    renderShared: (shared) => [`     ${shared.join(' & ')}`],
    fixStep:
      '       - bases   → `type SomeBase = A & B`, then `type Foo = SomeBase & { … }`',
    cleanPhrase: 'no repeated base combinations',
  },
];

function renderSection(findings: Findings, pass: Pass): string[] {
  if (findings.groups.length === 0) return [];

  const groupLines = findings.groups.flatMap((g, i) => {
    const types = [...g.types.values()].toSorted(
      (a, b) =>
        a.filePath.localeCompare(b.filePath) || a.name.localeCompare(b.name),
    );
    return [
      `${i + 1}. ${g.shared.length} shared ${pass.noun} across ${types.length} types:`,
      ...pass.renderShared(g.shared),
      '   in:',
      ...types.map((t) => `     ${t.filePath}  ${t.name}`),
      '',
    ];
  });

  return [
    `== ${pass.heading} (threshold=${pass.threshold}) ==`,
    '',
    ...groupLines,
    `${findings.groups.length} group(s) of shared ${pass.noun} covering ${findings.pairs} overlapping type-pair(s) across ${findings.typesInvolved} type(s) (threshold=${pass.threshold}).`,
    '',
  ];
}

const results = PASSES.map((pass) => ({
  pass,
  findings: findOverlaps(pass.select, pass.threshold),
}));
const firing = results.filter((r) => r.findings.groups.length > 0);

if (firing.length === 0) {
  const phrases = PASSES.map((p) => `${p.cleanPhrase} (min=${p.threshold})`);
  process.stdout.write(`type-overlap: clean — ${phrases.join(', ')}.\n`);
  process.exit(0);
}

const lines = [
  ...results.flatMap((r) => renderSection(r.findings, r.pass)),
  '== How to fix ==',
  'For each group above:',
  '  1. Extract the shared shape as a base type, then have each listed type',
  '     reuse it via intersection:',
  // Step 1 is the same move for either kind, so it takes a sub-bullet per kind
  // that fired. Steps 2–4 are kind-agnostic.
  ...firing.map((r) => r.pass.fixStep),
  '  2. Home the base at its most upstream consumer — the module both types',
  '     already import, or the file that declares both. Only reach for the',
  '     src/shared/ segment that owns the concept when no such module exists',
  '     or the base is genuinely cross-cutting.',
  '  3. Do not give the base its own single-type module — a file that exists only',
  '     to hold one type is churn.',
  '  4. Name it from what the members MEAN, not their count — see the naming',
  '     families in scripts/type-overlap-check.README.md.',
];

process.stdout.write(`${lines.join('\n')}\n`);
process.exit(1);
