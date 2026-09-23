import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';

import { readEvents } from './event-stream.ts';

const eventSchema = z.object({ n: z.int() });

/** A body arriving in exactly these pieces. */
function bodyOf(...pieces: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
}

async function collect(body: ReadableStream<Uint8Array>) {
  const events: unknown[] = [];
  for await (const event of readEvents(body, eventSchema)) events.push(event);

  return events;
}

describe('readEvents', () => {
  it('parses each event as it completes', async () => {
    assert.deepEqual(
      await collect(bodyOf('data: {"n":1}\n\ndata: {"n":2}\n\n')),
      [{ n: 1 }, { n: 2 }],
    );
  });

  it('joins an event split byte by byte, inside a character too', async () => {
    const encoded = new TextEncoder().encode('data: {"n":3,"s":"é"}\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of encoded) controller.enqueue(Uint8Array.of(byte));
        controller.close();
      },
    });

    assert.deepEqual(await collect(body), [{ n: 3 }]);
  });

  it('skips an event without data and the field space is optional', async () => {
    assert.deepEqual(await collect(bodyOf(': ping\n\ndata:{"n":4}\n\n')), [
      { n: 4 },
    ]);
  });

  it('drops an event the stream ended before finishing', async () => {
    assert.deepEqual(await collect(bodyOf('data: {"n":5}\n\ndata: {"n"')), [
      { n: 5 },
    ]);
  });

  it('rejects a payload the schema does not accept', async () => {
    await assert.rejects(collect(bodyOf('data: {"n":"six"}\n\n')), z.ZodError);
  });

  it('cancels the body when the consumer stops early', async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"n":7}\n\n'));
      },
      cancel() {
        cancelled = true;
      },
    });

    const events = readEvents(body, eventSchema);

    assert.deepEqual((await events.next()).value, { n: 7 });
    await events.return(undefined);
    assert.equal(cancelled, true);
  });
});
