import {
  answerEventSchema,
  type Conversation,
  type ConversationDetail,
  conversationDetailSchema,
  conversationListSchema,
  conversationSchema,
  conversationTitleFrom,
  type QuestionInput,
} from '@kb/contracts';
import { queryOptions } from '@tanstack/react-query';

import { api, queryClient } from '@/shared/api';
import { pick } from '@/shared/lib/collections';
import { readEvents } from '@/shared/lib/event-stream';

/** Every conversation query sits under this key. */
const CONVERSATIONS = ['conversations'] as const;

export const conversationQueries = {
  list: () =>
    queryOptions({
      queryKey: [...CONVERSATIONS, 'list'],
      queryFn: async ({ signal }) =>
        api.request('/conversations', conversationListSchema, { signal }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...CONVERSATIONS, 'detail', id],
      queryFn: async ({ signal }) =>
        api.request(`/conversations/${id}`, conversationDetailSchema, {
          signal,
        }),
    }),
};

async function refreshList(): Promise<void> {
  await queryClient.invalidateQueries(
    pick(conversationQueries.list(), 'queryKey'),
  );
}

/** A new, empty conversation, titled after the question that opens it. */
export async function startConversation(
  question: string,
): Promise<Conversation> {
  const conversation = await api.request('/conversations', conversationSchema, {
    method: 'POST',
    json: { title: conversationTitleFrom(question) },
  });
  queryClient.setQueryData<ConversationDetail>(
    conversationQueries.detail(conversation.id).queryKey,
    { ...conversation, messages: [] },
  );
  await refreshList();

  return conversation;
}

type Question = QuestionInput & {
  signal: AbortSignal;
  /** Each piece of the answer's text, as the model writes it. */
  onDelta: (text: string) => void;
};

/**
 * Asks a question and streams the answer. Resolves once the API has stored
 * both turns, which by then are in the conversation's cached detail, so the
 * thread shows them without a refetch; rejects on the stream's `error` event.
 */
export async function askQuestion(
  conversationId: string,
  { content, signal, onDelta }: Question,
): Promise<void> {
  const response = await api.send(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    json: { content },
    signal,
  });
  if (response.body === null) throw new Error('The answer came with no body');

  for await (const event of readEvents(response.body, answerEventSchema)) {
    if (event.type === 'delta') {
      onDelta(event.text);
    } else if (event.type === 'error') {
      throw new Error(event.message);
    } else {
      queryClient.setQueryData<ConversationDetail>(
        conversationQueries.detail(conversationId).queryKey,
        (detail) =>
          detail && {
            ...detail,
            messages: [...detail.messages, event.question, event.answer],
          },
      );
      await refreshList();

      return;
    }
  }

  throw new Error('The answer stopped before it was finished');
}

export async function deleteConversation(id: string): Promise<void> {
  await api.send(`/conversations/${id}`, { method: 'DELETE' });
  queryClient.removeQueries(pick(conversationQueries.detail(id), 'queryKey'));
  await refreshList();
}
