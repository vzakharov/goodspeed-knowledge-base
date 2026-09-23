// What a person recognises a session by, read out of its transcript. Separate
// from the pricing beside it because none of it is arithmetic: these are the
// records the file happens to carry that answer "which session was that", and
// they change with the Claude Code version rather than with the rate table.
//
// `.claude/rules/costs.md` § "What names a session" carries why a session needs
// standing in for at all.

import { z } from 'zod';

// Every record in the file carries a `type`, and a handful of kinds are read
// for something other than their usage. Parsing for it rather than narrowing by
// hand keeps one shape declared in one place, as every other record shape here
// is.
const KindSchema = z.object({ type: z.string() });

export const kindOf = (record: unknown): string | undefined =>
  KindSchema.safeParse(record).data?.type;

// Claude Code's own running cost for the session, rewritten as the session
// goes. The last one in the file is its final word on it.
const CostStateSchema = z.object({ totalCostUSD: z.number() });

export const costStateOf = (record: unknown): number | undefined =>
  CostStateSchema.safeParse(record).data?.totalCostUSD;

// Claude Code records every PR it opens or refreshes, which is what groups the
// several sessions one PR takes.
const PrLinkSchema = z.object({ prNumber: z.number() });

export const prNumberOf = (record: unknown): number | undefined =>
  PrLinkSchema.safeParse(record).data?.prNumber;

// The session's web URL reaches the transcript only as prose, inside the
// attribution reminder the harness re-sends whenever the remote session
// changes. Matching that one record's text is narrower than scanning the file,
// where any quoted commit trailer carries a session URL too — usually another
// session's. Which is why this takes the record's raw line: the URL is in the
// reminder's body, not in a field.
const AttachmentKindSchema = z.object({
  attachment: z.object({ type: z.string() }),
});

const SESSION_URL = /https:\/\/claude\.ai\/code\/session_[\dA-Za-z]+/;

export const sessionUrlIn = (
  record: unknown,
  line: string,
): string | undefined =>
  AttachmentKindSchema.safeParse(record).data?.attachment.type ===
  'remote_session_change'
    ? SESSION_URL.exec(line)?.[0]
    : undefined;

// The harness writes no session title, so the opening prompt stands in for one,
// unwrapped from the envelope a slash command arrives in: `/handle <branch>` is
// what a person would call that session.
const PromptRecordSchema = z.object({
  isMeta: z.boolean().nullable().optional(),
  isSidechain: z.boolean().optional(),
  message: z.object({
    content: z.union([
      z.string(),
      z.array(z.object({ type: z.string(), text: z.string().optional() })),
    ]),
  }),
});

const COMMAND_ENVELOPE =
  /<command-name>([^<]*)<\/command-name>(?:\s*<command-args>([^<]*)<\/command-args>)?/;

const OPENING_PROMPT_LIMIT = 160;

export const promptTextOf = (record: unknown): string | undefined => {
  const parsed = PromptRecordSchema.safeParse(record);
  if (!parsed.success) return undefined;
  const { isMeta, isSidechain, message } = parsed.data;
  if (isMeta === true || isSidechain === true) return undefined;
  const raw =
    typeof message.content === 'string'
      ? message.content
      : // A tool result is a `user` record too, and carries no text block.
        message.content.find((block) => block.type === 'text')?.text;
  if (raw === undefined) return undefined;

  const envelope = COMMAND_ENVELOPE.exec(raw);
  const text = (
    envelope === null
      ? raw
      : `${envelope[1] ?? ''} ${envelope[2] ?? ''}`.trimEnd()
  )
    .replaceAll(/\s+/g, ' ')
    .trim();
  if (text === '') return undefined;
  return text.length > OPENING_PROMPT_LIMIT
    ? `${text.slice(0, OPENING_PROMPT_LIMIT)}…`
    : text;
};
