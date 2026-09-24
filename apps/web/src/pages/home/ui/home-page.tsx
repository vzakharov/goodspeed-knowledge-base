'use client';

import { Center, Loader } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { pick } from '@/shared/lib/collections';
import { ErrorAlert, PageShell } from '@/shared/ui';

import { documentQueries, documentsHref } from '@/entities/document';

const CHAT_HREF = '/chat';

/** A redirect rather than either page rendered at `/`: both build their links on their own path. */
export function HomePage() {
  const list = useQuery(documentQueries.list(null));
  const router = useRouter();
  const empty = list.data?.documents.length === 0;
  const target = list.isSuccess && (empty ? documentsHref(null) : CHAT_HREF);

  useEffect(() => {
    if (target !== false) router.replace(target);
  }, [target, router]);

  if (list.isError) {
    return (
      <PageShell>
        <ErrorAlert
          title="The documents did not load"
          {...pick(list, 'error')}
        />
      </PageShell>
    );
  }

  return (
    <Center mih="50dvh">
      <Loader aria-label="Loading" />
    </Center>
  );
}
