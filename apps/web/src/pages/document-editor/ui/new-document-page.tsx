'use client';

import { Title } from '@mantine/core';
import { useRouter } from 'next/navigation';

import { InternalLink, PageShell, Section } from '@/shared/ui';

import {
  createDocument,
  documentHref,
  documentsHref,
} from '@/entities/document';

import { DocumentForm } from './document-form';

export function NewDocumentPage() {
  const router = useRouter();

  return (
    <PageShell>
      <Section id="new-document">
        <InternalLink href={documentsHref(null)} size="sm">
          ← Documents
        </InternalLink>
        <Title order={1}>New document</Title>
        <DocumentForm
          save={createDocument}
          onSaved={({ id }) => {
            router.replace(documentHref(id));
          }}
        />
      </Section>
    </PageShell>
  );
}
