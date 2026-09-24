'use client';

import { Box, Loader, Title } from '@mantine/core';
import { Suspense } from 'react';

import { useSearchParam } from '@/shared/lib/search-param';
import { PageShell, Section } from '@/shared/ui';

import { useAsking } from '../model/use-asking';
import classes from './chat-page.module.scss';
import { ConversationList } from './conversation-list';
import { NewConversation, Thread } from './thread';

// `chat-page.module.scss` reserves the sidebar's width from the same breakpoint.
const SIDEBAR_FROM = 'lg';

/**
 * The conversation is the `c` search parameter, so each has a URL. On a wide
 * screen the list is a sidebar at the screen's edge and the thread keeps the
 * reading width every page has; on a narrow one an open conversation takes the
 * width, and the list is a link away.
 */
function Chat() {
  const conversationId = useSearchParam('c');
  const asking = useAsking();

  return (
    <>
      <Box
        component="aside"
        className={classes['sidebar']}
        visibleFrom={SIDEBAR_FROM}
      >
        <ConversationList current={conversationId} />
      </Box>
      {conversationId === null ? (
        <>
          <Box hiddenFrom={SIDEBAR_FROM}>
            <ConversationList current={null} />
          </Box>
          <NewConversation {...{ asking }} />
        </>
      ) : (
        <Thread key={conversationId} id={conversationId} {...{ asking }} />
      )}
    </>
  );
}

export function ChatPage() {
  return (
    <Box className={classes['content']}>
      <PageShell>
        <Section id="chat">
          <Title order={1}>Chat</Title>
          <Suspense fallback={<Loader size="sm" />}>
            <Chat />
          </Suspense>
        </Section>
      </PageShell>
    </Box>
  );
}
