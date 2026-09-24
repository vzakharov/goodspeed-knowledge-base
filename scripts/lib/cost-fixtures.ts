// What the cost ledger's tests write out: a one-model rate table, an assistant
// record in the transcript's shape, and a row in the current one.

import type { SessionCost } from './session-cost.ts';

export const PRICES = JSON.stringify({
  as_of: '2026-01-01',
  rates: {
    'test-model/standard': {
      input: 1,
      output: 10,
      cache_write_5m: 2,
      cache_write_1h: 4,
      cache_read: 0.5,
    },
  },
});

export const assistantRecord = (
  id: string,
  stopReason = 'end_turn',
  output = 1,
): string =>
  JSON.stringify({
    type: 'assistant',
    sessionId: 'sess',
    timestamp: '2026-03-04T05:06:07.000Z',
    message: {
      id,
      model: 'test-model',
      stop_reason: stopReason,
      usage: { input_tokens: 1, output_tokens: output, speed: 'standard' },
    },
  });

export const tally = (costUsd: number) => ({
  inputTokens: 0,
  cacheWrite5mTokens: 0,
  cacheWrite1hTokens: 0,
  cacheReadTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
  responses: 1,
  costUsd,
});

export const row = (overrides: Partial<SessionCost> = {}): SessionCost => ({
  sessionId: 'sess',
  branch: 'a-branch',
  cwd: null,
  openingPrompt: null,
  prs: [],
  url: null,
  operator: null,
  firstResponseAt: '2026-03-04T05:06:07.000Z',
  lastResponseAt: '2026-03-04T06:06:07.000Z',
  pricesAsOf: '2026-01-01',
  total: tally(1),
  ownTurns: tally(1),
  subagents: tally(0),
  byRate: {},
  warnings: [],
  claudeCodeTotalUsd: null,
  ...overrides,
});
