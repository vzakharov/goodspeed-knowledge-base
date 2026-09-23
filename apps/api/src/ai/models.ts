import type { ProviderName } from './providers.ts';

/**
 * The two capabilities the knowledge base needs from a model, and all that the
 * code using them may know. They are separate because providers are: Groq and
 * OpenRouter serve chat but no embeddings, so "which provider" is a question
 * asked once per capability, and each is configured on its own.
 */

/** Which model on which provider — what a usage record and a reader are told. */
export type ModelIdentity = {
  provider: ProviderName;
  model: string;
};

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

/** What a request may be cut short by — the reader closing the stream, for one. */
export type Cancellable = { signal?: AbortSignal };

export type PromptTokens = { promptTokens: number };

export type TokenUsage = PromptTokens & { completionTokens: number };

/**
 * Null where the provider reported none, which is not the same as zero — a
 * record keeps the difference rather than inventing a count.
 */
export type WithReportedUsage<Usage> = { usage: Usage | null };

/** An answer's text is an assistant message's content. */
export type ChatCompletion = Pick<ChatMessage, 'content'> &
  WithReportedUsage<TokenUsage>;

/** A streamed answer: its text in pieces, then its usage once, if reported. */
export type ChatStreamPart =
  | { type: 'delta'; text: string }
  | ({ type: 'usage' } & WithReportedUsage<TokenUsage>);

export type ChatModel = ModelIdentity & {
  complete: (
    messages: ChatMessage[],
    options?: Cancellable,
  ) => Promise<ChatCompletion>;
  stream: (
    messages: ChatMessage[],
    options?: Cancellable,
  ) => AsyncIterable<ChatStreamPart>;
};

/** The length of every vector an embedding model returns. */
export type WithDimensions = { dimensions: number };

export type Embeddings = WithReportedUsage<PromptTokens> & {
  /** One per input, in input order, each `dimensions` long. */
  vectors: number[][];
};

export type EmbeddingModel = ModelIdentity &
  WithDimensions & {
    embed: (texts: string[], options?: Cancellable) => Promise<Embeddings>;
  };
