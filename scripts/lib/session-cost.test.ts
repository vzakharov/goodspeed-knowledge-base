/**
 * The pricer is a pure function of a transcript and a rate table, so the cases
 * below are that transcript written out rather than a fixture on disk: each one
 * states a property of the format the totals depend on.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isUnwrittenTail,
  parsePrices,
  summariseTranscript,
} from './session-cost.ts';

const prices = parsePrices(
  JSON.stringify({
    as_of: '2026-01-01',
    rates: {
      'test-model/standard': {
        input: 1,
        output: 10,
        cache_write_5m: 2,
        cache_write_1h: 4,
        cache_read: 0.5,
      },
      'test-model/fast': {
        input: 2,
        output: 20,
        cache_write_5m: 4,
        cache_write_1h: 8,
        cache_read: 1,
      },
    },
  }),
);

type ResponseOverrides = {
  id?: string;
  stopReason?: string;
  speed?: string | null;
  model?: string;
  branch?: string;
  sidechain?: boolean;
  input?: number;
  output?: number;
  thinking?: number;
  read?: number;
  write5m?: number;
  write1h?: number;
  written?: number;
};

const response = (overrides: ResponseOverrides = {}): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'sess',
    gitBranch: overrides.branch ?? 'a-branch',
    timestamp: '2026-03-04T05:06:07.000Z',
    isSidechain: overrides.sidechain ?? false,
    message: {
      id: overrides.id ?? 'msg_1',
      model: overrides.model ?? 'test-model',
      stop_reason: overrides.stopReason ?? 'end_turn',
      usage: {
        input_tokens: overrides.input ?? 0,
        output_tokens: overrides.output ?? 0,
        cache_read_input_tokens: overrides.read ?? 0,
        cache_creation_input_tokens:
          overrides.written ??
          (overrides.write5m ?? 0) + (overrides.write1h ?? 0),
        cache_creation: {
          ephemeral_5m_input_tokens: overrides.write5m ?? 0,
          ephemeral_1h_input_tokens: overrides.write1h ?? 0,
        },
        // `null` asks for the field to be absent, which is the shape of a
        // record written before `speed` existed.
        ...(overrides.speed === null
          ? {}
          : { speed: overrides.speed ?? 'standard' }),
        output_tokens_details: { thinking_tokens: overrides.thinking ?? 0 },
      },
    },
  });

const summarise = (
  lines: string[],
  subagents: string[][] = [],
  atStop = false,
) =>
  summariseTranscript(
    { main: lines.join('\n'), subagents: subagents.map((s) => s.join('\n')) },
    prices,
    'fallback',
    atStop,
  );

describe('session-cost: what a response costs', () => {
  it('counts one response written as several records once', () => {
    // A turn that thought and called two tools writes three records, each
    // carrying the whole response's usage.
    const cost = summarise([
      response({ output: 1_000_000 }),
      response({ output: 1_000_000 }),
      response({ output: 1_000_000 }),
    ]);
    assert.equal(cost.total.responses, 1);
    assert.equal(cost.total.costUsd, 10);
  });

  it('bills cache writes by TTL', () => {
    const cost = summarise([
      response({ write5m: 1_000_000, write1h: 1_000_000 }),
    ]);
    assert.equal(cost.total.costUsd, 6);
  });

  it('picks the rate set by speed', () => {
    const standard = summarise([response({ output: 1_000_000 })]);
    const fast = summarise([response({ output: 1_000_000, speed: 'fast' })]);
    assert.equal(fast.total.costUsd, standard.total.costUsd * 2);
  });

  it('reads a missing speed as standard', () => {
    const cost = summarise([response({ output: 1_000_000, speed: null })]);
    assert.equal(cost.total.costUsd, 10);
    assert.ok('test-model/standard' in cost.byRate);
  });

  it('reports thinking tokens without billing them twice', () => {
    const cost = summarise([
      response({ output: 1_000_000, thinking: 400_000 }),
    ]);
    assert.equal(cost.total.thinkingTokens, 400_000);
    assert.equal(cost.total.costUsd, 10);
  });
});

describe('session-cost: what a row records', () => {
  it('splits subagent spend out of the session total', () => {
    const cost = summarise([
      response({ id: 'msg_1', output: 1_000_000 }),
      response({ id: 'msg_2', output: 1_000_000, sidechain: true }),
    ]);
    assert.equal(cost.total.costUsd, 20);
    assert.equal(cost.ownTurns.costUsd, 10);
    assert.equal(cost.subagents.costUsd, 10);
  });

  it('bills a subagent to the session that spawned it, from the subagent’s own file', () => {
    const cost = summarise(
      [response({ id: 'msg_1', output: 1_000_000 })],
      [[response({ id: 'msg_2', output: 1_000_000, sidechain: true })]],
    );
    assert.equal(cost.total.costUsd, 20);
    assert.equal(cost.ownTurns.costUsd, 10);
    assert.equal(cost.subagents.costUsd, 10);
    assert.equal(cost.total.responses, 2);
  });

  it('files a subagent’s responses as delegated however its records are flagged', () => {
    const cost = summarise(
      [response({ id: 'msg_1', output: 1_000_000 })],
      [[response({ id: 'msg_2', output: 1_000_000, sidechain: false })]],
    );
    assert.equal(cost.subagents.costUsd, 10);
    assert.equal(cost.ownTurns.costUsd, 10);
  });

  it('records the branch the session ended on', () => {
    const cost = summarise([
      response({ id: 'msg_1', branch: 'before-the-rename' }),
      response({ id: 'msg_2', branch: 'after-the-rename' }),
    ]);
    assert.equal(cost.branch, 'after-the-rename');
  });

  it('skips records that carry no usage rather than parsing them', () => {
    const cost = summarise([
      JSON.stringify({ type: 'user', message: { content: 'hello' } }),
      JSON.stringify({ type: 'attachment', payload: 42 }),
      response({ output: 1_000_000 }),
    ]);
    assert.equal(cost.total.responses, 1);
  });
});

describe('session-cost: what it refuses to guess', () => {
  it('fails on an unpriced pair, naming it', () => {
    assert.throws(
      () => summarise([response({ model: 'unheard-of' })]),
      /unheard-of\/standard/,
    );
  });

  it('falls back to the 5-minute rate when the TTL split does not add up, and says so', () => {
    const cost = summarise([
      response({ written: 1_000_000, write5m: 0, write1h: 0 }),
    ]);
    assert.equal(cost.total.cacheWrite5mTokens, 1_000_000);
    assert.equal(cost.total.costUsd, 2);
    assert.ok(cost.warnings.join('').includes('does not account for 1000000'));
  });
});

describe('session-cost: a tail the transcript had not caught up with', () => {
  it('warns at stop when the session’s last response did not end its turn', () => {
    const cost = summarise(
      [
        response({ id: 'msg_a' }),
        response({ id: 'msg_b', stopReason: 'tool_use' }),
      ],
      [],
      true,
    );
    assert.equal(
      cost.warnings.filter((warning) => isUnwrittenTail(warning)).length,
      1,
    );
    assert.ok(cost.warnings.join('').includes('msg_b'));
  });

  it('stays quiet at stop when the turn closed on end_turn', () => {
    const cost = summarise(
      [response({ stopReason: 'tool_use' }), response({ id: 'msg_2' })],
      [],
      true,
    );
    assert.deepEqual(cost.warnings, []);
  });

  it('reads only the session’s own responses, not a subagent’s', () => {
    const cost = summarise(
      [response()],
      [[response({ id: 'msg_sub', stopReason: 'tool_use' })]],
      true,
    );
    assert.deepEqual(cost.warnings, []);
  });

  it('checks nothing outside the Stop hook, where a turn is still running', () => {
    const cost = summarise([response({ stopReason: 'tool_use' })]);
    assert.deepEqual(cost.warnings, []);
  });
});

const prompt = (content: unknown, extra: object = {}): string =>
  JSON.stringify({ type: 'user', message: { content }, ...extra });

const link = (prNumber: number): string =>
  JSON.stringify({ type: 'pr-link', prNumber });

const costState = (totalCostUSD: number): string =>
  JSON.stringify({ type: 'cost-state', totalCostUSD });

const sessionStart = (content: string): string =>
  JSON.stringify({
    type: 'attachment',
    attachment: { type: 'hook_success', hookEvent: 'SessionStart', content },
  });

describe('session-cost: what names a session', () => {
  it('takes the opening prompt as the session name, unwrapping a slash command', () => {
    const cost = summarise([
      prompt(
        '<command-message>handle</command-message>\n<command-name>/handle</command-name>\n<command-args>claude/a-branch</command-args>',
      ),
      prompt('a later thing'),
      response({ output: 1 }),
    ]);
    assert.equal(cost.openingPrompt, '/handle claude/a-branch');
  });

  it('skips the records that are not the operator talking', () => {
    const cost = summarise([
      prompt('skill boilerplate', { isMeta: true }),
      prompt([{ type: 'tool_result', content: 'ok' }]),
      prompt([{ type: 'text', text: 'a subagent brief' }], {
        isSidechain: true,
      }),
      prompt([{ type: 'text', text: 'the real prompt' }]),
      response({ output: 1 }),
    ]);
    assert.equal(cost.openingPrompt, 'the real prompt');
  });

  it('collects the PRs the session touched, deduplicated', () => {
    const cost = summarise([
      link(71),
      response({ output: 1 }),
      link(71),
      link(70),
    ]);
    assert.deepEqual(cost.prs, [70, 71]);
  });

  it('leaves both empty when the transcript says nothing about either', () => {
    const cost = summarise([response({ output: 1 })]);
    assert.equal(cost.openingPrompt, null);
    assert.deepEqual(cost.prs, []);
  });

  it('takes the session URL from the attribution reminder, not from prose quoting another', () => {
    const cost = summarise([
      prompt('see https://claude.ai/code/session_01QUOTEDinACOMMENT'),
      JSON.stringify({
        type: 'attachment',
        attachment: { type: 'remote_session_change' },
        rendered: 'Claude-Session: https://claude.ai/code/session_01REALone',
      }),
      response({ output: 1 }),
    ]);
    assert.equal(cost.url, 'https://claude.ai/code/session_01REALone');
  });

  it('takes the operator from the first SessionStart that resolved a person', () => {
    const cost = summarise([
      sessionStart(
        'session-start: the operator is Vova Zakharov (@vzakharov) — the GitHub token in this session is that user’s own.',
      ),
      response({ output: 1 }),
      // A resume runs the hook again; the session stays whose it was.
      sessionStart(
        'session-start: the operator is @someone-else — the GitHub token in this session is that user’s own.',
      ),
    ]);
    assert.equal(cost.operator, 'vzakharov');
  });

  it('leaves the operator null when the hook named nobody', () => {
    const cost = summarise([
      sessionStart(
        'session-start: the GitHub token in this session belongs to a bot, not a person.',
      ),
      response({ output: 1 }),
    ]);
    assert.equal(cost.operator, null);
  });

  it('keeps Claude Code’s own last word on what the session cost', () => {
    const cost = summarise([
      costState(1.5),
      response({ output: 1 }),
      costState(2.25),
    ]);
    assert.equal(cost.claudeCodeTotalUsd, 2.25);
  });
});
