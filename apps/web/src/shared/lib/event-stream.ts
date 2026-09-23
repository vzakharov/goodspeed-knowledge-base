import type { z } from 'zod';

const EVENT_BOUNDARY = '\n\n';
const DATA_FIELD = /^data: ?/;

/**
 * A reader as the async iterable a `ReadableStream` is by spec, which Safari
 * does not implement. Stopping early — a `break`, a throw — cancels the stream.
 */
function chunksOf<T>(
  reader: ReadableStreamDefaultReader<T>,
): AsyncIterable<T, undefined> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        const result = await reader.read();

        return result.done ? { done: true, value: undefined } : result;
      },
      return: async () => {
        await reader.cancel();

        return { done: true, value: undefined };
      },
    }),
  };
}

/** An event's `data:` lines, joined as the spec joins them; null when it has none. */
function dataOf(event: string): string | null {
  const lines = event
    .split('\n')
    .filter((line) => DATA_FIELD.test(line))
    .map((line) => line.replace(DATA_FIELD, ''));

  return lines.length === 0 ? null : lines.join('\n');
}

/**
 * The events of a `text/event-stream` body, each `data:` payload parsed as JSON
 * with the schema, as they arrive. Only what the API sends is read: `data:`
 * fields, events ending in a blank `\n` line. A consumer that stops early
 * cancels the body, which closes the connection.
 */
export async function* readEvents<Schema extends z.ZodType>(
  body: ReadableStream<Uint8Array>,
  schema: Schema,
): AsyncGenerator<z.infer<Schema>> {
  const decoder = new TextDecoder();
  let buffered = '';

  for await (const chunk of chunksOf(body.getReader())) {
    // `stream` holds back a character whose bytes are split across chunks.
    buffered += decoder.decode(chunk, { stream: true });
    const events = buffered.split(EVENT_BOUNDARY);
    // The last piece is an event still arriving, or the empty rest after one.
    buffered = events.pop() ?? '';

    for (const event of events) {
      const data = dataOf(event);
      if (data !== null) yield schema.parse(JSON.parse(data));
    }
  }
}
