'use client';

import { Group, Loader, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Suspense } from 'react';

import { pick } from '@/shared/lib/collections';
import { useSearchParam } from '@/shared/lib/search-param';
import type { WithId } from '@/shared/typings';
import { ErrorAlert } from '@/shared/ui';

import {
  documentQueries,
  EmbeddingBadge,
  updateDocument,
} from '@/entities/document';

import { DeleteDocument } from './delete-document';
import { DocumentForm } from './document-form';
import { EditorShell } from './editor-shell';
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

function EditorForAddress() {
  const id = useSearchParam('id');

  if (id === null) {
    return <Text c="dimmed">No document is named in the address.</Text>;
  }

  return <Editor {...{ id }} />;
}

export function EditDocumentPage() {
  return (
    <EditorShell id="document">
      <Suspense fallback={<Loader size="sm" />}>
        <EditorForAddress />
      </Suspense>
    </EditorShell>
  );
}
