import type {
  Document,
  DocumentInput,
  DocumentList,
  DocumentListQuery,
  ReembedResult,
  TagList,
} from '@kb/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';

import type { Reader } from '../auth/index.ts';
import { rows, type Tables } from '../database/database.ts';
import { IngestionService } from '../ingestion/index.ts';
import {
  type DocumentSummaryRow,
  toDocument,
  toDocumentSummary,
} from './document-mapper.ts';

async function inSequence<T>(items: T[], run: (item: T) => Promise<void>) {
  const [first, ...rest] = items;

  if (first !== undefined) {
    await run(first);
    await inSequence(rest, run);
  }
}

const notFound = (id: string) =>
  new NotFoundException(`No document ${id} among yours`);

@Injectable()
export class DocumentsService {
  constructor(private readonly ingestion: IngestionService) {}

  async list(
    reader: Reader,
    { tag }: DocumentListQuery,
  ): Promise<DocumentList> {
    const summaries: DocumentSummaryRow[] = rows(
      await reader.db.rpc(
        'list_document_summaries',
        tag === undefined ? {} : { with_tag: tag },
      ),
    );

    return {
      documents: summaries.map((row) =>
        toDocumentSummary(row, this.ingestion.model),
      ),
    };
  }

  async tags(reader: Reader): Promise<TagList> {
    return { tags: rows(await reader.db.rpc('list_document_tags')) };
  }

  async get(reader: Reader, id: string): Promise<Document> {
    return toDocument(await this.row(reader, id), this.ingestion.model);
  }

  async create(reader: Reader, input: DocumentInput): Promise<Document> {
    const created = rows(
      await reader.db.from('documents').insert(input).select().single(),
    );

    await this.ingestion.ingest(reader, created);

    return this.get(reader, created.id);
  }

  /**
   * Embeds again only when what is embedded changed — the title or the body;
   * a retag leaves the chunks as they are.
   */
  async update(
    reader: Reader,
    id: string,
    input: DocumentInput,
  ): Promise<Document> {
    const updated = rows(
      await reader.db
        .from('documents')
        .update(input)
        .eq('id', id)
        .eq('user_id', reader.userId)
        .select()
        .maybeSingle(),
    );

    if (updated === null) {
      throw notFound(id);
    }

    if (updated.embedding_status === 'pending') {
      await this.ingestion.ingest(reader, updated);

      return this.get(reader, id);
    }

    return toDocument(updated, this.ingestion.model);
  }

  async remove(reader: Reader, id: string) {
    const deleted = rows(
      await reader.db
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', reader.userId)
        .select('id')
        .maybeSingle(),
    );

    if (deleted === null) {
      throw notFound(id);
    }
  }

  /** Embeds a document again whatever its state — the retry after a failure. */
  async reembed(reader: Reader, id: string): Promise<Document> {
    await this.ingestion.ingest(reader, await this.row(reader, id));

    return this.get(reader, id);
  }

  /**
   * Embeds every document search cannot reach as it stands: never embedded,
   * failed, or embedded by another model than the configured one. One at a
   * time, so a large backlog does not become a burst against the provider.
   */
  async reembedOutdated(reader: Reader): Promise<ReembedResult> {
    const outdated = rows(
      await reader.db
        .from('documents')
        .select('id, title, content, content_hash')
        .eq('user_id', reader.userId)
        // Quoted, since a model name may hold the filter syntax's own
        // commas and parentheses.
        .or(
          `embedding_status.neq.ready,embedding_model.neq."${this.ingestion.model}"`,
        ),
    );

    await inSequence(outdated, async (document) =>
      this.ingestion.ingest(reader, document),
    );

    const statuses = rows(
      await reader.db
        .from('documents')
        .select('embedding_status')
        .in(
          'id',
          outdated.map(({ id }) => id),
        ),
    );

    return {
      ready: statuses.filter((row) => row.embedding_status === 'ready').length,
      failed: statuses.filter((row) => row.embedding_status === 'failed')
        .length,
    };
  }

  private async row(reader: Reader, id: string): Promise<Tables<'documents'>> {
    const row = rows(
      await reader.db
        .from('documents')
        .select()
        .eq('id', id)
        .eq('user_id', reader.userId)
        .maybeSingle(),
    );

    if (row === null) {
      throw notFound(id);
    }

    return row;
  }
}
