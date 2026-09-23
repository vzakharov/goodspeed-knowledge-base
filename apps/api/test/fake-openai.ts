import { createHash } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { text as readText } from 'node:stream/consumers';
import { z } from 'zod';

import type { WithDimensions } from '../src/ai/index.ts';
import type { ModelSettings } from '../src/ai/openai-compatible.ts';
import { listen } from './listen.ts';

/**
 * A local server speaking the slice of the OpenAI API the knowledge base uses
 * — chat completions, streamed or not, and embeddings — so the real client
 * code is tested against the HTTP boundary rather than a stub of itself.
 *
 * Its embeddings are hashed bags of words, normalized: deterministic, and
 * similar exactly where texts share words, so retrieval over them ranks the
 * way a test can predict. Its answers quote the first source they were given
 * and cite it as [1], or say the documents do not cover the question.
 */

export type RecordedRequest = {
  path: string;
  body: Record<string, unknown>;
  authorization: string | undefined;
};

/** `baseUrl` is what a client is pointed at, `/v1` included. */
export type FakeOpenAi = Pick<ModelSettings, 'baseUrl'> & {
  requests: RecordedRequest[];
  /** Answers the next `count` requests with this status and message instead. */
  failNext: (status: number, message: string, count?: number) => void;
  close: () => Promise<void>;
};

export type FakeOpenAiOptions = WithDimensions & {
  /** Leaves `usage` out of every response, as some compatible servers do. */
  omitUsage?: boolean;
  /** Answers embeddings in reverse order, each with its right `index`. */
  shuffleEmbeddings?: boolean;
};

export const NOT_COVERED = 'The documents do not cover that.';

const WORD = /[\p{L}\p{N}]+/gu;

export function fakeEmbedding(text: string, dimensions: number) {
  const vector = Array.from({ length: dimensions }, () => 0);

  for (const [word] of text.toLowerCase().matchAll(WORD)) {
    const slot =
      createHash('sha256').update(word).digest().readUInt32BE(0) % dimensions;

    vector[slot] = (vector[slot] ?? 0) + 1;
  }

  const norm = Math.hypot(...vector) || 1;

  return vector.map((value) => value / norm);
}

const bodySchema = z.record(z.string(), z.unknown());

const chatBodySchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  stream: z.boolean().optional(),
  stream_options: z
    .object({ include_usage: z.boolean().optional() })
    .optional(),
});

type ChatBody = z.infer<typeof chatBodySchema>;

function answerTo({ messages }: ChatBody) {
  const system = messages[0]?.content ?? '';

  if (system.startsWith('Rewrite')) {
    return (
      (messages.at(-1)?.content ?? '').split('Latest question: ').at(-1) ?? ''
    );
  }

  // The first line of prose in source [1] — past its location line and any
  // heading the chunk opens with.
  const firstSource = /\n\[1] [^\n]*\n([\S\s]*?)(?:\n\n\[2] |$)/
    .exec(system)?.[1]
    ?.split('\n')
    .find((line) => line.trim() !== '' && !line.startsWith('#'));

  return firstSource === undefined
    ? NOT_COVERED
    : `Your notes say: ${firstSource} [1]`;
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

export async function startFakeOpenAi(
  options: FakeOpenAiOptions,
): Promise<FakeOpenAi> {
  const requests: RecordedRequest[] = [];
  let failures:
    { status: number; message: string; remaining: number } | undefined;

  const usage = (prompt: number, completion?: number) =>
    options.omitUsage === true
      ? {}
      : {
          usage: {
            prompt_tokens: prompt,
            ...(completion !== undefined && { completion_tokens: completion }),
            total_tokens: prompt + (completion ?? 0),
          },
        };

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const body = bodySchema.parse(JSON.parse(await readText(request)));
    const path = request.url ?? '';

    const { authorization } = request.headers;

    requests.push({ path, body, authorization });

    if (failures && failures.remaining > 0) {
      const { status, message } = failures;

      failures.remaining -= 1;
      json(response, status, { error: { message, type: 'test_failure' } });

      return;
    }

    if (path === '/v1/embeddings') {
      const inputs = [body['input']].flat().map(String);
      const data = inputs.map((input, index) => ({
        object: 'embedding',
        index,
        embedding: fakeEmbedding(input, options.dimensions),
      }));

      json(response, 200, {
        object: 'list',
        model: body['model'],
        data: options.shuffleEmbeddings === true ? data.toReversed() : data,
        ...usage(inputs.join(' ').length),
      });

      return;
    }

    if (path === '/v1/chat/completions') {
      const chat = chatBodySchema.parse(body);
      const text = answerTo(chat);
      const promptLength = chat.messages
        .map(({ content }) => content)
        .join('').length;

      if (chat.stream !== true) {
        json(response, 200, {
          object: 'chat.completion',
          model: body['model'],
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: text },
              finish_reason: 'stop',
            },
          ],
          ...usage(promptLength, text.length),
        });

        return;
      }

      response.writeHead(200, { 'Content-Type': 'text/event-stream' });

      for (const piece of text.split(/(?<= )/)) {
        response.write(
          `data: ${JSON.stringify({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content: piece }, finish_reason: null }] })}\n\n`,
        );
      }

      if (
        chat.stream_options?.include_usage === true &&
        options.omitUsage !== true
      ) {
        response.write(
          `data: ${JSON.stringify({ object: 'chat.completion.chunk', choices: [], ...usage(promptLength, text.length) })}\n\n`,
        );
      }

      response.end('data: [DONE]\n\n');

      return;
    }

    json(response, 404, { error: { message: `No route ${path}` } });
  }

  const server = createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
      json(response, 500, { error: { message: String(error) } });
    });
  });

  const origin = await listen(server);

  return {
    baseUrl: `${origin}/v1`,
    requests,
    failNext: (status, message, count = 1) => {
      failures = { status, message, remaining: count };
    },
    close: async () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}
