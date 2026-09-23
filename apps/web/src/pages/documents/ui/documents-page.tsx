'use client';

import { Group, Loader, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Suspense } from 'react';

import { pick } from '@/shared/lib/collections';
import { useSearchParam } from '@/shared/lib/search-param';
import { ErrorAlert, InternalButton, PageShell, Section } from '@/shared/ui';

import { documentQueries, NEW_DOCUMENT_HREF } from '@/entities/document';

import { DocumentRow } from './document-row';
import { OutdatedNotice } from './outdated-notice';
import { TagFilter } from './tag-filter';

const ICON_SIZE = 16;

type Filtered = { tag: string | null };

function DocumentList({ tag }: Filtered) {
  const list = useQuery(documentQueries.list(tag));

  if (list.isPending) return <Loader size="sm" />;
  if (list.isError) {
    return (
      <ErrorAlert title="The documents did not load" {...pick(list, 'error')} />
    );
  }

  const { documents } = list.data;
  if (documents.length === 0) {
    return (
      <Text c="dimmed">
        {tag === null
          ? 'No documents yet. Add one, and the chat can answer from it.'
          : `No documents are tagged “${tag}”.`}
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {documents.map((document) => (
        <DocumentRow key={document.id} {...{ document }} />
      ))}
    </Stack>
  );
}

/** The filter is the `tag` search parameter, so a filtered list has a URL. */
function FilteredList() {
  const tag = useSearchParam('tag');

  return (
    <>
      <OutdatedNotice />
      <TagFilter selected={tag} />
      <DocumentList {...{ tag }} />
    </>
  );
}

export function DocumentsPage() {
  return (
    <PageShell>
      <Section id="documents">
        <Group justify="space-between" wrap="nowrap">
          <Title order={1}>Documents</Title>
          <InternalButton
            href={NEW_DOCUMENT_HREF}
            leftSection={<Plus size={ICON_SIZE} />}
          >
            New document
          </InternalButton>
        </Group>
        <Suspense fallback={<Loader size="sm" />}>
          <FilteredList />
        </Suspense>
      </Section>
    </PageShell>
  );
}
