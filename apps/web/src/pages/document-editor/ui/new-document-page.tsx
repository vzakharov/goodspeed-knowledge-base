'use client';

import { Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { createDocument, documentHref } from '@/entities/document';

import { DocumentForm } from './document-form';
import { EditorShell } from './editor-shell';

export function NewDocumentPage() {
  const router = useRouter();

  return (
    <EditorShell id="new-document">
      <Title order={1}>New document</Title>
      <DocumentForm
        save={createDocument}
        onSaved={({ id }) => {
          router.replace(documentHref(id));
        }}
      />
    </EditorShell>
  );
}
