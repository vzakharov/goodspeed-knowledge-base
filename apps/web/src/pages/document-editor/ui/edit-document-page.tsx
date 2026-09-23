'use client';

import { Group, Loader, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { pick } from '@/shared/lib/collections';
import type { WithId } from '@/shared/typings';
import { ErrorAlert, InternalLink, PageShell, Section } from '@/shared/ui';

import {
  documentQueries,
  documentsHref,
  EmbeddingBadge,
  updateDocument,
} from '@/entities/document';

import { DeleteDocument } from './delete-document';
import { DocumentForm } from './document-form';
import { EmbeddingNotice } from './embedding-notice';

function Editor({ id }: WithId) {
  const document = useQuery(documentQueries.detail(id));

  if (document.isPending) return <Loader size="sm" />;
  if (document.isError) {
    return (
      <ErrorAlert
        title="The document did not load"
        {...pick(document, 'error')}
      />
    );
  }

  const { title, embedding } = document.data;

  return (
    <>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Title order={1}>{title}</Title>
        <Group gap="sm" wrap="nowrap" mt="xs">
          <EmbeddingBadge {...{ embedding }} />
          <DeleteDocument {...{ id, title }} />
        </Group>
      </Group>
      <EmbeddingNotice {...{ id, embedding }} />
      <DocumentForm
        key={id}
        document={document.data}
        save={async (input) => updateDocument(id, input)}
      />
    </>
  );
}

/** The document is the `id` search parameter; a static export has no segment for it. */
function EditorForAddress() {
  // `null` only under the Pages Router, which `apps/web/pages/` keeps empty.
  const id = useSearchParams()?.get('id') ?? null;

  if (id === null) {
    return <Text c="dimmed">No document is named in the address.</Text>;
  }

  return <Editor {...{ id }} />;
}

export function EditDocumentPage() {
  return (
    <PageShell>
      <Section id="document">
        <InternalLink href={documentsHref(null)} size="sm">
          ← Documents
        </InternalLink>
        {/* `useSearchParams` needs a boundary in a static export, which has
            no query string to render at build time. */}
        <Suspense fallback={<Loader size="sm" />}>
          <EditorForAddress />
        </Suspense>
      </Section>
    </PageShell>
  );
}
