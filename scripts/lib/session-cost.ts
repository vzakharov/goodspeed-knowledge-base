// Prices a Claude Code transcript at Claude API rates. `.claude/rules/costs.md`
// carries the transcript's shape and what the totals leave out.

import { z } from 'zod';

import {
  costStateOf,
  kindOf,
  prNumberOf,
  promptTextOf,
  sessionUrlIn,
} from './session-identity.ts';

const RateSet = z.object({
  input: z.number(),
  output: z.number(),
  cache_write_5m: z.number(),
  cache_write_1h: z.number(),
  cache_read: z.number(),
});

const PriceTableSchema = z.object({
  as_of: z.string(),
  rates: z.record(z.string(), RateSet),
});

type Rates = z.infer<typeof RateSet>;
export type PriceTable = z.infer<typeof PriceTableSchema>;

export const parsePrices = (json: string): PriceTable =>
  PriceTableSchema.parse(JSON.parse(json));

const UsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().nullish(),
  cache_read_input_tokens: z.number().nullish(),
  speed: z.string().nullish(),
  output_tokens_details: z
    .object({ thinking_tokens: z.number().nullish() })
    .nullish(),
  cache_creation: z
    .object({
      ephemeral_5m_input_tokens: z.number().nullish(),
      ephemeral_1h_input_tokens: z.number().nullish(),
    })
    .nullish(),
});

const ResponseRecordSchema = z.object({
  sessionId: z.string().optional(),
  gitBranch: z.string().optional(),
  cwd: z.string().optional(),
  timestamp: z.string().optional(),
  isSidechain: z.boolean().optional(),
  message: z.object({ id: z.string(), model: z.string(), usage: UsageSchema }),
});

const TokenTallySchema = z.object({
  inputTokens: z.number(),
  cacheWrite5mTokens: z.number(),
  cacheWrite1hTokens: z.number(),
  cacheReadTokens: z.number(),
  outputTokens: z.number(),
  thinkingTokens: z.number(),
});

export const BilledSchema = z.object({
  responses: z.number(),
  costUsd: z.number(),
});

const TallySchema = TokenTallySchema.extend(BilledSchema.shape);

type TokenTally = z.infer<typeof TokenTallySchema>;
type Billed = z.infer<typeof BilledSchema>;
type Tally = TokenTally & Billed;

const SessionCostSchema = z.object({
  sessionId: z.string(),
  branch: z.string().nullable(),
  cwd: z.string().nullable(),
  // The defaults let a row that predates its field still parse.
  name: z.string().nullable().default(null),
  openingPrompt: z.string().nullable().default(null),
  prs: z.array(z.number()).default([]),
  url: z.string().nullable().default(null),
  firstResponseAt: z.string().nullable(),
  lastResponseAt: z.string().nullable(),
  pricesAsOf: z.string(),
  claudeCodeTotalUsd: z.number().nullable().default(null),
  total: TallySchema,
  ownTurns: TallySchema,
  subagents: TallySchema,
  byRate: z.record(z.string(), TallySchema),
  warnings: z.array(z.string()),
});

export type SessionCost = z.infer<typeof SessionCostSchema>;

export const parseSessionCost = (json: string): SessionCost =>
  SessionCostSchema.parse(JSON.parse(json));

// `thinkingTokens` sit inside `outputTokens` already, so billing them charges twice.
const BILLED_FIELDS = [
  'inputTokens',
  'cacheWrite5mTokens',
  'cacheWrite1hTokens',
  'cacheReadTokens',
  'outputTokens',
] as const satisfies ReadonlyArray<keyof TokenTally>;

const BILLED_AT = {
  inputTokens: 'input',
  cacheWrite5mTokens: 'cache_write_5m',
  cacheWrite1hTokens: 'cache_write_1h',
  cacheReadTokens: 'cache_read',
  outputTokens: 'output',
} as const satisfies Record<(typeof BILLED_FIELDS)[number], keyof Rates>;

const TOKEN_FIELDS = [
  ...BILLED_FIELDS,
  'thinkingTokens',
] as const satisfies ReadonlyArray<keyof TokenTally>;

const emptyTally = (): Tally => ({
  inputTokens: 0,
  cacheWrite5mTokens: 0,
  cacheWrite1hTokens: 0,
  cacheReadTokens: 0,
  outputTokens: 0,
  thinkingTokens: 0,
  responses: 0,
  costUsd: 0,
});

const addInto = (target: Tally, source: Tally): void => {
  for (const field of TOKEN_FIELDS) target[field] += source[field];
  target.responses += source.responses;
  target.costUsd += source.costUsd;
};

const costOf = (tokens: TokenTally, rates: Rates): number => {
  let usd = 0;
  for (const field of BILLED_FIELDS)
    usd += (tokens[field] * rates[BILLED_AT[field]]) / 1e6;
  return usd;
};

const rateKey = (model: string, speed: string | null | undefined): string =>
  `${model}/${speed ?? 'standard'}`;

// Skipped rather than priced, so it warns instead of tripping the unpriced throw.
const SYNTHETIC_MODEL = '<synthetic>';

type Response = z.infer<typeof ResponseRecordSchema>;

const tokensOf = (response: Response, warnings: string[]): TokenTally => {
  const { id, usage } = response.message;
  const written = usage.cache_creation_input_tokens ?? 0;
  const split5m = usage.cache_creation?.ephemeral_5m_input_tokens ?? 0;
  const split1h = usage.cache_creation?.ephemeral_1h_input_tokens ?? 0;
  // A split that does not account for the whole write leaves the rest at the
  // API's own default TTL, and says so rather than rounding it away.
  const trustSplit = split5m + split1h === written;
  if (!trustSplit && written > 0)
    warnings.push(
      `${id}: cache_creation split (${split5m} + ${split1h}) does not account for ${written} written tokens; billed at the 5-minute rate`,
    );
  return {
    inputTokens: usage.input_tokens,
    cacheWrite5mTokens: trustSplit ? split5m : written,
    cacheWrite1hTokens: trustSplit ? split1h : 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
    thinkingTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
  };
};

// Prompts, attachments and tool results share the file and carry no usage, so
// only a record that looks like a billed response is held to the schema.
const isResponseRecord = (record: unknown): boolean =>
  typeof record === 'object' &&
  record !== null &&
  'message' in record &&
  typeof record.message === 'object' &&
  record.message !== null &&
  'usage' in record.message;

/** A session's main transcript and one file per subagent it spawned — all of it the session's spend. */
export type TranscriptSources = {
  main: string;
  subagents: readonly string[];
};

/** Throws on a `(model, speed)` pair the table cannot price, or a response record that does not parse. */
export const summariseTranscript = (
  sources: TranscriptSources,
  prices: PriceTable,
  fallbackSessionId: string,
): SessionCost => {
  const warnings: string[] = [];
  const seen = new Set<string>();
  const byRate: Record<string, Tally> = {};
  const total = emptyTally();
  const ownTurns = emptyTally();
  const subagents = emptyTally();
  const unpriced = new Set<string>();
  const timestamps: string[] = [];
  const prs = new Set<number>();
  let sessionId: string | undefined;
  let branch: string | undefined;
  let cwd: string | undefined;
  let openingPrompt: string | undefined;
  let url: string | undefined;
  let claudeCodeTotalUsd: number | undefined;

  // `delegated` files a subagent's own file as subagent spend, whatever its
  // records' `isSidechain` says.
  const scan = (jsonl: string, delegated: boolean): void => {
    for (const line of jsonl.split('\n')) {
      if (line.trim() === '') continue;
      const record: unknown = JSON.parse(line);

      const kind = kindOf(record);
      // The session's own identity, which only its own file describes.
      if (!delegated) {
        if (kind === 'pr-link') {
          const pr = prNumberOf(record);
          if (pr !== undefined) prs.add(pr);
          continue;
        }
        if (kind === 'user') {
          openingPrompt ??= promptTextOf(record);
          continue;
        }
        if (kind === 'cost-state') {
          // Last write wins: Claude Code rewrites this as the session goes.
          claudeCodeTotalUsd = costStateOf(record) ?? claudeCodeTotalUsd;
          continue;
        }
        if (kind === 'attachment') {
          url ??= sessionUrlIn(record, line);
          continue;
        }
      }

      if (!isResponseRecord(record)) continue;
      const response = ResponseRecordSchema.parse(record);
      // One record per content block, each carrying the whole response's usage.
      if (seen.has(response.message.id)) continue;
      seen.add(response.message.id);

      if (!delegated) {
        sessionId ??= response.sessionId;
        // Last write wins: a session that renames its branch mid-flight should
        // be filed under where its work ended up, not where it started.
        branch = response.gitBranch ?? branch;
        cwd = response.cwd ?? cwd;
      }
      if (response.timestamp !== undefined) timestamps.push(response.timestamp);

      const tokens = tokensOf(response, warnings);

      if (response.message.model === SYNTHETIC_MODEL) {
        const billable = BILLED_FIELDS.reduce(
          (sum, field) => sum + tokens[field],
          0,
        );
        if (billable > 0)
          warnings.push(
            `${response.message.id}: a ${SYNTHETIC_MODEL} record carries ${billable} billable tokens and was not priced`,
          );
        continue;
      }

      const key = rateKey(response.message.model, response.message.usage.speed);
      const rates = prices.rates[key];
      if (rates === undefined) {
        unpriced.add(key);
        continue;
      }

      const tally: Tally = {
        ...tokens,
        responses: 1,
        costUsd: costOf(tokens, rates),
      };
      addInto((byRate[key] ??= emptyTally()), tally);
      addInto(total, tally);
      addInto(
        delegated || response.isSidechain === true ? subagents : ownTurns,
        tally,
      );
    }
  };

  scan(sources.main, false);
  for (const delegated of sources.subagents) scan(delegated, true);

  if (unpriced.size > 0)
    throw new Error(
      `No rates for ${[...unpriced].toSorted().join(', ')} in the price table (as of ${prices.as_of}). Add them to .claude/costs/prices.json — a response counted as free is worse than no ledger at all.`,
    );

  const inOrder = timestamps.toSorted();
  return {
    sessionId: sessionId ?? fallbackSessionId,
    branch: branch ?? null,
    cwd: cwd ?? null,
    name: null,
    openingPrompt: openingPrompt ?? null,
    prs: [...prs].toSorted((a, b) => a - b),
    url: url ?? null,
    firstResponseAt: inOrder.at(0) ?? null,
    lastResponseAt: inOrder.at(-1) ?? null,
    pricesAsOf: prices.as_of,
    claudeCodeTotalUsd: claudeCodeTotalUsd ?? null,
    total,
    ownTurns,
    subagents,
    byRate,
    warnings,
  };
};
