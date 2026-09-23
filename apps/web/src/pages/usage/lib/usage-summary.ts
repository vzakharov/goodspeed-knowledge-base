import { type UsageDay, type UsageKind, usageWindow } from '@kb/contracts';

type Counted = Pick<UsageDay, 'promptTokens' | 'completionTokens'>;

type KindTokens = Record<UsageKind, number>;

/** One UTC day, every kind present, a kind with no calls at zero. */
export type DailyUsage = Pick<UsageDay, 'day'> & {
  byKind: KindTokens;
  total: number;
};

export type KindSummary = Pick<UsageDay, 'calls' | 'unreportedCalls'> & {
  tokens: number;
};

function tokensOf({ promptTokens, completionTokens }: Counted): number {
  return promptTokens + completionTokens;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * The report's window. It ends on the later of `now`'s UTC day and the newest
 * day reported, so a reader's clock running behind the API's still shows
 * every reported day.
 */
function windowDays(days: readonly UsageDay[], now: Date): string[] {
  let end = now;
  for (const { day } of days) {
    const date = new Date(day);
    if (date > end) end = date;
  }

  return usageWindow(end);
}

/** Tokens per day of the window, every day present, a day without calls at zero. */
export function dailyUsage(days: readonly UsageDay[], now: Date): DailyUsage[] {
  const byDay = new Map<string, KindTokens>(
    windowDays(days, now).map((day) => [
      day,
      { chat: 0, condense: 0, embedding: 0 },
    ]),
  );
  for (const row of days) {
    const byKind = byDay.get(row.day);
    if (byKind !== undefined) byKind[row.kind] += tokensOf(row);
  }

  return Array.from(byDay, ([day, byKind]) => ({
    day,
    byKind,
    total: sum(Object.values(byKind)),
  }));
}

export function kindSummaries(
  days: readonly UsageDay[],
): Record<UsageKind, KindSummary> {
  const empty = (): KindSummary => ({
    calls: 0,
    unreportedCalls: 0,
    tokens: 0,
  });
  const summaries = { chat: empty(), condense: empty(), embedding: empty() };
  for (const row of days) {
    const summary = summaries[row.kind];
    summary.calls += row.calls;
    summary.unreportedCalls += row.unreportedCalls;
    summary.tokens += tokensOf(row);
  }

  return summaries;
}
