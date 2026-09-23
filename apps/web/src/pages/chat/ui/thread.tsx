import { Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { pick } from '@/shared/lib/collections';
import type { WithId } from '@/shared/typings';
import { ConfirmDelete, ErrorAlert, InternalLink } from '@/shared/ui';

import { conversationQueries, deleteConversation } from '../api/conversations';
import { chatHref } from '../lib/chat-href';
import type { Asking, Exchange, Pending } from '../model/use-asking';
import { Composer } from './composer';
import { Answer, Question, Turn } from './turns';

type WithAsking = { asking: Asking };

function PendingTurn({
  pending,
  asking: { error, ask },
}: WithAsking & { pending: Pending }) {
  const status =
    error === null ? (
      pending.received === '' && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Searching your documents…
          </Text>
        </Group>
      )
    ) : (
      <Stack gap="xs" align="flex-start">
        <ErrorAlert title="The question was not answered" {...{ error }} />
        <Button
          variant="default"
          size="xs"
          onClick={() => {
            ask(pick(pending, 'conversationId', 'content'));
          }}
        >
          Ask again
        </Button>
      </Stack>
    );

  return (
    <>
      <Question {...pick(pending, 'content')} />
      <Answer content={pending.received} {...{ status }} />
    </>
  );
}

type ThreadEndProps = WithAsking &
  Pick<Exchange, 'conversationId'> & {
    /** How many turns sit above, so a new one scrolls into view. */
    turns: number;
  };

function ThreadEnd({ conversationId, turns, asking }: ThreadEndProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const pending =
    asking.pending?.conversationId === conversationId ? asking.pending : null;
  const asked = pending?.content;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [turns, asked]);

  return (
    <>
      {pending !== null && <PendingTurn {...{ pending, asking }} />}
      <div ref={endRef}>
        <Composer
          {...pick(asking, 'busy')}
          stoppable={asking.busy && pending !== null}
          onAsk={(content) => {
            asking.ask({ conversationId, content });
          }}
          onStop={asking.stop}
        />
      </div>
    </>
  );
}

export function NewConversation({ asking }: WithAsking) {
  return (
    <Stack gap="lg">
      <Title order={2}>New conversation</Title>
      <Text c="dimmed">
        Ask anything your documents can answer. Each answer cites the passages
        it draws on, and the conversation is kept for when you come back.
      </Text>
      <ThreadEnd conversationId={null} turns={0} {...{ asking }} />
    </Stack>
  );
}

export function Thread({ id, asking }: WithId & WithAsking) {
  const conversation = useQuery(conversationQueries.detail(id));
  const router = useRouter();

  if (conversation.isPending) return <Loader size="sm" />;
  if (conversation.isError) {
    return (
      <ErrorAlert
        title="The conversation did not load"
        {...pick(conversation, 'error')}
      />
    );
  }

  const { title, messages } = conversation.data;

  return (
    <Stack gap="lg">
      <InternalLink href={chatHref(null)} size="sm" hiddenFrom="sm">
        ← Conversations
      </InternalLink>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={2}>{title}</Title>
        <ConfirmDelete
          title="Delete this conversation?"
          remove={async () => deleteConversation(id)}
          onRemoved={() => {
            router.replace(chatHref(null));
          }}
        >
          “{title}” and every answer in it are deleted. The documents it cites
          stay. This cannot be undone.
        </ConfirmDelete>
      </Group>
      {messages.map((message) => (
        <Turn key={message.id} {...{ message }} />
      ))}
      <ThreadEnd conversationId={id} turns={messages.length} {...{ asking }} />
    </Stack>
  );
}
