// Where the cost ledger lives, for the script that writes its rows and the one
// that sums them — both have to agree on it, or the report reads nothing.

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parsePrices, type PriceTable } from './session-cost.ts';

export const root = process.env['CLAUDE_PROJECT_DIR'] ?? process.cwd();

export const sessionsDir = path.join(root, '.claude/costs/sessions');

export const readPrices = (): PriceTable =>
  parsePrices(
    readFileSync(path.join(root, '.claude/costs/prices.json'), 'utf8'),
  );
