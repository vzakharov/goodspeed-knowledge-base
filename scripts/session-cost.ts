#!/usr/bin/env node

// Prices one session's transcript and writes its row under
// `.claude/costs/sessions/`. The row is rewritten from the whole file each run
// rather than appended to, which is what lets a run pick up what the previous
// one was too early to see — the transcript lags the live conversation.
//
//   node scripts/session-cost.ts --transcript <path> [--session-id <id>] [--row-path]
//   node scripts/session-cost.ts --transcript <path> --name '<short label>'

/* eslint-disable no-console -- stdout is this script's interface: the row's
   path for the hook that calls it, a one-line summary for a person running it
   by hand. */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { flag, given } from './lib/argv.ts';
import { readPrices, root, sessionsDir } from './lib/ledger.ts';
import {
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

// The month a session is filed under is the month it started, so a session
// running across midnight on the last of the month stays in one file.
const monthOf = (cost: SessionCost): string =>
  (cost.firstResponseAt ?? new Date().toISOString()).slice(0, 7);

// A subagent's responses are billed to this session and written to their own
// file under `<transcript>/subagents/`, so the directory is read rather than
// assumed empty. A session that spawned none has no directory at all.
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

// The name is the one field no run can recompute, so a rewrite reads back what
// the last one wrote. An unreadable row is treated as no row: the point is to
// keep a name, never to fail a write over one.
const nameOn = (row: string): string | null => {
  try {
    return parseSessionCost(readFileSync(row, 'utf8')).name;
  } catch {
    return null;
  }
};

const cost = summariseTranscript(
  {
    main: readFileSync(transcript, 'utf8'),
    subagents: subagentsOf(transcript),
  },
  readPrices(),
  flag('session-id') ?? path.basename(transcript, '.jsonl'),
);

const out = path.join(sessionsDir, monthOf(cost), `${cost.sessionId}.json`);
const named: SessionCost = { ...cost, name: flag('name') ?? nameOn(out) };
writeAtomic(root, out, `${JSON.stringify(named, null, 2)}\n`);

console.log(
  given('row-path')
    ? out
    : `session-cost: ${named.total.responses} responses, $${named.total.costUsd.toFixed(4)} → ${out}`,
);
