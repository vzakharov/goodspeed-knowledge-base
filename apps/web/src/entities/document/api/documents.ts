import {
  type Document,
  type DocumentInput,
  documentListSchema,
  documentSchema,
  reembedResultSchema,
  tagListSchema,
} from '@kb/contracts';
import { queryOptions } from '@tanstack/react-query';

import { api, queryClient } from '@/shared/api';

/** Every document query sits under this key, so one invalidation reaches all of them. */
const DOCUMENTS = ['documents'] as const;

export const documentQueries = {
  list: (tag: string | null) =>
    queryOptions({
      queryKey: [...DOCUMENTS, 'list', tag],
      queryFn: async ({ signal }) =>
        api.request(
          tag === null
            ? '/documents'
            : `/documents?${new URLSearchParams({ tag })}`,
          documentListSchema,
          { signal },
        ),
    }),
  tags: () =>
    queryOptions({
      queryKey: [...DOCUMENTS, 'tags'],
      queryFn: async ({ signal }) =>
        api.request('/documents/tags', tagListSchema, { signal }),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: [...DOCUMENTS, 'detail', id],
      queryFn: async ({ signal }) =>
        api.request(`/documents/${id}`, documentSchema, { signal }),
    }),
};

/**
 * The lists and tag counts every write changes. A document's own entry is left
 * out: a save answers with the document, and a delete leaves a page whose
 * refetch would only 404.
 */
async function refreshCollections(): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: DOCUMENTS,
    predicate: ({ queryKey }) => queryKey[1] !== 'detail',
  });
}

async function settled(document: Document): Promise<Document> {
  queryClient.setQueryData(
    documentQueries.detail(document.id).queryKey,
    document,
  );
  await refreshCollections();

  return document;
}

/** Answers once the document is embedded, so the result carries that outcome. */
export async function createDocument(input: DocumentInput): Promise<Document> {
  return settled(
    await api.request('/documents', documentSchema, {
      method: 'POST',
      json: input,
    }),
  );
}

export async function updateDocument(
  id: string,
  input: DocumentInput,
): Promise<Document> {
  return settled(
    await api.request(`/documents/${id}`, documentSchema, {
      method: 'PUT',
      json: input,
    }),
  );
}

export async function reembedDocument(id: string): Promise<Document> {
  return settled(
    await api.request(`/documents/${id}/embeddings`, documentSchema, {
      method: 'POST',
    }),
  );
}

export async function deleteDocument(id: string): Promise<void> {
  await api.send(`/documents/${id}`, { method: 'DELETE' });
  await refreshCollections();
}

/** Re-embeds every document that is not `ready` under the configured embedding model. */
export async function reembedOutdated() {
  const result = await api.request(
    '/documents/embeddings',
    reembedResultSchema,
    {
      method: 'POST',
    },
  );
  await queryClient.invalidateQueries({ queryKey: DOCUMENTS });

  return result;
}
