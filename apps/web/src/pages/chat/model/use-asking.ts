import type { QuestionInput } from '@kb/contracts';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { pick } from '@/shared/lib/collections';

import { askQuestion, startConversation } from '../api/conversations';
import { chatHref } from '../lib/chat-href';

export type Exchange = QuestionInput & {
  /** `null` until the question's new conversation exists. */
  conversationId: string | null;
};

/** A question the API has not stored yet, and as much of its answer as has arrived. */
export type Pending = Exchange & { received: string };

const STOPPED =
  'Stopped. Nothing was saved, so the question is not in the history.';

/**
 * One question at a time, from sending to stored. A question without a
 * conversation starts one and moves the address onto it, which is why this
 * lives above the component reading the address: the stream outlives the
 * change.
 *
 * `pending` outlasts a failure, so the thread can show what failed and ask it
 * again; leaving the chat stops the answer, which the API then does not store.
 */
export function useAsking() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      cancelRef.current?.abort();
    },
    [],
  );

  const asking = useMutation({
    mutationFn: async ({ conversationId, content }: Exchange) => {
      const cancel = new AbortController();
      cancelRef.current = cancel;
      setPending({ conversationId, content, received: '' });

      try {
        const id = conversationId ?? (await startConversation(content)).id;
        if (conversationId === null) {
          setPending((was) => was && { ...was, conversationId: id });
          router.replace(chatHref(id));
        }

        await askQuestion(id, {
          content,
          ...pick(cancel, 'signal'),
          onDelta: (text) => {
            setPending(
              (was) => was && { ...was, received: was.received + text },
            );
          },
        });
      } catch (error) {
        throw cancel.signal.aborted ? new Error(STOPPED) : error;
      }
    },
    onSuccess: () => {
      setPending(null);
    },
  });

  return {
    pending,
    busy: asking.isPending,
    ...pick(asking, 'error'),
    ask: (exchange: Exchange) => {
      asking.mutate(exchange);
    },
    stop: () => {
      cancelRef.current?.abort();
    },
  };
}

export type Asking = ReturnType<typeof useAsking>;
