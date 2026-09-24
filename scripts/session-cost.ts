#!/usr/bin/env node

// Prices one session's transcript and writes its row under
// `.claude/costs/sessions/`, rewritten from the whole file on every run.
// `--at-stop` is the Stop hook's: the turn is over, so the transcript should end
// on its `end_turn`. `--out` is the hook's too: it writes the row there instead of
// into place, since committing it is the hook's job.
//
//   node scripts/session-cost.ts --transcript <path> [--session-id <id>] [--row-path] [--at-stop] [--out <path>]

/* eslint-disable no-console -- stdout is this script's interface: the row's
   path for the hook that calls it, a one-line summary for a person running it
   by hand. */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { flag, given } from './lib/argv.ts';
import { readPrices, root, rowText, sessionsDir } from './lib/ledger.ts';
import {
  isUnwrittenTail,
  parseSessionCost,
  type SessionCost,
  summariseTranscript,
} from './lib/session-cost.ts';
import { writeAtomic } from './lib/write-atomic.ts';

const transcript = flag('transcript');
if (transcript === undefined) {
  console.error('session-cost: --transcript <path> is required');
  process.exit(2);
}

// The month it started, so a session running across month-end stays in one file.
const monthOf = (cost: SessionCost): string =>
  (cost.firstResponseAt ?? new Date().toISOString()).slice(0, 7);

// A session that spawned no subagent has no directory at all.
const subagentsOf = (main: string): string[] => {
  const dir = path.join(
    path.dirname(main),
    path.basename(main, '.jsonl'),
    'subagents',
  );
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => readFileSync(path.join(dir, name), 'utf8'));
  } catch {
    return [];
  }
};

// An unwritten-tail warning is what no run can recompute from the transcript, so
// a rewrite reads it back from the last one. An unreadable row counts as no row:
// the point is to carry the warning forward, never to fail a write over one.
const previous = (row: string): SessionCost | undefined => {
  try {
    return parseSessionCost(readFileSync(row, 'utf8'));
  } catch {
    return undefined;
  }
};

const cost = summariseTranscript(
  {
    main: readFileSync(transcript, 'utf8'),
    subagents: subagentsOf(transcript),
  },
  readPrices(),
  flag('session-id') ?? path.basename(transcript, '.jsonl'),
  given('at-stop'),
);

const out = path.join(sessionsDir, monthOf(cost), `${cost.sessionId}.json`);
const before = previous(out);
const carried = (before?.warnings ?? []).filter(
  (warning) => isUnwrittenTail(warning) && !cost.warnings.includes(warning),
);
const row: SessionCost = { ...cost, warnings: [...carried, ...cost.warnings] };
const staged = flag('out');
if (staged === undefined) writeAtomic(root, out, rowText(row));
else writeFileSync(staged, rowText(row));

console.log(
  given('row-path')
    ? out
    : `session-cost: ${row.total.responses} responses, $${row.total.costUsd.toFixed(4)} → ${out}`,
);
