import {
  type AnswerEvent,
  answerEventSchema,
  conversationDetailSchema,
  conversationSchema,
  type Document,
  type DocumentInput,
  documentListSchema,
  documentSchema,
  reembedResultSchema,
  tagListSchema,
  usageReportSchema,
} from '@kb/contracts';
import type { INestApplication } from '@nestjs/common';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { PROVIDER_PRESETS } from '../src/ai/providers.ts';
import { createApp } from '../src/app.ts';
import type { AppConfig } from '../src/config/env.ts';
import {
  type FakeOpenAi,
  NOT_COVERED,
  startFakeOpenAi,
} from './fake-openai.ts';
import { localSupabase, signUp } from './local-supabase.ts';

/**
 * The API end to end: the real app, the local Supabase stack with its
 * policies, and a fake model provider on the HTTP boundary. Two readers, so
 * every read and write is also checked from the side it must not reach.
 */

const DIMENSIONS = 1536;

type Session = Awaited<ReturnType<typeof signUp>>;

let app: INestApplication;
let fake: FakeOpenAi;
let apiUrl: string;
let alice: Session;
let bob: Session;

function fakeModel(name: string) {
  const { baseUrl } = fake;

  return {
    provider: 'custom' as const,
    model: name,
    baseUrl,
    apiKey: undefined,
    preset: { ...PROVIDER_PRESETS.custom, reportsStreamUsage: true },
  };
}

function configFor(
  supabase: ReturnType<typeof localSupabase>,
  dimensions = DIMENSIONS,
): AppConfig {
  return {
    port: 0,
    webOrigin: 'http://localhost:3000',
    supabase,
    chat: fakeModel('fake-chat'),
    embedding: { ...fakeModel('fake-embedding'), dimensions, batchSize: 16 },
  };
}

before(async () => {
  const supabase = localSupabase();

  fake = await startFakeOpenAi({ dimensions: DIMENSIONS });
  app = await createApp(configFor(supabase));
  await app.listen(0, '127.0.0.1');
  apiUrl = await app.getUrl();
  [alice, bob] = await Promise.all([signUp(supabase), signUp(supabase)]);
});

after(async () => {
  await app.close();
  await fake.close();
});

async function call(
  session: Session | undefined,
  method: string,
  path: string,
  body?: unknown,
) {
  return fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      ...(session && { Authorization: `Bearer ${session.token}` }),
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json(response: Response, status = 200): Promise<unknown> {
  const text = await response.text();

  assert.equal(response.status, status, text);

  return text === '' ? undefined : (JSON.parse(text) as unknown);
}

type CreateInput = Omit<DocumentInput, 'tags'> &
  Partial<Pick<DocumentInput, 'tags'>>;

async function create(session: Session, input: CreateInput) {
  return documentSchema.parse(
    await json(
      await call(session, 'POST', '/documents', { tags: [], ...input }),
      201,
    ),
  );
}

async function createConversation(session: Session, title: string) {
  return conversationSchema.parse(
    await json(await call(session, 'POST', '/conversations', { title }), 201),
  );
}

async function ask(session: Session, conversationId: string, content: string) {
  const response = await call(
    session,
    'POST',
    `/conversations/${conversationId}/messages`,
    {
      content,
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get('content-type') ?? '',
    /^text\/event-stream/,
  );

  return (await response.text())
    .split('\n\n')
    .filter((frame) => frame.startsWith('data: '))
    .map((frame): AnswerEvent =>
      answerEventSchema.parse(JSON.parse(frame.slice(6))),
    );
}

const embeddingCalls = () =>
  fake.requests.filter(({ path }) => path === '/v1/embeddings').length;

describe('the API', () => {
  let doc: Document;

  it('answers its health check to anyone, and nothing else', async () => {
    assert.deepEqual(await json(await call(undefined, 'GET', '/health')), {
      status: 'ok',
    });
    await json(await call(undefined, 'GET', '/documents'), 401);
    await json(
      await call({ id: '', token: 'forged' }, 'GET', '/documents'),
      401,
    );
  });

  it('embeds a document as it is created, and answers only once it has', async () => {
    doc = await create(alice, {
      title: 'Espresso',
      content:
        '# Espresso\n\nPull an espresso shot at nine bars of pressure for twenty-five seconds.\n\n## Milk\n\nSteam milk to sixty degrees.',
      tags: ['Coffee', 'coffee', 'kitchen'],
    });

    assert.equal(doc.embedding.status, 'ready');
    assert.equal(doc.embedding.model, 'fake-embedding');
    assert.deepEqual(doc.tags, ['coffee', 'kitchen']);
  });

  it("keeps a reader's documents from every other reader", async () => {
    const bobs = documentListSchema.parse(
      await json(await call(bob, 'GET', '/documents')),
    );

    assert.deepEqual(bobs.documents, []);
    await json(await call(bob, 'GET', `/documents/${doc.id}`), 404);
    await json(
      await call(bob, 'PUT', `/documents/${doc.id}`, {
        title: 'Mine',
        content: 'Now',
        tags: [],
      }),
      404,
    );
    await json(await call(bob, 'POST', `/documents/${doc.id}/embeddings`), 404);
    await json(await call(bob, 'DELETE', `/documents/${doc.id}`), 404);

    const alices = documentListSchema.parse(
      await json(await call(alice, 'GET', '/documents')),
    );

    assert.deepEqual(
      alices.documents.map(({ id, excerpt }) => [id, excerpt.slice(0, 10)]),
      [[doc.id, '# Espresso']],
    );
  });

  it('lists tags and filters by one', async () => {
    await create(alice, {
      title: 'Tea',
      content: 'Brew green tea at eighty degrees.',
      tags: ['kitchen'],
    });

    assert.deepEqual(
      tagListSchema.parse(
        await json(await call(alice, 'GET', '/documents/tags')),
      ),
      {
        tags: [
          { tag: 'kitchen', documents: 2 },
          { tag: 'coffee', documents: 1 },
        ],
      },
    );

    const coffee = documentListSchema.parse(
      await json(await call(alice, 'GET', '/documents?tag=COFFEE')),
    );

    assert.deepEqual(
      coffee.documents.map(({ title }) => title),
      ['Espresso'],
    );
    assert.deepEqual(
      tagListSchema.parse(await json(await call(bob, 'GET', '/documents/tags')))
        .tags,
      [],
    );
  });

  it('re-embeds on an edit to what is embedded, and not on a retag', async () => {
    const { id, title, content } = doc;
    const callsBefore = embeddingCalls();
    const retagged = documentSchema.parse(
      await json(
        await call(alice, 'PUT', `/documents/${id}`, {
          title,
          content,
          tags: ['coffee'],
        }),
      ),
    );

    assert.equal(embeddingCalls(), callsBefore);
    assert.equal(retagged.embedding.status, 'ready');

    const renamed = documentSchema.parse(
      await json(
        await call(alice, 'PUT', `/documents/${id}`, {
          title: 'Espresso at home',
          content,
          tags: ['coffee'],
        }),
      ),
    );

    assert.equal(embeddingCalls(), callsBefore + 1);
    assert.equal(renamed.embedding.status, 'ready');
  });

  it('keeps a document whose embedding failed, says why, and embeds it on retry', async () => {
    fake.failNext(401, 'Invalid API key');

    const failed = await create(alice, {
      title: 'Grinder',
      content: 'Grind fine for espresso.',
    });

    assert.equal(failed.embedding.status, 'failed');
    assert.match(
      failed.embedding.error ?? '',
      /answered 401 — .*Invalid API key/,
    );

    const retried = documentSchema.parse(
      await json(
        await call(alice, 'POST', `/documents/${failed.id}/embeddings`),
      ),
    );

    assert.equal(retried.embedding.status, 'ready');
    assert.equal(retried.embedding.error, null);
  });

  it('re-embeds every outdated document in one call', async () => {
    // The SDK retries a 5xx twice, so three failures are one failed call.
    fake.failNext(500, 'Overloaded', 3);
    const failed = await create(alice, {
      title: 'Scale',
      content: 'Weigh eighteen grams.',
    });

    assert.equal(failed.embedding.status, 'failed');
    assert.deepEqual(
      reembedResultSchema.parse(
        await json(await call(alice, 'POST', '/documents/embeddings')),
      ),
      { ready: 1, failed: 0 },
    );
  });

  describe('chat', () => {
    let conversationId: string;

    before(async () => {
      ({ id: conversationId } = await createConversation(alice, 'Coffee'));
    });

    it('answers from the nearest chunk, streamed, citing it', async () => {
      const events = await ask(
        alice,
        conversationId,
        'How many bars of pressure for an espresso shot?',
      );
      const text = events
        .flatMap((event) => (event.type === 'delta' ? [event.text] : []))
        .join('');
      const done = events.at(-1);

      assert.ok(events.length > 2, 'the answer arrives in pieces');
      assert.match(text, /nine bars of pressure.*\[1]$/);
      assert.equal(done?.type, 'done');
      assert.equal(done.answer.content, text);
      assert.equal(done.answer.model, 'fake-chat');
      const [citation] = done.answer.citations;

      assert.ok(citation);
      assert.equal(citation.documentId, doc.id);
      assert.deepEqual(citation.headingPath, ['Espresso']);
      assert.equal(
        done.question.content,
        'How many bars of pressure for an espresso shot?',
      );
    });

    it('rewrites a follow-up to stand alone before retrieving for it', async () => {
      const requestsBefore = fake.requests.length;
      const events = await ask(
        alice,
        conversationId,
        'And how hot should the milk be steamed?',
      );
      const calls = fake.requests
        .slice(requestsBefore)
        .map(({ path, body }) => [path, body['stream'] === true]);

      assert.deepEqual(calls, [
        ['/v1/chat/completions', false],
        ['/v1/embeddings', false],
        ['/v1/chat/completions', true],
      ]);
      assert.equal(events.at(-1)?.type, 'done');
    });

    it('says so, citing nothing, when no document matches', async () => {
      const { id } = await createConversation(alice, 'Other');
      const done = (await ask(alice, id, 'Qwerty zxcvb?')).at(-1);

      assert.equal(done?.type, 'done');
      assert.equal(done.answer.content, NOT_COVERED);
      assert.deepEqual(done.answer.citations, []);
    });

    it('keeps the history, and keeps it from every other reader', async () => {
      const detail = conversationDetailSchema.parse(
        await json(
          await call(alice, 'GET', `/conversations/${conversationId}`),
        ),
      );

      assert.deepEqual(
        detail.messages.map(({ role }) => role),
        ['user', 'assistant', 'user', 'assistant'],
      );
      await json(
        await call(bob, 'GET', `/conversations/${conversationId}`),
        404,
      );
      await json(
        await call(bob, 'POST', `/conversations/${conversationId}/messages`, {
          content: 'Hi',
        }),
        404,
      );
      assert.deepEqual(await json(await call(bob, 'GET', '/conversations')), {
        conversations: [],
      });
    });

    it('reports a provider failure in the stream, and stores nothing', async () => {
      fake.failNext(429, 'Rate limit reached', 3);

      const events = await ask(alice, conversationId, 'Espresso again?');
      const detail = conversationDetailSchema.parse(
        await json(
          await call(alice, 'GET', `/conversations/${conversationId}`),
        ),
      );

      assert.equal(events.at(-1)?.type, 'error');
      assert.equal(detail.messages.length, 4);
    });

    it('refuses a blank question before opening a stream', async () => {
      await json(
        await call(alice, 'POST', `/conversations/${conversationId}/messages`, {
          content: '  ',
        }),
        400,
      );
    });
  });

  it("reports each reader's own usage", async () => {
    const alices = usageReportSchema.parse(
      await json(await call(alice, 'GET', '/usage')),
    );
    const kinds = new Set(alices.days.map(({ kind }) => kind));

    assert.deepEqual([...kinds].toSorted(), ['chat', 'condense', 'embedding']);
    assert.ok(
      alices.days.every(({ unreportedCalls }) => unreportedCalls === 0),
    );
    assert.deepEqual(
      usageReportSchema.parse(await json(await call(bob, 'GET', '/usage'))),
      {
        days: [],
      },
    );
  });

  it('deletes a document with its chunks', async () => {
    await json(await call(alice, 'DELETE', `/documents/${doc.id}`), 204);
    await json(await call(alice, 'GET', `/documents/${doc.id}`), 404);
  });
});

describe('the API at boot', () => {
  it('refuses to start when the embedding dimension disagrees with the column', async () => {
    const mismatched = await createApp(configFor(localSupabase(), 768));

    await assert.rejects(
      mismatched.init(),
      /EMBEDDING_DIMENSIONS is 768 and document_chunks\.embedding is vector\(1536\)/,
    );
    await mismatched.close();
  });
});
