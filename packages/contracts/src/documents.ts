import { z } from 'zod';

import { idSchema, nonBlank, timestampsShape } from './fields.ts';

/**
 * The bounds a document is held to. The database's check constraints hold the
 * same ones, as the last line; these are what turn a bad request into a 400
 * naming the field.
 */
export const DOCUMENT_LIMITS = {
  title: 200,
  content: 200_000,
  tags: 20,
  tag: 40,
} as const;

/** Tags are compared case-insensitively, so they are stored lowercased. */
export const tagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(DOCUMENT_LIMITS.tag);

/** What a reader writes: the create and the update body alike. */
export const documentInputSchema = z.object({
  title: z.string().trim().min(1).max(DOCUMENT_LIMITS.title),
  // Not trimmed: leading indentation is markdown, a code block for one.
  content: nonBlank(DOCUMENT_LIMITS.content),
  tags: z
    .array(tagSchema)
    .max(DOCUMENT_LIMITS.tags)
    .transform((tags) => [...new Set(tags)]),
});

export type DocumentInput = z.infer<typeof documentInputSchema>;

/**
 * Where a document's embeddings stand. `stale` is `ready` under a different
 * embedding model than the one configured now: its chunks exist, but no query
 * can reach them until it is embedded again.
 */
export const EMBEDDING_STATUSES = [
  'pending',
  'ready',
  'failed',
  'stale',
] as const;

export const embeddingStatusSchema = z.enum(EMBEDDING_STATUSES);

export type EmbeddingStatus = z.infer<typeof embeddingStatusSchema>;

export const embeddingStateSchema = z.object({
  status: embeddingStatusSchema,
  /** Why the last run failed; null unless `status` is `failed`. */
  error: z.string().nullable(),
  /** The model the stored chunks came from; null before the first success. */
  model: z.string().nullable(),
});

export type EmbeddingState = z.infer<typeof embeddingStateSchema>;

export const documentSchema = z.object({
  id: idSchema,
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  embedding: embeddingStateSchema,
  ...timestampsShape,
});

export type Document = z.infer<typeof documentSchema>;

/** A list row: the document without its body, and the body's opening instead. */
export const documentSummarySchema = documentSchema
  .omit({ content: true })
  .extend({ excerpt: z.string() });

export type DocumentSummary = z.infer<typeof documentSummarySchema>;

export const documentListSchema = z.object({
  documents: z.array(documentSummarySchema),
});

export type DocumentList = z.infer<typeof documentListSchema>;

export const documentListQuerySchema = z.object({
  tag: tagSchema.optional(),
});

export type DocumentListQuery = z.infer<typeof documentListQuerySchema>;

export const tagCountSchema = z.object({
  tag: z.string(),
  documents: z.int().min(1),
});

export const tagListSchema = z.object({
  tags: z.array(tagCountSchema),
});

export type TagList = z.infer<typeof tagListSchema>;

/** What re-embedding every out-of-date document did, counted by outcome. */
export const reembedResultSchema = z.object({
  ready: z.int().min(0),
  failed: z.int().min(0),
});

export type ReembedResult = z.infer<typeof reembedResultSchema>;
