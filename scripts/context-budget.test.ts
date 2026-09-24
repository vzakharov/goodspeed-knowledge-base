/**
 * Drives the context budget hook as the harness does — a payload on stdin, a
 * transcript on disk — and reads what it prints. What it protects is the
 * once-per-climb rule and which records count as the session's reading.
 */

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { z } from 'zod';

const HOOK = path.resolve(
  import.meta.dirname,
  '../.claude/hooks/post-tool-context-budget.sh',
);
const WARN = 200_000;
const PAUSE = 300_000;

// The reading sums all three input fields, so the context is split across them.
const assistant = (
  context: number,
  { sidechain = false, model = 'claude-x' } = {},
): object => ({
  type: 'assistant',
  isSidechain: sidechain,
  message: {
    model,
    usage: {
      input_tokens: 2,
      cache_read_input_tokens: context - 1002,
      cache_creation_input_tokens: 1000,
      output_tokens: 500,
    },
  },
});

const toolResult = (): object => ({
  type: 'user',
  isSidechain: false,
  message: { content: 'ok' },
});

const EmittedSchema = z.object({
  hookSpecificOutput: z.object({
    hookEventName: z.string(),
    additionalContext: z.string(),
  }),
});

const session = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'context-budget-'));
  const transcript = path.join(root, 'transcript.jsonl');
  writeFileSync(transcript, '');

  const toolCall = (
    env: Record<string, string> = {},
    payload: Record<string, string> = {},
  ): string => {
    const { status, stdout, stderr } = spawnSync(HOOK, [], {
      encoding: 'utf8',
      input: JSON.stringify({
        hook_event_name: 'PostToolUse',
        session_id: 'sess',
        transcript_path: transcript,
        cwd: root,
        ...payload,
      }),
      env: {
        PATH: process.env['PATH'] ?? '/usr/bin:/bin',
        CLAUDE_PROJECT_DIR: root,
        ...env,
      },
    });
    assert.equal(status, 0, stderr);
    return stdout;
  };

  return {
    transcript,
    toolCall,
    append: (...records: object[]): void => {
      appendFileSync(
        transcript,
        records.map((record) => `${JSON.stringify(record)}\n`).join(''),
      );
    },
    notice: (
      env: Record<string, string> = {},
      payload: Record<string, string> = {},
    ): string | undefined => {
      const out = toolCall(env, payload);
      if (out.trim() === '') return undefined;
      const emitted = EmittedSchema.parse(JSON.parse(out)).hookSpecificOutput;
      // `hookSpecificOutput` is honoured only under the event that ran the hook.
      assert.equal(emitted.hookEventName, 'PostToolUse');
      return emitted.additionalContext;
    },
  };
};

type Session = ReturnType<typeof session>;

describe('context-budget: when the notices fire', () => {
  let s: Session;
  beforeEach(() => {
    s = session();
  });

  it('says nothing under the warn line', () => {
    s.append(assistant(WARN - 1), toolResult());
    assert.equal(s.notice(), undefined);
  });

  it('warns once on crossing the warn line', () => {
    s.append(assistant(WARN + 5000));
    const notice = s.notice() ?? '';
    assert.match(notice, /~205k/);
    assert.match(notice, /warning line/);
    s.append(toolResult(), assistant(WARN + 9000));
    assert.equal(s.notice(), undefined);
  });

  it('pauses once on crossing the pause line after the warning', () => {
    s.append(assistant(WARN + 1));
    s.notice();
    s.append(assistant(PAUSE));
    assert.match(s.notice() ?? '', /pause line/);
    s.append(assistant(PAUSE + 20_000));
    assert.equal(s.notice(), undefined);
  });

  it('skips the warning on a jump past the pause line', () => {
    s.append(assistant(PAUSE + 1));
    const notice = s.notice() ?? '';
    assert.match(notice, /pause line/);
    assert.doesNotMatch(notice, /warning line/);
  });

  it('re-arms both on dropping under the warn line', () => {
    s.append(assistant(PAUSE + 1));
    s.notice();
    s.append(assistant(40_000));
    assert.equal(s.notice(), undefined);
    s.append(assistant(WARN + 1));
    assert.match(s.notice() ?? '', /warning line/);
  });

  it('follows the thresholds’ env overrides', () => {
    s.append(assistant(60_000));
    const notice = s.notice({
      CONTEXT_BUDGET_WARN: '50000',
      CONTEXT_BUDGET_PAUSE: '100000',
    });
    assert.match(notice ?? '', /50k warning line/);
  });

  it('measures nearly done as under 100k, with the half-gauge at the warning only', () => {
    // The half-of-the-session gauge matches 100k only at the warning line; at
    // the pause line it would read 150k, so that notice carries none.
    s.append(assistant(WARN + 1));
    const warning = s.notice() ?? '';
    s.append(assistant(PAUSE + 1));
    const pause = s.notice() ?? '';
    assert.match(warning, /under ~100k more tokens/);
    assert.match(warning, /less than half/);
    assert.match(pause, /under ~100k more tokens/);
    assert.doesNotMatch(pause, /less than half/);
  });
});

describe('context-budget: which records are the reading', () => {
  let s: Session;
  beforeEach(() => {
    s = session();
  });

  it('reads the last main-chain response', () => {
    s.append(assistant(PAUSE + 1), assistant(WARN - 1));
    assert.equal(s.notice(), undefined);
  });

  it('skips a sidechain response', () => {
    s.append(assistant(WARN - 1), assistant(PAUSE + 1, { sidechain: true }));
    assert.equal(s.notice(), undefined);
  });

  it('skips a synthetic response', () => {
    s.append(assistant(WARN + 1), assistant(0, { model: '<synthetic>' }));
    assert.notEqual(s.notice(), undefined);
  });

  it('ignores a subagent’s tool call', () => {
    s.append(assistant(PAUSE + 1));
    assert.equal(s.notice({}, { agent_id: 'agent-1' }), undefined);
    assert.notEqual(s.notice(), undefined);
  });
});

describe('context-budget: when there is nothing to read', () => {
  it('is silent on a missing transcript', () => {
    const s = session();
    rmSync(s.transcript);
    assert.equal(s.toolCall(), '');
  });

  it('is silent on a transcript with no response yet', () => {
    const s = session();
    s.append(toolResult());
    assert.equal(s.notice(), undefined);
  });
});
