import {
  type Citation,
  citationSchema,
  type Conversation,
  type ConversationDetail,
  type ConversationInput,
  type ConversationList,
  type Message,
} from '@kb/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';

import type { ModelIdentity } from '../ai/index.ts';
import type { Reader } from '../auth/index.ts';
import {
  rows,
  type Tables,
  toIso,
  toTimestamps,
} from '../database/database.ts';
import type { Turn } from './prompt.ts';

/** How much of the conversation an answer's prompts replay. */
const HISTORY_TURNS = 8;

const citationsSchema = z.array(citationSchema);

function toConversation(row: Tables<'conversations'>): Conversation {
  const { id, title } = row;

  return { id, title, ...toTimestamps(row) };
}

function toMessage({
  id,
  role,
  content,
  citations,
  model,
  created_at: createdAt,
}: Tables<'messages'>): Message {
  return {
    id,
    role,
    content,
    // `jsonb` is the one column the generated types cannot describe, so it is
    // parsed where it is read.
    citations: citationsSchema.parse(citations),
    model,
    createdAt: toIso(createdAt),
  };
}

const notFound = (id: string) =>
  new NotFoundException(`No conversation ${id} among yours`);

export type Exchange = Pick<ModelIdentity, 'model'> & {
  question: string;
  askedAt: Date;
  answer: string;
  citations: Citation[];
};

@Injectable()
export class ConversationsService {
  async list(reader: Reader): Promise<ConversationList> {
    const conversations = rows(
      await reader.db
        .from('conversations')
        .select()
        .eq('user_id', reader.userId)
        .order('updated_at', { ascending: false }),
    );

    return { conversations: conversations.map((row) => toConversation(row)) };
  }

  async create(
    reader: Reader,
    input: ConversationInput,
  ): Promise<Conversation> {
    return toConversation(
      rows(
        await reader.db.from('conversations').insert(input).select().single(),
      ),
    );
  }

  async get(reader: Reader, id: string): Promise<ConversationDetail> {
    const conversation = await this.row(reader, id);
    const messages = rows(
      await reader.db
        .from('messages')
        .select()
        .eq('conversation_id', id)
        .eq('user_id', reader.userId)
        .order('created_at'),
    );

    return {
      ...toConversation(conversation),
      messages: messages.map((row) => toMessage(row)),
    };
  }

  async remove(reader: Reader, id: string) {
    const deleted = rows(
      await reader.db
        .from('conversations')
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

  /** The latest turns, oldest first — and a 404 for a conversation that is not the reader's. */
  async history(reader: Reader, id: string): Promise<Turn[]> {
    await this.row(reader, id);

    const latest = rows(
      await reader.db
        .from('messages')
        .select('role, content')
        .eq('conversation_id', id)
        .eq('user_id', reader.userId)
        .order('created_at', { ascending: false })
        .limit(HISTORY_TURNS),
    );

    return latest.toReversed();
  }

  /**
   * Stores a question with its answer, together, so the history never holds
   * a question whose answer failed half-way — the reader asks it again.
   */
  async store(
    reader: Reader,
    id: string,
    { question, askedAt, answer, citations, model }: Exchange,
  ) {
    const stored = rows(
      await reader.db
        .from('messages')
        // Both rows spell every column: in a bulk insert, PostgREST fills a
        // column one row leaves out with null rather than its default.
        .insert([
          {
            conversation_id: id,
            role: 'user',
            content: question,
            citations: [],
            model: null,
            created_at: askedAt.toISOString(),
          },
          {
            conversation_id: id,
            role: 'assistant',
            content: answer,
            citations,
            model,
            created_at: new Date().toISOString(),
          },
        ])
        .select(),
    ).map((row) => toMessage(row));
    const [asked, answered] = stored;

    if (asked === undefined || answered === undefined) {
      throw new Error(`Stored ${stored.length} messages of an exchange's 2`);
    }

    return { question: asked, answer: answered };
  }

  private async row(reader: Reader, id: string) {
    const row = rows(
      await reader.db
        .from('conversations')
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
