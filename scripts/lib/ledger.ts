// Where the cost ledger lives and how a row sits on disk, for the script that
// writes its rows and the one that sums them — both have to agree on it, or the
// report reads nothing.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import {
  parsePrices,
  parseSessionCost,
  type PriceTable,
  type SessionCost,
} from './session-cost.ts';
import { writeAtomic } from './write-atomic.ts';

export const root = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();

export const sessionsDir = path.join(root, '.claude/costs/sessions');

export const readPrices = (): PriceTable =>
  parsePrices(
    readFileSync(path.join(root, '.claude/costs/prices.json'), 'utf8'),
  );

export const rowText = (row: SessionCost): string =>
  `${JSON.stringify(row, null, 2)}\n`;

/**
 * A row carrying keys the current shape does not write is rewritten in that
 * shape as it is read, and the keys it lost are returned. That is how a retired
 * field leaves the ledger — in every repository it runs in, on the first report
 * there — with no migration for anyone to remember to run.
 */
export const readRow = (
  file: string,
): { row: SessionCost; dropped: string[] } => {
  const text = readFileSync(file, 'utf8');
  const row = parseSessionCost(text);
  const kept = new Set(Object.keys(row));
  const written = z.record(z.string(), z.unknown()).parse(JSON.parse(text));
  const dropped = Object.keys(written)
    .filter((key) => !kept.has(key))
    .toSorted();
  if (dropped.length > 0) writeAtomic(root, file, rowText(row));
  return { row, dropped };
};
