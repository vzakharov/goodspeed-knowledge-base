import { z } from 'zod';

/** Which feature made a model call. `condense` rewrites a follow-up question into one that stands alone. */
export const USAGE_KINDS = ['chat', 'condense', 'embedding'] as const;

export const usageKindSchema = z.enum(USAGE_KINDS);

export type UsageKind = z.infer<typeof usageKindSchema>;

export const usageDaySchema = z.object({
  /** A UTC calendar day. */
  day: z.iso.date(),
  kind: usageKindSchema,
  provider: z.string(),
  model: z.string(),
  calls: z.int().min(0),
  /** Calls the provider reported no token counts for, so the totals leave them out. */
  unreportedCalls: z.int().min(0),
  promptTokens: z.int().min(0),
  completionTokens: z.int().min(0),
});

export type UsageDay = z.infer<typeof usageDaySchema>;

export const USAGE_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The UTC day `daysBefore` days before `end`'s, as `day` spells it. */
function dayBefore(end: Date, daysBefore: number): string {
  return new Date(end.getTime() - daysBefore * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The `USAGE_WINDOW_DAYS` UTC days ending on `end`'s, oldest first. */
export function usageWindow(end: Date): string[] {
  return Array.from({ length: USAGE_WINDOW_DAYS }, (_, index) =>
    dayBefore(end, USAGE_WINDOW_DAYS - 1 - index),
  );
}

export function usageWindowStart(end: Date): string {
  return dayBefore(end, USAGE_WINDOW_DAYS - 1);
}

export const usageReportSchema = z.object({
  /** Newest day first. */
  days: z.array(usageDaySchema),
});

export type UsageReport = z.infer<typeof usageReportSchema>;
