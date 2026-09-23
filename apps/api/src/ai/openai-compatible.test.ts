import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import {
  fakeEmbedding,
  type FakeOpenAi,
  type FakeOpenAiOptions,
  startFakeOpenAi,
} from '../../test/fake-openai.ts';
import { AiProviderError } from './ai-provider.error.ts';
import type { ChatStreamPart } from './models.ts';
import {
  createChatModel,
  createEmbeddingModel,
  type ModelSettings,
} from './openai-compatible.ts';
import { PROVIDER_PRESETS } from './providers.ts';

const DIMENSIONS = 8;

function settings(
  { baseUrl }: FakeOpenAi,
  preset: keyof typeof PROVIDER_PRESETS = 'openai',
): ModelSettings {
  return {
    provider: preset,
    model: 'test-model',
    baseUrl,
    apiKey: 'test-key',
    preset: PROVIDER_PRESETS[preset],
  };
}

function withFake(options: Partial<FakeOpenAiOptions> = {}) {
  const context = { fake: undefined as FakeOpenAi | undefined };

  before(async () => {
    context.fake = await startFakeOpenAi({
      dimensions: DIMENSIONS,
      ...options,
    });
  });
  after(async () => context.fake?.close());

  return () => {
    assert.ok(context.fake);
    context.fake.requests.length = 0;

    return context.fake;
  };
}

async function collect(parts: AsyncIterable<ChatStreamPart>) {
  const collected: ChatStreamPart[] = [];

  for await (const part of parts) {
    collected.push(part);
  }

  return collected;
}

describe('createChatModel', () => {
  const fake = withFake();

  it('completes, and reports usage', async () => {
    const chat = createChatModel(settings(fake()));
    const completion = await chat.complete([
      { role: 'user', content: 'Hello' },
    ]);

    assert.equal(completion.content, 'The documents do not cover that.');
    assert.deepEqual(completion.usage, {
      promptTokens: 5,
      completionTokens: 32,
    });
  });

  it('streams deltas, then usage, asking for usage when the preset reports it', async () => {
    const server = fake();
    const parts = await collect(
      createChatModel(settings(server)).stream([
        { role: 'user', content: 'Hi' },
      ]),
    );

    assert.equal(
      parts
        .flatMap((part) => (part.type === 'delta' ? [part.text] : []))
        .join(''),
      'The documents do not cover that.',
    );
    assert.deepEqual(parts.at(-1), {
      type: 'usage',
      usage: { promptTokens: 2, completionTokens: 32 },
    });
    const [request] = server.requests;

    assert.ok(request);
    assert.deepEqual(request.body['stream_options'], { include_usage: true });
    assert.equal(request.authorization, 'Bearer test-key');
  });

  it('does not ask a custom server for stream usage, and reports none', async () => {
    const server = fake();
    const parts = await collect(
      createChatModel(settings(server, 'custom')).stream([
        { role: 'user', content: 'Hi' },
      ]),
    );

    assert.equal(server.requests[0]?.body['stream_options'], undefined);
    assert.deepEqual(parts.at(-1), { type: 'usage', usage: null });
  });

  it('names the provider and its answer when it refuses', async () => {
    const server = fake();

    // A 4xx is not retried, so one failure is the whole of it.
    server.failNext(401, 'Incorrect API key provided');

    await assert.rejects(
      createChatModel(settings(server)).complete([
        { role: 'user', content: 'Hi' },
      ]),
      (error) =>
        error instanceof AiProviderError &&
        error.status === 401 &&
        error.message.startsWith('openai (test-model): answered 401') &&
        error.message.includes('Incorrect API key provided'),
    );
  });

  it('names the provider when a stream is refused', async () => {
    const server = fake();

    server.failNext(404, 'The model does not exist');

    await assert.rejects(
      collect(
        createChatModel(settings(server)).stream([
          { role: 'user', content: 'Hi' },
        ]),
      ),
      (error) => error instanceof AiProviderError && error.status === 404,
    );
  });

  it('lets a cancellation through as itself, not as a provider failure', async () => {
    const cancel = new AbortController();
    const { signal } = cancel;

    cancel.abort();

    await assert.rejects(
      createChatModel(settings(fake())).complete(
        [{ role: 'user', content: 'Hi' }],
        { signal },
      ),
      (error) => !(error instanceof AiProviderError),
    );
  });
});

type EmbeddingsOverrides = { dimensions?: number; batchSize?: number };

const embeddings = (
  server: FakeOpenAi,
  overrides: EmbeddingsOverrides = {},
  preset: keyof typeof PROVIDER_PRESETS = 'openai',
) =>
  createEmbeddingModel({
    ...settings(server, preset),
    dimensions: overrides.dimensions ?? DIMENSIONS,
    batchSize: overrides.batchSize ?? 64,
  });

describe('createEmbeddingModel', () => {
  const fake = withFake({ shuffleEmbeddings: true });

  it('returns one vector per input, in input order whatever order the provider answers in', async () => {
    const texts = ['alpha', 'beta', 'gamma'];
    const { vectors, usage } = await embeddings(fake()).embed(texts);

    assert.deepEqual(
      vectors,
      texts.map((text) => fakeEmbedding(text, DIMENSIONS)),
    );
    assert.deepEqual(usage, { promptTokens: 'alpha beta gamma'.length });
  });

  it('sends a long list in batches, and sums their usage', async () => {
    const server = fake();
    const texts = ['a', 'b', 'c', 'd', 'e'];
    const { vectors, usage } = await embeddings(server, { batchSize: 2 }).embed(
      texts,
    );

    assert.equal(server.requests.length, 3);
    assert.equal(vectors.length, 5);
    assert.deepEqual(usage, {
      promptTokens: 'a b'.length + 'c d'.length + 'e'.length,
    });
  });

  it('asks for the configured dimension only where the preset takes it', async () => {
    const server = fake();

    await embeddings(server).embed(['x']);
    await embeddings(server, {}, 'ollama').embed(['x']);

    const [openai, ollama] = server.requests;

    assert.ok(openai && ollama);
    assert.equal(openai.body['dimensions'], DIMENSIONS);
    assert.equal(openai.body['encoding_format'], 'float');
    assert.equal(ollama.body['dimensions'], undefined);
  });

  it('refuses vectors of another dimension than the configured one', async () => {
    await assert.rejects(
      embeddings(fake(), { dimensions: DIMENSIONS * 2 }).embed(['x']),
      (error) =>
        error instanceof AiProviderError &&
        error.message.includes(`returned ${DIMENSIONS}-dimensional embeddings`),
    );
  });
});

describe('createEmbeddingModel against a server that reports no usage', () => {
  const fake = withFake({ omitUsage: true });

  it('reports none rather than zero', async () => {
    const { usage } = await createEmbeddingModel({
      ...settings(fake()),
      dimensions: DIMENSIONS,
      batchSize: 64,
    }).embed(['x']);

    assert.equal(usage, null);
  });
});
