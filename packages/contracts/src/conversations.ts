import { z } from 'zod';

import {
  idSchema,
  nonBlank,
  timestampSchema,
  timestampsShape,
} from './fields.ts';

export const conversationSchema = z.object({
  id: idSchema,
  title: z.string(),
  ...timestampsShape,
});

export type Conversation = z.infer<typeof conversationSchema>;

export const conversationListSchema = z.object({
  conversations: z.array(conversationSchema),
});

export type ConversationList = z.infer<typeof conversationListSchema>;

export const CONVERSATION_TITLE_LENGTH = 80;

export const conversationInputSchema = z.object({
  title: z.string().trim().min(1).max(CONVERSATION_TITLE_LENGTH),
});

export type ConversationInput = z.infer<typeof conversationInputSchema>;

/**
 * A conversation's title from the question that opened it: the first line,
 * whitespace collapsed, cut at a word boundary to fit.
 */
export function conversationTitleFrom(question: string) {
  const line = (question.trim().split('\n')[0] ?? '').replaceAll(/\s+/g, ' ');

  if (line.length <= CONVERSATION_TITLE_LENGTH) {
    return line;
  }

  const cut = line.slice(0, CONVERSATION_TITLE_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

/**
 * One chunk an answer drew on, as it read when the answer was written. `index`
 * is the `[n]` the answer cites it by.
 */
export const citationSchema = z.object({
  index: z.int().min(1),
  documentId: idSchema,
  documentTitle: z.string(),
  headingPath: z.array(z.string()),
  chunkIndex: z.int().min(0),
  excerpt: z.string(),
  similarity: z.number(),
});

export type Citation = z.infer<typeof citationSchema>;

export const MESSAGE_ROLES = ['user', 'assistant'] as const;

export const messageRoleSchema = z.enum(MESSAGE_ROLES);

export const messageSchema = z.object({
  id: idSchema,
  role: messageRoleSchema,
  content: z.string(),
  citations: z.array(citationSchema),
  /** The chat model that wrote an assistant turn; null on the reader's own. */
  model: z.string().nullable(),
  createdAt: timestampSchema,
});

export type Message = z.infer<typeof messageSchema>;

export const conversationDetailSchema = conversationSchema.extend({
  messages: z.array(messageSchema),
});

export type ConversationDetail = z.infer<typeof conversationDetailSchema>;

export const QUESTION_LENGTH = 4000;

export const questionInputSchema = z.object({
  content: nonBlank(QUESTION_LENGTH),
});

export type QuestionInput = z.infer<typeof questionInputSchema>;

/**
 * What an answer's `text/event-stream` carries, one JSON object per `data:`
 * line: the answer's text in `delta`s, then exactly one of `done` — both turns
 * as stored — or `error`.
 */
export const answerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), text: z.string() }),
  z.object({
    type: z.literal('done'),
    question: messageSchema,
    answer: messageSchema,
  }),
  z.object({ type: z.literal('error'), message: z.string() }),
]);

export type AnswerEvent = z.infer<typeof answerEventSchema>;
