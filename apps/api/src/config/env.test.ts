import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigError, loadConfig } from './env.ts';

const BASE = {
  SUPABASE_URL: 'http://127.0.0.1:54321/',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  CHAT_PROVIDER: 'openai',
  CHAT_MODEL: 'gpt-4o-mini',
  CHAT_API_KEY: 'sk-chat',
  EMBEDDING_PROVIDER: 'openai',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_API_KEY: 'sk-embedding',
  EMBEDDING_DIMENSIONS: '1536',
};

describe('loadConfig', () => {
  it('fills each capability from its provider preset', () => {
    const config = loadConfig(BASE);

    assert.equal(config.port, 4000);
    assert.equal(config.supabase.url, 'http://127.0.0.1:54321');
    assert.equal(config.chat.baseUrl, 'https://api.openai.com/v1');
    assert.equal(config.embedding.dimensions, 1536);
    assert.equal(config.embedding.batchSize, 64);
  });

  it('configures chat and embeddings on separate providers', () => {
    const config = loadConfig({
      ...BASE,
      CHAT_PROVIDER: 'groq',
      CHAT_MODEL: 'llama-3.3-70b-versatile',
      EMBEDDING_PROVIDER: 'ollama',
      EMBEDDING_MODEL: 'nomic-embed-text',
      EMBEDDING_API_KEY: '',
      EMBEDDING_DIMENSIONS: '768',
    });

    assert.equal(config.chat.baseUrl, 'https://api.groq.com/openai/v1');
    assert.equal(config.embedding.baseUrl, 'http://localhost:11434/v1');
    assert.equal(config.embedding.apiKey, undefined);
  });

  it('lets a base URL override the preset', () => {
    const config = loadConfig({
      ...BASE,
      CHAT_BASE_URL: 'https://proxy.example/v1/',
    });

    assert.equal(config.chat.baseUrl, 'https://proxy.example/v1');
  });

  it('names every missing or malformed variable at once', () => {
    assert.throws(
      () =>
        loadConfig({
          ...BASE,
          CHAT_PROVIDER: 'acme',
          EMBEDDING_DIMENSIONS: 'many',
        }),
      (error) =>
        error instanceof ConfigError &&
        error.message.includes('CHAT_PROVIDER') &&
        error.message.includes('EMBEDDING_DIMENSIONS'),
    );
  });

  it('requires a key where the provider does', () => {
    assert.throws(
      () => loadConfig({ ...BASE, CHAT_API_KEY: '' }),
      /CHAT_API_KEY is required for the openai provider/,
    );
  });

  it('requires a base URL for a custom provider', () => {
    assert.throws(
      () => loadConfig({ ...BASE, CHAT_PROVIDER: 'custom' }),
      /CHAT_BASE_URL is required for the custom provider/,
    );
  });

  it('refuses an embedding provider that serves no embeddings', () => {
    assert.throws(
      () => loadConfig({ ...BASE, EMBEDDING_PROVIDER: 'groq' }),
      /groq serves no embeddings/,
    );
  });
});
