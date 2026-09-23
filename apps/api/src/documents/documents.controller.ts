import {
  type Document,
  type DocumentInput,
  documentInputSchema,
  type DocumentList,
  type DocumentListQuery,
  documentListQuerySchema,
  type ReembedResult,
  type TagList,
} from '@kb/contracts';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { CurrentReader, type Reader } from '../auth/index.ts';
import { idPipe, ZodPipe } from '../http/zod.pipe.ts';
import { DocumentsService } from './documents.service.ts';

/**
 * A write answers once the document is embedded, so its response already
 * carries the outcome — `ready`, or `failed` with the provider's reason.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  async list(
    @CurrentReader() reader: Reader,
    @Query(new ZodPipe(documentListQuerySchema)) query: DocumentListQuery,
  ): Promise<DocumentList> {
    return this.documents.list(reader, query);
  }

  @Get('tags')
  async tags(@CurrentReader() reader: Reader): Promise<TagList> {
    return this.documents.tags(reader);
  }

  /** Re-embeds every document search cannot reach as it stands. */
  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  async reembedOutdated(
    @CurrentReader() reader: Reader,
  ): Promise<ReembedResult> {
    return this.documents.reembedOutdated(reader);
  }

  @Get(':id')
  async get(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
  ): Promise<Document> {
    return this.documents.get(reader, id);
  }

  @Post()
  async create(
    @CurrentReader() reader: Reader,
    @Body(new ZodPipe(documentInputSchema)) input: DocumentInput,
  ): Promise<Document> {
    return this.documents.create(reader, input);
  }

  @Put(':id')
  async update(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
    @Body(new ZodPipe(documentInputSchema)) input: DocumentInput,
  ): Promise<Document> {
    return this.documents.update(reader, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
  ): Promise<void> {
    return this.documents.remove(reader, id);
  }

  @Post(':id/embeddings')
  @HttpCode(HttpStatus.OK)
  async reembed(
    @CurrentReader() reader: Reader,
    @Param('id', idPipe) id: string,
  ): Promise<Document> {
    return this.documents.reembed(reader, id);
  }
}
