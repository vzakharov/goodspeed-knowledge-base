'use client';

import { Grid, Loader, Title } from '@mantine/core';
import { Suspense } from 'react';

import { useSearchParam } from '@/shared/lib/search-param';
import { PageShell, Section } from '@/shared/ui';

import { useAsking } from '../model/use-asking';
import { ConversationList } from './conversation-list';
import { NewConversation, Thread } from './thread';

/**
 * The conversation is the `c` search parameter, so each has a URL. On a narrow
 * screen an open conversation takes the width, and the list is a link away.
 */
function Chat() {
  const conversationId = useSearchParam('c');
  const asking = useAsking();

  return (
    <Grid gap="xl">
      <Grid.Col
        span={{ base: 12, sm: 4 }}
        visibleFrom={conversationId === null ? undefined : 'sm'}
      >
        <ConversationList current={conversationId} />
      </Grid.Col>
      <Grid.Col span={{ base: 12, sm: 8 }}>
        {conversationId === null ? (
          <NewConversation {...{ asking }} />
        ) : (
          <Thread key={conversationId} id={conversationId} {...{ asking }} />
        )}
      </Grid.Col>
    </Grid>
  );
}

export function ChatPage() {
  return (
    <PageShell>
      <Section id="chat">
        <Title order={1}>Chat</Title>
        <Suspense fallback={<Loader size="sm" />}>
          <Chat />
        </Suspense>
      </Section>
    </PageShell>
  );
}
