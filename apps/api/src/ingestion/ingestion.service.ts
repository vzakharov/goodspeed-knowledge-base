import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  AiProviderError,
  EMBEDDING_MODEL,
  type EmbeddingModel,
} from '../ai/index.ts';
import type { Reader } from '../auth/index.ts';
import { rows, type Tables, toVectorLiteral } from '../database/database.ts';
import { UsageService } from '../usage/index.ts';
import { chunkDocument } from './chunker.ts';

/** What ingestion reads of a document: what it embeds, and the hash of that. */
export type IngestionSource = Pick<
  Tables<'documents'>,
  'id' | 'title' | 'content' | 'content_hash'
>;

/**
 * Turns a document into the chunks search reads: chunk, embed in batches,
 * replace the stored chunks in one transaction, and mark the document ready.
 *
 * It runs inside the request that wrote the document, so the response already
 * says how it went. A provider failure is the document's state rather than
 * the request's — the text is saved either way — so it lands on the document
 * as `failed` with the provider's message, and the reader retries from there.
 * Anything else is the API's own failure and propagates.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject(EMBEDDING_MODEL) private readonly embeddings: EmbeddingModel,
    private readonly usage: UsageService,
  ) {}

  /** The model search compares against; chunks from any other are stale. */
  get model() {
    return this.embeddings.model;
  }

  async ingest(reader: Reader, document: IngestionSource) {
    const chunks = chunkDocument(document);
    let embedded;

    try {
      embedded = await this.embeddings.embed(
        chunks.map(({ embeddedText }) => embeddedText),
      );
    } catch (error) {
      if (!(error instanceof AiProviderError)) {
        throw error;
      }

      this.logger.warn(
        `Embedding document ${document.id} failed: ${error.message}`,
      );
      await this.markFailed(reader, document, error.message);

      return;
    }

    const { model } = this.embeddings;

    await this.usage.recordEmbedding(reader, this.embeddings, embedded.usage);

    // `false` means the document changed while this ran; the request that
    // changed it runs its own ingestion, whose result is the one that counts.
    rows(
      await reader.db.rpc('replace_document_chunks', {
        target_document_id: document.id,
        expected_content_hash: document.content_hash,
        model,
        chunks: chunks.map(({ markdown, headingPath }, index) => ({
          chunk_index: index,
          content: markdown,
          heading_path: headingPath,
          embedding: toVectorLiteral(embedded.vectors[index] ?? []),
        })),
      }),
    );
  }

  private async markFailed(
    reader: Reader,
    { id, content_hash: contentHash }: IngestionSource,
    message: string,
  ) {
    rows(
      await reader.db
        .from('documents')
        .update({ embedding_status: 'failed', embedding_error: message })
        .eq('id', id)
        .eq('user_id', reader.userId)
        .eq('content_hash', contentHash),
    );
  }
}
