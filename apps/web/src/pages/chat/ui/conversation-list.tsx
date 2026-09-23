import { Loader, Stack, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { pick } from '@/shared/lib/collections';
import { ErrorAlert, InternalButton, InternalLink } from '@/shared/ui';

import { conversationQueries } from '../api/conversations';
import { chatHref } from '../lib/chat-href';

const ICON_SIZE = 16;

const updatedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

type ConversationListProps = { current: string | null };

export function ConversationList({ current }: ConversationListProps) {
  const list = useQuery(conversationQueries.list());

  return (
    <Stack gap="md">
      <InternalButton
        href={chatHref(null)}
        variant="default"
        leftSection={<Plus size={ICON_SIZE} />}
      >
        New conversation
      </InternalButton>
      {list.isPending && <Loader size="sm" />}
      {list.isError && (
        <ErrorAlert
          title="The conversations did not load"
          {...pick(list, 'error')}
        />
      )}
      {list.data?.conversations.length === 0 && (
        <Text size="sm" c="dimmed">
          No conversations yet.
        </Text>
      )}
      <Stack component="nav" aria-label="Conversations" gap="sm">
        {list.data?.conversations.map(({ id, title, updatedAt }) => {
          const selected = id === current;

          return (
            <Stack key={id} gap={0}>
              <InternalLink
                href={chatHref(id)}
                size="sm"
                fw={selected ? 700 : 400}
                aria-current={selected ? 'page' : undefined}
                lineClamp={2}
              >
                {title}
              </InternalLink>
              <Text size="xs" c="dimmed">
                {updatedFormat.format(new Date(updatedAt))}
              </Text>
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
