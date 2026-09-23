import OpenAI from 'openai';

import { AiProviderError } from './ai-provider.error.ts';
import type {
  Cancellable,
  ChatModel,
  ChatStreamPart,
  EmbeddingModel,
  ModelIdentity,
  TokenUsage,
  WithDimensions,
} from './models.ts';
import type { ProviderPreset } from './providers.ts';

/**
 * Nothing here branches on a provider's name: what differs between providers
 * arrives as a preset's capability flags.
 */

export type ModelSettings = ModelIdentity & {
  baseUrl: string;
  /** Absent for a provider that takes none, such as a local Ollama. */
  apiKey: string | undefined;
  preset: ProviderPreset;
};

export type EmbeddingSettings = ModelSettings &
  WithDimensions & {
    /** Inputs per request; a longer list is sent as several. */
    batchSize: number;
  };

// A request past this has hung rather than been slow — a long answer streams,
// so it never waits this long for its first byte.
const REQUEST_TIMEOUT_MS = 120_000;

function createClient({ baseUrl, apiKey }: ModelSettings) {
  return new OpenAI({
    baseURL: baseUrl,
    // The SDK refuses to start without a key, and a keyless server ignores
    // the header this sends instead.
    apiKey: apiKey ?? 'unused',
    timeout: REQUEST_TIMEOUT_MS,
  });
}

/**
 * What a failed provider call re-throws: an `AiProviderError` naming the
 * provider — unless the caller cancelled the call, which is the caller's own
 * doing and not the provider's failure.
 */
function failure(
  identity: ModelIdentity,
  { signal }: Cancellable,
  error: unknown,
) {
  return signal?.aborted === true
    ? error
    : AiProviderError.from(identity, error);
}

async function calling<T>(
  identity: ModelIdentity,
  options: Cancellable,
  call: () => Promise<T>,
) {
  try {
    return await call();
  } catch (error) {
    throw failure(identity, options, error);
  }
}

function toTokenUsage(
  usage: OpenAI.CompletionUsage | null | undefined,
): TokenUsage | null {
  return usage
    ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      }
    : null;
}

export function createChatModel(settings: ModelSettings): ChatModel {
  const client = createClient(settings);
  const { provider, model, preset } = settings;
  const identity = { provider, model };

  return {
    ...identity,

    complete: async (messages, options = {}) =>
      calling(identity, options, async () => {
        const completion = await client.chat.completions.create(
          { model, messages },
          options,
        );
        const content = completion.choices[0]?.message.content;

        if (content === null || content === undefined) {
          throw new AiProviderError(identity, 'returned no message');
        }

        return { content, usage: toTokenUsage(completion.usage) };
      }),

    async *stream(messages, options = {}) {
      let usage: TokenUsage | null = null;

      try {
        const stream = await client.chat.completions.create(
          {
            model,
            messages,
            stream: true,
            ...(preset.reportsStreamUsage && {
              stream_options: { include_usage: true },
            }),
          },
          options,
        );

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content;

          if (text !== null && text !== undefined && text !== '') {
            yield { type: 'delta', text } satisfies ChatStreamPart;
          }

          usage = toTokenUsage(chunk.usage) ?? usage;
        }
      } catch (error) {
        throw failure(identity, options, error);
      }

      yield { type: 'usage', usage } satisfies ChatStreamPart;
    },
  };
}

export function createEmbeddingModel(
  settings: EmbeddingSettings,
): EmbeddingModel {
  const client = createClient(settings);
  const { provider, model, preset, dimensions, batchSize } = settings;
  const identity = { provider, model };

  async function embedBatch(texts: string[], options: Cancellable) {
    const response = await calling(identity, options, async () =>
      client.embeddings.create(
        {
          model,
          input: texts,
          // The SDK asks for base64 unless told otherwise, which not every
          // server that speaks the API honours.
          encoding_format: 'float',
          ...(preset.acceptsEmbeddingDimensions && { dimensions }),
        },
        options,
      ),
    );

    // Providers are not required to answer in input order; `index` is.
    const vectors = response.data
      .toSorted((a, b) => a.index - b.index)
      .map(({ embedding }) => embedding);

    if (vectors.length !== texts.length) {
      throw new AiProviderError(
        identity,
        `returned ${vectors.length} embeddings for ${texts.length} inputs`,
      );
    }

    const wrongLength = vectors.find((vector) => vector.length !== dimensions);

    if (wrongLength) {
      throw new AiProviderError(
        identity,
        `returned ${wrongLength.length}-dimensional embeddings where ${dimensions} are configured — set EMBEDDING_DIMENSIONS to match the model, and the column to match that`,
      );
    }

    // `usage` is declared required, and some OpenAI-compatible servers omit
    // it all the same.
    const usage = response.usage as typeof response.usage | undefined;

    return { vectors, promptTokens: usage?.prompt_tokens };
  }

  return {
    ...identity,
    dimensions,

    embed: async (texts, options = {}) => {
      const batches = Array.from(
        { length: Math.ceil(texts.length / batchSize) },
        (_, index) => texts.slice(index * batchSize, (index + 1) * batchSize),
      );
      const results = await Promise.all(
        batches.map(async (batch) => embedBatch(batch, options)),
      );
      const reported = results
        .map(({ promptTokens }) => promptTokens)
        .filter((count) => count !== undefined);

      return {
        vectors: results.flatMap(({ vectors }) => vectors),
        // A partial count would read as the whole, so it is none at all.
        usage:
          reported.length === results.length
            ? { promptTokens: reported.reduce((sum, count) => sum + count, 0) }
            : null,
      };
    },
  };
}
