import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { readRow, root, rowText } from './ledger.ts';
import { parseSessionCost } from './session-cost.ts';

const tally = {
  inputTokens: 0,
  cacheWrite5mTokens: 0,
  cacheWrite1hTokens: 0,
  cacheReadTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
  responses: 0,
  costUsd: 0,
};

const ROW = parseSessionCost(
  JSON.stringify({
    sessionId: 'sess',
    branch: 'a-branch',
    cwd: null,
    firstResponseAt: null,
    lastResponseAt: null,
    pricesAsOf: '2026-01-01',
    total: tally,
    ownTurns: tally,
    subagents: tally,
    byRate: {},
    warnings: [],
  }),
);

// Under the repo's `tmp/`, where `writeAtomic` stages: a rename out of the
// system temp directory may cross filesystems.
const rowFile = (): string => {
  mkdirSync(path.join(root, 'tmp'), { recursive: true });
  return path.join(mkdtempSync(path.join(root, 'tmp', 'ledger-')), 'sess.json');
};

describe('ledger: a row read back', () => {
  it('is rewritten without a key the current shape no longer writes', () => {
    const file = rowFile();
    writeFileSync(file, JSON.stringify({ ...ROW, name: 'a named session' }));
    assert.deepEqual(readRow(file), { row: ROW, dropped: ['name'] });
    assert.equal(readFileSync(file, 'utf8'), rowText(ROW));
  });

  it('is left untouched when it is in the current shape', () => {
    const file = rowFile();
    writeFileSync(file, rowText(ROW));
    const before = statSync(file).mtimeMs;
    assert.deepEqual(readRow(file), { row: ROW, dropped: [] });
    assert.equal(statSync(file).mtimeMs, before);
  });
});
