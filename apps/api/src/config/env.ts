import { z } from 'zod';

import type {
  EmbeddingSettings,
  ModelSettings,
} from '../ai/openai-compatible.ts';
import { PROVIDER_NAMES, PROVIDER_PRESETS } from '../ai/providers.ts';
import type { SupabaseSettings } from '../database/database.ts';

/**
 * Everything the API reads from its environment, parsed once at boot. A
 * variable that is missing or malformed stops the start with the variable's
 * name, rather than failing the first request that needs it.
 *
 * `apps/api/.env.example` documents each one.
 */

// An empty variable means unset: `.env.example` lists every name with an
// empty value, and a copy of it should read as "not configured".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    schema.optional(),
  );

const urlSchema = z
  .url({ protocol: /^https?$/ })
  .transform((url) => url.replace(/\/+$/, ''));

const providerSchema = z.enum(PROVIDER_NAMES);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  WEB_ORIGIN: urlSchema.default('http://localhost:3000'),

  SUPABASE_URL: urlSchema,
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),

  CHAT_PROVIDER: providerSchema,
  CHAT_MODEL: z.string().min(1),
  CHAT_API_KEY: optional(z.string()),
  CHAT_BASE_URL: optional(urlSchema),

  EMBEDDING_PROVIDER: providerSchema,
  EMBEDDING_MODEL: z.string().min(1),
  EMBEDDING_API_KEY: optional(z.string()),
  EMBEDDING_BASE_URL: optional(urlSchema),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().min(1),
  EMBEDDING_BATCH_SIZE: z.coerce.number().int().min(1).max(2048).default(64),
});

type Env = z.infer<typeof envSchema>;

export type AppConfig = {
  port: number;
  webOrigin: string;
  supabase: SupabaseSettings;
  chat: ModelSettings;
  embedding: EmbeddingSettings;
};

/** Thrown for a configuration that parses but cannot work. */
export class ConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigError';
  }
}

function modelSettings(
  env: Env,
  capability: 'CHAT' | 'EMBEDDING',
): ModelSettings {
  const provider = env[`${capability}_PROVIDER`];
  const model = env[`${capability}_MODEL`];
  const apiKey = env[`${capability}_API_KEY`];
  const baseUrl = env[`${capability}_BASE_URL`];
  const preset = PROVIDER_PRESETS[provider];
  const resolvedBaseUrl = baseUrl ?? preset.baseUrl;

  if (resolvedBaseUrl === undefined) {
    throw new ConfigError(
      `${capability}_BASE_URL is required for the ${provider} provider`,
    );
  }

  if (preset.requiresApiKey && apiKey === undefined) {
    throw new ConfigError(
      `${capability}_API_KEY is required for the ${provider} provider`,
    );
  }

  return { provider, model, apiKey, baseUrl: resolvedBaseUrl, preset };
}

function toConfig(env: Env): AppConfig {
  const embeddingProvider = PROVIDER_PRESETS[env.EMBEDDING_PROVIDER];

  if (!embeddingProvider.servesEmbeddings) {
    throw new ConfigError(
      `${env.EMBEDDING_PROVIDER} serves no embeddings — pick another EMBEDDING_PROVIDER; chat and embeddings are configured separately`,
    );
  }

  return {
    port: env.PORT,
    webOrigin: env.WEB_ORIGIN,
    supabase: {
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    },
    chat: modelSettings(env, 'CHAT'),
    embedding: {
      ...modelSettings(env, 'EMBEDDING'),
      dimensions: env.EMBEDDING_DIMENSIONS,
      batchSize: env.EMBEDDING_BATCH_SIZE,
    },
  };
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      ({ path, message }) => `  ${path.join('.')}: ${message}`,
    );

    throw new ConfigError(
      `Invalid environment — see .env.example:\n${problems.join('\n')}`,
    );
  }

  return toConfig(parsed.data);
}
