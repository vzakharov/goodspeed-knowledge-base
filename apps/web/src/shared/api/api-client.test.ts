/* eslint-disable @typescript-eslint/require-await -- the fake token source stands in for an async one, and has nothing to await */
import assert from 'node:assert/strict';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { after, before, beforeEach, describe, it } from 'node:test';
import { z } from 'zod';

import { ApiRequestError, createApiClient } from './api-client.ts';

type Reply = { status: number; body: string };

let server: Server;
let apiUrl: string;
let reply: Reply;
let received: IncomingMessage & { body: string };

before(async () => {
  server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    request.on('end', () => {
      received = Object.assign(request, { body });
      response.writeHead(reply.status, { 'Content-Type': 'application/json' });
      response.end(reply.body);
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, resolve);
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === 'object');
  apiUrl = `http://localhost:${address.port}`;
});

after(() => server.close());

beforeEach(() => {
  reply = { status: 200, body: '{"name":"kb"}' };
});

const nameSchema = z.object({ name: z.string() });

const clientWith = (token: string | null) =>
  createApiClient({ apiUrl, accessToken: async () => token });

describe('createApiClient', () => {
  it('sends the access token and parses the body with the schema', async () => {
    const api = clientWith('token');

    assert.deepEqual(await api.request('/things', nameSchema), { name: 'kb' });
    assert.equal(received.headers.authorization, 'Bearer token');
    assert.equal(received.method, 'GET');
  });

  it('sends no Authorization header without a session', async () => {
    const api = clientWith(null);

    await api.request('/things', nameSchema);
    assert.equal(received.headers.authorization, undefined);
  });

  it('sends a JSON body as JSON', async () => {
    const api = clientWith(null);

    await api.request('/things', nameSchema, {
      method: 'POST',
      json: { title: 'Notes' },
    });
    assert.equal(received.method, 'POST');
    assert.equal(received.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(received.body), { title: 'Notes' });
  });

  it("raises the API's own message and status on an error", async () => {
    reply = {
      status: 404,
      body: '{"statusCode":404,"error":"Not Found","message":"No such document"}',
    };
    const api = clientWith(null);

    await assert.rejects(
      api.request('/things', nameSchema),
      (error: unknown) =>
        error instanceof ApiRequestError &&
        error.status === 404 &&
        error.message === 'No such document',
    );
  });

  it('raises on an error whose body is not the API’s shape', async () => {
    reply = { status: 502, body: '<html>Bad Gateway</html>' };
    const api = clientWith(null);

    await assert.rejects(
      api.request('/things', nameSchema),
      (error: unknown) =>
        error instanceof ApiRequestError && error.status === 502,
    );
  });

  it('rejects a body the schema does not accept', async () => {
    reply = { status: 200, body: '{"name":42}' };
    const api = clientWith(null);

    await assert.rejects(api.request('/things', nameSchema), z.ZodError);
  });
});
