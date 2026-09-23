/**
 * A provider is a row of data, never a class: `openai-compatible.ts` speaks the
 * OpenAI API to all of them, and a preset says where it lives and which parts
 * of that API it serves. `custom` is any other server speaking it — a
 * self-hosted vLLM or LiteLLM — whose base URL has to be configured.
 */
export const PROVIDER_NAMES = [
  'openai',
  'groq',
  'together',
  'openrouter',
  'ollama',
  'custom',
] as const;

export type ProviderName = (typeof PROVIDER_NAMES)[number];

export const PROVIDER_PRESETS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    requiresApiKey: true,
    servesEmbeddings: true,
    reportsStreamUsage: true,
    acceptsEmbeddingDimensions: true,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    servesEmbeddings: false,
    reportsStreamUsage: true,
    acceptsEmbeddingDimensions: false,
  },
  together: {
    baseUrl: 'https://api.together.xyz/v1',
    requiresApiKey: true,
    servesEmbeddings: true,
    reportsStreamUsage: true,
    acceptsEmbeddingDimensions: false,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    servesEmbeddings: false,
    reportsStreamUsage: true,
    acceptsEmbeddingDimensions: false,
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    requiresApiKey: false,
    servesEmbeddings: true,
    reportsStreamUsage: true,
    acceptsEmbeddingDimensions: false,
  },
  custom: {
    baseUrl: undefined,
    requiresApiKey: false,
    servesEmbeddings: true,
    // An unknown server may reject `stream_options`, so it is not sent.
    reportsStreamUsage: false,
    acceptsEmbeddingDimensions: false,
  },
} as const satisfies Record<ProviderName, ProviderPreset>;

export type ProviderPreset = {
  /** Where the provider serves the OpenAI API; `undefined` means it has to be configured. */
  baseUrl: string | undefined;
  requiresApiKey: boolean;
  servesEmbeddings: boolean;
  /** Honours `stream_options.include_usage`, so a streamed answer's tokens are counted. */
  reportsStreamUsage: boolean;
  /** Honours the embeddings `dimensions` parameter, which shortens a vector server-side. */
  acceptsEmbeddingDimensions: boolean;
};
