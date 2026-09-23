#!/usr/bin/env node

// Totals the rows under `.claude/costs/sessions/` at Claude API rates.
//
//   node scripts/costs-report.ts [--month YYYY-MM] [--json]

/* eslint-disable no-console -- stdout is this script's interface: the report is
   the whole output. */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { flag, given } from './lib/argv.ts';
import { type Bucket, totalsOf } from './lib/cost-totals.ts';
import { readPrices, sessionsDir } from './lib/ledger.ts';
import { parseSessionCost, type SessionCost } from './lib/session-cost.ts';

const wanted = flag('month');

const months = (() => {
  try {
    return readdirSync(sessionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .toSorted();
  } catch {
    return [];
  }
})();

const rowsIn = (month: string): SessionCost[] => {
  const dir = path.join(sessionsDir, month);
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) =>
      parseSessionCost(readFileSync(path.join(dir, name), 'utf8')),
    );
};

const shown = months.filter(
  (month) => wanted === undefined || month === wanted,
);

if (shown.length === 0) {
  console.log(
    `costs: no rows under ${sessionsDir}${wanted === undefined ? '' : ` for ${wanted}`}`,
  );
  process.exit(0);
}

const rows = shown.flatMap((month) => rowsIn(month));
const totals = totalsOf(rows);

if (given('json')) {
  console.log(JSON.stringify(totals, null, 2));
  process.exit(0);
}

const usd = (amount: number): string => `$${amount.toFixed(2)}`;
const pad = (text: string, width: number): string => text.padStart(width);
const count = (n: number, noun: string): string =>
  `${n} ${noun}${n === 1 ? '' : 's'}`;

const table = (title: string, buckets: Record<string, Bucket>): void => {
  const width = Math.max(...Object.keys(buckets).map((key) => key.length));
  console.log(`\n${title}`);
  for (const [key, bucket] of Object.entries(buckets))
    console.log(
      `  ${key.padEnd(width)}  ${pad(usd(bucket.costUsd), 10)}  ${pad(count(bucket.sessions, 'session'), 12)}  ${pad(count(bucket.responses, 'response'), 15)}`,
    );
};

table('month', totals.byMonth);
table('week', totals.byWeek);
table('day', totals.byDay);
table('branch', totals.byBranch);

const subagents = rows.reduce((sum, row) => sum + row.subagents.costUsd, 0);
console.log(
  `\ntotal ${usd(totals.costUsd)} over ${count(totals.sessions, 'session')}${subagents > 0 ? `, ${usd(subagents)} of it subagents` : ''}`,
);

// The table's age, then the one-way check against Claude Code's own count:
// `.claude/rules/costs.md` § "Checking the arithmetic".
const prices = readPrices();
const days = Math.floor((Date.now() - Date.parse(prices.as_of)) / 86_400_000);
console.log(
  `\nrates as of ${prices.as_of} (${count(days, 'day')} ago), hand-kept in .claude/costs/prices.json`,
);

const stale = rows.filter((row) => row.pricesAsOf !== prices.as_of).length;
if (stale > 0)
  console.log(
    `${count(stale, 'row')} priced under an older table; their transcripts are gone, so the figures stand as billed at the time`,
  );

const SHORTFALL = 0.02;

const short = rows.filter(
  (row) =>
    row.claudeCodeTotalUsd !== null &&
    row.total.costUsd < row.claudeCodeTotalUsd * (1 - SHORTFALL),
);

for (const row of short)
  console.log(
    `${row.sessionId}: priced at ${usd(row.total.costUsd)}, but Claude Code had already counted ${usd(row.claudeCodeTotalUsd ?? 0)} — the row is missing a source`,
  );

const unchecked = rows.filter((row) => row.claudeCodeTotalUsd === null).length;
if (unchecked > 0)
  console.log(
    `${count(unchecked, 'row')} with no Claude Code total to check against`,
  );
