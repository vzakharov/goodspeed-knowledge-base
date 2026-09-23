import type { AnswerEvent, Citation } from '@kb/contracts';
import { Inject, Injectable } from '@nestjs/common';

import {
  CHAT_MODEL,
  type ChatMessage,
  type ChatModel,
  EMBEDDING_MODEL,
  type EmbeddingModel,
  type TokenUsage,
} from '../ai/index.ts';
import type { Reader } from '../auth/index.ts';
import { rows, toVectorLiteral } from '../database/database.ts';
import { UsageService } from '../usage/index.ts';
import { ConversationsService } from './conversations.service.ts';
import {
  answerPrompt,
  citedSources,
  condensePrompt,
  type Source,
  type Turn,
} from './prompt.ts';

/**
 * How many chunks an answer may draw on. Enough for a question whose answer
 * spans a few sections, few enough that the prompt stays focused.
 */
const MATCH_COUNT = 6;

/**
 * Below this cosine similarity a chunk is noise rather than context. Low on
 * purpose: the model is told to say so when the sources miss, which fails
 * better than a threshold that drops the one relevant chunk.
 */
const MIN_SIMILARITY = 0.25;

const EXCERPT_LENGTH = 400;

type Retrieved = {
  source: Source;
  citation: Omit<Citation, 'index'>;
};

/** The question is what becomes the reader's message. */
export type Question = Pick<ChatMessage, 'content'> & {
  conversationId: string;
  history: Turn[];
};

/**
 * One answer, retrieval-augmented:
 *
 * 1. condense — a follow-up is rewritten to stand alone, since retrieval sees
 *    only the query and not the conversation;
 * 2. retrieve — the query is embedded and the nearest chunks among the
 *    reader's documents come back through `match_document_chunks`;
 * 3. answer — the model answers from those chunks, numbered, citing them;
 * 4. store — the question and the answer, with the chunks it cited, together.
 *
 * Each model call is recorded as usage as soon as it returns, so a later step
 * failing does not lose the record of the ones before it.
 */
@Injectable()
export class AnswerService {
  constructor(
    @Inject(CHAT_MODEL) private readonly chat: ChatModel,
    @Inject(EMBEDDING_MODEL) private readonly embeddings: EmbeddingModel,
    private readonly conversations: ConversationsService,
    private readonly usage: UsageService,
  ) {}

  async *answer(
    reader: Reader,
    question: Question,
    signal: AbortSignal,
  ): AsyncGenerator<AnswerEvent> {
    const askedAt = new Date();
    const query = await this.standalone(reader, question, signal);
    const retrieved = await this.retrieve(reader, query, signal);

    let text = '';
    let usage: TokenUsage | null = null;

    for await (const part of this.chat.stream(
      answerPrompt(
        question.history,
        question.content,
        retrieved.map(({ source }) => source),
      ),
      { signal },
    )) {
      if (part.type === 'delta') {
        const { text: delta } = part;

        text += delta;
        yield { type: 'delta', text: delta };
      } else {
        ({ usage } = part);
      }
    }

    await this.recordChat(reader, 'chat', usage);

    const citations = citedSources(text, retrieved.length).flatMap(
      (number): Citation[] => {
        const cited = retrieved[number - 1];

        return cited ? [{ ...cited.citation, index: number }] : [];
      },
    );
    const { model } = this.chat;
    const stored = await this.conversations.store(
      reader,
      question.conversationId,
      { question: question.content, askedAt, answer: text, citations, model },
    );

    yield { type: 'done', ...stored };
  }

  /** The question as retrieval should search for it. */
  private async standalone(
    reader: Reader,
    { history, content }: Question,
    signal: AbortSignal,
  ) {
    if (history.length === 0) {
      return content;
    }

    const condensed = await this.chat.complete(
      condensePrompt(history, content),
      {
        signal,
      },
    );

    await this.recordChat(reader, 'condense', condensed.usage);

    // A model that answers instead of rewriting returns something long; the
    // question itself is the safer query then.
    const query = condensed.content.trim();

    return query === '' || query.length > content.length * 4 + 200
      ? content
      : query;
  }

  private async retrieve(reader: Reader, query: string, signal: AbortSignal) {
    const {
      vectors: [vector],
      usage,
    } = await this.embeddings.embed([query], { signal });

    await this.usage.recordEmbedding(
      reader,
      this.embeddings,
      usage?.promptTokens ?? null,
    );

    const { model } = this.embeddings;
    const matches = rows(
      await reader.db
        .rpc('match_document_chunks', {
          query_embedding: toVectorLiteral(vector ?? []),
          model,
          match_count: MATCH_COUNT,
          min_similarity: MIN_SIMILARITY,
        })
        .abortSignal(signal),
    );

    // What the prompt quotes whole, and what the answer keeps of it.
    return matches.map(
      ({
        document_id: documentId,
        document_title: documentTitle,
        heading_path: headingPath,
        chunk_index: chunkIndex,
        content,
        similarity,
      }): Retrieved => ({
        source: { documentTitle, headingPath, markdown: content },
        citation: {
          documentId,
          documentTitle,
          headingPath,
          chunkIndex,
          excerpt:
            content.length > EXCERPT_LENGTH
              ? `${content.slice(0, EXCERPT_LENGTH).trimEnd()}…`
              : content,
          similarity,
        },
      }),
    );
  }

  private async recordChat(
    reader: Reader,
    kind: 'chat' | 'condense',
    usage: TokenUsage | null,
  ) {
    const { provider, model } = this.chat;

    return this.usage.record(reader, {
      kind,
      provider,
      model,
      promptTokens: usage?.promptTokens ?? null,
      completionTokens: usage?.completionTokens ?? null,
    });
  }
}
