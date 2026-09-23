import {
  createClient,
  type PostgrestSingleResponse,
  type SupabaseClient,
} from '@supabase/supabase-js';

import type { Database, Tables } from './database.types.ts';

/**
 * The API's only route to Postgres: PostgREST, under the key the web app also
 * holds. Every query a reader's request makes goes through a client carrying
 * that reader's own access token, so row-level security decides what it sees
 * — there is no service-role key anywhere in the API, so no code path can
 * forget to scope a query.
 */
export type Db = SupabaseClient<Database>;

export type SupabaseSettings = {
  url: string;
  publishableKey: string;
};

const SERVER_AUTH = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

/** A client acting as the reader the token belongs to. */
export function createReaderDb(
  { url, publishableKey }: SupabaseSettings,
  accessToken: string,
): Db {
  return createClient<Database>(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: SERVER_AUTH,
  });
}

/** A client acting as nobody, for what the schema publishes to anyone. */
export function createAnonymousDb({
  url,
  publishableKey,
}: SupabaseSettings): Db {
  return createClient<Database>(url, publishableKey, { auth: SERVER_AUTH });
}

/** A query the database refused or failed. The PostgREST error is the cause. */
class DatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseError';
  }
}

/** A query's rows, or a throw carrying what went wrong. */
export function rows<T>(result: PostgrestSingleResponse<T>): T {
  if (result.error !== null) {
    throw new DatabaseError(result.error.message, { cause: result.error });
  }

  return result.data;
}

/** A `timestamptz` as PostgREST writes it, as the wire's ISO 8601 in UTC. */
export function toIso(timestamp: string) {
  return new Date(timestamp).toISOString();
}

export function toTimestamps({
  created_at: createdAt,
  updated_at: updatedAt,
}: Pick<Tables<'documents'>, 'created_at' | 'updated_at'>) {
  return { createdAt: toIso(createdAt), updatedAt: toIso(updatedAt) };
}

/** The pgvector text form, which a `vector` parameter or column accepts. */
export function toVectorLiteral(vector: number[]) {
  return `[${vector.join(',')}]`;
}

export { type Tables } from './database.types.ts';
