// What a person recognises a session by, read out of its transcript — kept
// apart from the pricing because these records change with the Claude Code
// version, not with the rate table. `.claude/rules/costs.md` § "What names a
// session" carries what each field stands in for.

import { z } from 'zod';

const KindSchema = z.object({ type: z.string() });

export const kindOf = (record: unknown): string | undefined =>
  KindSchema.safeParse(record).data?.type;

const CostStateSchema = z.object({ totalCostUSD: z.number() });

export const costStateOf = (record: unknown): number | undefined =>
  CostStateSchema.safeParse(record).data?.totalCostUSD;

const PrLinkSchema = z.object({ prNumber: z.number() });

export const prNumberOf = (record: unknown): number | undefined =>
  PrLinkSchema.safeParse(record).data?.prNumber;

// Takes the raw line because the URL is in the reminder's body, not in a field.
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

const SessionStartOutputSchema = z.object({
  attachment: z.object({
    hookEvent: z.literal('SessionStart'),
    content: z.string(),
  }),
});

// `.claude/hooks/operator-voice.sh` prints `Name (@handle)` or a bare `@handle`,
// already lowercased, and only this phrasing when it resolved a person: the
// lines it prints for a bot's token or an unreachable `gh` do not match.
const OPERATOR_LINE =
  /^session-start: the operator is (?:[^\n]* \()?@([\da-z-]+)\)? — the GitHub token/;

export const operatorOf = (record: unknown): string | undefined => {
  const content =
    SessionStartOutputSchema.safeParse(record).data?.attachment.content;
  return content === undefined ? undefined : OPERATOR_LINE.exec(content)?.[1];
};

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
