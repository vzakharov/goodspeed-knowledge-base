import { Inject, Module, type OnApplicationBootstrap } from '@nestjs/common';

import { APP_CONFIG } from '../config/config.module.ts';
import { type AppConfig, ConfigError } from '../config/env.ts';
import { createAnonymousDb, rows } from '../database/database.ts';
import type { EmbeddingModel } from './models.ts';
import { createChatModel, createEmbeddingModel } from './openai-compatible.ts';

/**
 * The tokens the rest of the API injects a model by. Whatever is bound to them
 * is all a consumer knows of the provider behind it: the RAG code depends on
 * `ChatModel` and `EmbeddingModel`, and a test binds a fake to the same token.
 */
export const CHAT_MODEL = Symbol('ChatModel');
export const EMBEDDING_MODEL = Symbol('EmbeddingModel');

@Module({
  providers: [
    {
      provide: CHAT_MODEL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createChatModel(config.chat),
    },
    {
      provide: EMBEDDING_MODEL,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createEmbeddingModel(config.embedding),
    },
  ],
  exports: [CHAT_MODEL, EMBEDDING_MODEL],
})
export class AiModule implements OnApplicationBootstrap {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(EMBEDDING_MODEL) private readonly embeddings: EmbeddingModel,
  ) {}

  /**
   * Refuses to start when the embedding model and the vector column disagree
   * on the dimension: every write and every search would fail, one request at
   * a time, with an error far from its cause.
   */
  async onApplicationBootstrap() {
    const columnDimensions = rows(
      await createAnonymousDb(this.config.supabase).rpc('embedding_dimensions'),
    );

    if (columnDimensions !== this.embeddings.dimensions) {
      throw new ConfigError(
        `EMBEDDING_DIMENSIONS is ${this.embeddings.dimensions} and document_chunks.embedding is vector(${columnDimensions}) — change one to match the other; a migration changes the column`,
      );
    }
  }
}
