import { USAGE_WINDOW_DAYS, type UsageDay } from '@kb/contracts';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { dailyUsage, kindSummaries } from './usage-summary.ts';

const NOW = new Date('2026-09-23T15:00:00Z');

function row(overrides: Partial<UsageDay>): UsageDay {
  return {
    day: '2026-09-23',
    kind: 'chat',
    provider: 'openai',
    model: 'gpt-5-mini',
    calls: 1,
    unreportedCalls: 0,
    promptTokens: 100,
    completionTokens: 20,
    ...overrides,
  };
}

describe('dailyUsage', () => {
  it('spans the window, oldest first, ending on the UTC day', () => {
    const daily = dailyUsage([], NOW);

    assert.equal(daily.length, USAGE_WINDOW_DAYS);
    assert.equal(daily.at(-1)?.day, '2026-09-23');
    assert.equal(daily[0]?.day, '2026-08-25');
    assert.ok(daily.every(({ total }) => total === 0));
  });

  it('adds prompt and completion tokens per kind, across models', () => {
    const daily = dailyUsage(
      [
        row({}),
        row({ model: 'llama-3.3-70b', provider: 'groq', promptTokens: 5 }),
        row({ kind: 'embedding', promptTokens: 300, completionTokens: 0 }),
        row({ day: '2026-09-22', kind: 'condense', promptTokens: 40 }),
      ],
      NOW,
    );

    assert.deepEqual(daily.at(-1), {
      day: '2026-09-23',
      byKind: { chat: 145, condense: 0, embedding: 300 },
      total: 445,
    });
    assert.deepEqual(daily.at(-2)?.byKind, {
      chat: 0,
      condense: 60,
      embedding: 0,
    });
  });

  it('ends on a reported day ahead of the reader’s clock', () => {
    const daily = dailyUsage([row({ day: '2026-09-24' })], NOW);

    assert.equal(daily.length, USAGE_WINDOW_DAYS);
    assert.equal(daily.at(-1)?.total, 120);
  });
});

describe('kindSummaries', () => {
  it('totals calls, unreported calls and tokens per kind', () => {
    const summaries = kindSummaries([
      row({ calls: 2 }),
      row({ day: '2026-09-01', calls: 3, unreportedCalls: 1 }),
    ]);

    assert.deepEqual(summaries.chat, {
      calls: 5,
      unreportedCalls: 1,
      tokens: 240,
    });
    assert.deepEqual(summaries.embedding, {
      calls: 0,
      unreportedCalls: 0,
      tokens: 0,
    });
  });
});
