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

export const usageReportSchema = z.object({
  /** Newest day first. */
  days: z.array(usageDaySchema),
});

export type UsageReport = z.infer<typeof usageReportSchema>;
