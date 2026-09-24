import { z } from 'zod';

import { BilledSchema, type SessionCost } from './session-cost.ts';

const BucketSchema = BilledSchema.extend({ sessions: z.number() });

const TotalsSchema = BucketSchema.extend({
  byMonth: z.record(z.string(), BucketSchema),
  byWeek: z.record(z.string(), BucketSchema),
  byDay: z.record(z.string(), BucketSchema),
  byBranch: z.record(z.string(), BucketSchema),
  byOperator: z.record(z.string(), BucketSchema),
});

export type Bucket = z.infer<typeof BucketSchema>;
export type Totals = z.infer<typeof TotalsSchema>;

/**
 * The ISO-8601 week a UTC day falls in, `<year>-W<nn>`. The year is the one
 * owning that week's Thursday, so the last days of December can read as week 01
 * of the next year — the scheme working, not a rounding error.
 */
export const isoWeek = (day: Date): string => {
  const thursday = new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
  );
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(
    ((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7,
  );
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const emptyBucket = (): Bucket => ({ sessions: 0, responses: 0, costUsd: 0 });

const addInto = (bucket: Bucket, row: SessionCost): void => {
  bucket.sessions += 1;
  bucket.responses += row.total.responses;
  bucket.costUsd += row.total.costUsd;
};

const into = (
  buckets: Record<string, Bucket>,
  key: string,
  row: SessionCost,
): void => {
  addInto((buckets[key] ??= emptyBucket()), row);
};

// A sum of floats carries digits no price has, and the report is read by people.
const cents = (usd: number): number => Math.round(usd * 1e4) / 1e4;

const rounded = (bucket: Bucket): Bucket => ({
  ...bucket,
  costUsd: cents(bucket.costUsd),
});

const roundedAll = (buckets: Record<string, Bucket>): Record<string, Bucket> =>
  Object.fromEntries(
    Object.entries(buckets)
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([key, bucket]) => [key, rounded(bucket)]),
  );

export const branchLabel = (row: SessionCost): string =>
  [row.branch ?? '(no branch)', ...row.prs.map((pr) => `#${pr}`)].join(' ');

export const operatorLabel = (row: SessionCost): string =>
  row.operator === null ? '(unknown)' : `@${row.operator}`;

/**
 * Files a session under the day it **started**, as its row's month is, so one
 * running past midnight stays whole. A row with no priced response lands in the
 * grand total, its branch and its operator alone.
 */
export const totalsOf = (rows: readonly SessionCost[]): Totals => {
  const byMonth: Record<string, Bucket> = {};
  const byWeek: Record<string, Bucket> = {};
  const byDay: Record<string, Bucket> = {};
  const byBranch: Record<string, Bucket> = {};
  const byOperator: Record<string, Bucket> = {};
  const grand = emptyBucket();

  for (const row of rows) {
    addInto(grand, row);
    into(byBranch, branchLabel(row), row);
    into(byOperator, operatorLabel(row), row);
    const startedAt = row.firstResponseAt;
    if (startedAt === null) continue;
    const day = new Date(startedAt);
    into(byMonth, startedAt.slice(0, 7), row);
    into(byWeek, isoWeek(day), row);
    into(byDay, startedAt.slice(0, 10), row);
  }

  return {
    ...rounded(grand),
    byMonth: roundedAll(byMonth),
    byWeek: roundedAll(byWeek),
    byDay: roundedAll(byDay),
    byBranch: roundedAll(byBranch),
    byOperator: roundedAll(byOperator),
  };
};
