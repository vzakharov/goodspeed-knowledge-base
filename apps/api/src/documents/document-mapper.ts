import type { Document, DocumentSummary, EmbeddingState } from '@kb/contracts';

import { type Tables, toIso } from '../database/database.ts';

type DocumentRow = Tables<'documents'>;

type EmbeddingColumns = Pick<
  DocumentRow,
  'embedding_status' | 'embedding_error' | 'embedding_model'
>;

/**
 * A row of `list_document_summaries`. Written against the table's own row
 * type because the generator reads a function's result columns as non-null,
 * and the embedding ones are not.
 */
export type DocumentSummaryRow = Pick<
  DocumentRow,
  'id' | 'title' | 'tags' | 'created_at' | 'updated_at'
> &
  EmbeddingColumns & { excerpt: string };

export function toEmbeddingState(
  row: EmbeddingColumns,
  currentModel: string,
): EmbeddingState {
  const status =
    row.embedding_status === 'ready' && row.embedding_model !== currentModel
      ? 'stale'
      : row.embedding_status;

  return { status, error: row.embedding_error, model: row.embedding_model };
}

export function toDocument(row: DocumentRow, currentModel: string): Document {
  const {
    id,
    title,
    content,
    tags,
    created_at: createdAt,
    updated_at: updatedAt,
  } = row;

  return {
    id,
    title,
    content,
    tags,
    embedding: toEmbeddingState(row, currentModel),
    createdAt: toIso(createdAt),
    updatedAt: toIso(updatedAt),
  };
}

export function toDocumentSummary(
  row: DocumentSummaryRow,
  currentModel: string,
): DocumentSummary {
  const {
    id,
    title,
    excerpt,
    tags,
    created_at: createdAt,
    updated_at: updatedAt,
  } = row;

  return {
    id,
    title,
    excerpt,
    tags,
    embedding: toEmbeddingState(row, currentModel),
    createdAt: toIso(createdAt),
    updatedAt: toIso(updatedAt),
  };
}
