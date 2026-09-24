/**
 * End-to-end tests for the row writer: each case gives the real script a
 * throwaway project directory and transcript, and reads back the row it wrote.
 * What is under test is what one run hands the next — the fields no run can
 * recompute from the transcript.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { assistantRecord, PRICES } from './lib/cost-fixtures.ts';
import { isUnwrittenTail, parseSessionCost } from './lib/session-cost.ts';

const SCRIPT = path.resolve(import.meta.dirname, 'session-cost.ts');

const project = (): { dir: string; transcript: string } => {
  const dir = mkdtempSync(path.join(tmpdir(), 'session-cost-'));
  mkdirSync(path.join(dir, '.claude/costs'), { recursive: true });
  writeFileSync(path.join(dir, '.claude/costs/prices.json'), PRICES);
  return { dir, transcript: path.join(dir, 'sess.jsonl') };
};

const run = (dir: string, transcript: string, ...args: string[]): string => {
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [SCRIPT, '--transcript', transcript, '--row-path', ...args],
    { encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } },
  );
  assert.equal(status, 0, stderr);
  return stdout.trim();
};

describe('session-cost: what a rewrite carries forward', () => {
  it('keeps an unwritten-tail warning once the transcript has caught up', () => {
    const { dir, transcript } = project();
    writeFileSync(transcript, assistantRecord('msg_1', 'tool_use'));
    run(dir, transcript, '--at-stop');

    writeFileSync(
      transcript,
      [
        assistantRecord('msg_1', 'tool_use'),
        assistantRecord('msg_2', 'end_turn'),
      ].join('\n'),
    );
    const row = parseSessionCost(
      readFileSync(run(dir, transcript, '--at-stop'), 'utf8'),
    );

    const tails = row.warnings.filter((warning) => isUnwrittenTail(warning));
    assert.equal(tails.length, 1);
    assert.match(tails[0] ?? '', /msg_1/);
  });

  it('writes the row to --out, leaving the ledger as it was', () => {
    const { dir, transcript } = project();
    writeFileSync(transcript, assistantRecord('msg_1', 'end_turn'));
    const out = path.join(dir, 'staged.json');
    const row = run(dir, transcript, '--at-stop', '--out', out);

    assert.equal(existsSync(row), false);
    assert.equal(parseSessionCost(readFileSync(out, 'utf8')).sessionId, 'sess');
  });
});
