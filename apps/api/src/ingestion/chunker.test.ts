import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHARS_PER_TOKEN,
  CHUNK_OVERLAP,
  CHUNK_TARGET_TOKENS,
  chunkDocument,
} from './chunker.ts';

const TARGET_CHARS = CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN;

/** `count` distinct sentences of about `length` characters each. */
function sentences(count: number, length = 80) {
  return Array.from({ length: count }, (_, index) => {
    const words = `Sentence ${index} says something about the topic`;

    return `${words}${' and more'.repeat(Math.max(0, Math.ceil((length - words.length) / 9)))}.`;
  }).join(' ');
}

describe('chunkDocument', () => {
  it('keeps a short document whole, under its title', () => {
    const [chunk, ...rest] = chunkDocument({
      title: 'Notes',
      content: 'One paragraph.\n\nAnother paragraph.',
    });

    assert.equal(rest.length, 0);
    assert.equal(chunk?.markdown, 'One paragraph.\n\nAnother paragraph.');
    assert.deepEqual(chunk.headingPath, []);
    assert.equal(
      chunk.embeddedText,
      'Notes\n\nOne paragraph.\n\nAnother paragraph.',
    );
  });

  it('starts a chunk at each top-level section and embeds its heading path', () => {
    const chunks = chunkDocument({
      title: 'Guide',
      content: [
        '# Guide',
        '## Install',
        'Run the installer.',
        '### On Linux',
        'Use the package manager.',
        '## Configure',
        'Edit the file.',
      ].join('\n\n'),
    });

    assert.deepEqual(
      chunks.map(({ headingPath }) => headingPath),
      [
        ['Guide', 'Install'],
        ['Guide', 'Configure'],
      ],
    );
    // A heading with nothing under it yet opens the next chunk rather than
    // being one.
    assert.match(chunks[0]?.markdown ?? '', /^# Guide\n\n## Install\n\nRun/);
    assert.match(
      chunks[0]?.markdown ?? '',
      /### On Linux\n\nUse the package manager\.$/,
    );
    assert.equal(
      chunks[1]?.embeddedText,
      'Guide › Guide › Configure\n\n## Configure\n\nEdit the file.',
    );
  });

  it('never reads a heading inside a code fence', () => {
    const [chunk, ...rest] = chunkDocument({
      title: 'Script',
      content: '## Usage\n\n```sh\n# not a heading\n\nrun --fast\n```\n\nDone.',
    });

    assert.equal(rest.length, 0);
    assert.deepEqual(chunk?.headingPath, ['Usage']);
    assert.match(chunk.markdown, /```sh\n# not a heading\n\nrun --fast\n```/);
  });

  it('packs a long section into chunks near the target size', () => {
    const paragraphs = Array.from({ length: 30 }, (_, index) =>
      sentences(3, 100).replaceAll('Sentence', `Paragraph ${index} sentence`),
    );
    const chunks = chunkDocument({
      title: 'Long',
      content: paragraphs.join('\n\n'),
    });
    const overlapChars = TARGET_CHARS * CHUNK_OVERLAP;

    assert.ok(chunks.length > 1);

    for (const { markdown } of chunks) {
      assert.ok(
        markdown.length <= TARGET_CHARS + overlapChars,
        `${markdown.length}`,
      );
    }

    // Every paragraph lands in some chunk.
    const joined = chunks.map(({ markdown }) => markdown).join('\n\n');

    for (const paragraph of paragraphs) {
      assert.ok(joined.includes(paragraph));
    }
  });

  it('opens a continuing chunk with the tail of the one before it', () => {
    const chunks = chunkDocument({ title: 'Long', content: sentences(80) });
    const [first, second] = chunks;

    assert.ok(first && second);

    const lastSentence = first.markdown.split(/(?<=\.)\s+/).at(-1) ?? '';

    assert.ok(lastSentence !== '');
    assert.ok(
      second.markdown.includes(lastSentence),
      "the seam repeats the previous chunk's last sentence",
    );
  });

  it('does not carry anything across a section break', () => {
    const chunks = chunkDocument({
      title: 'Two',
      content: `## One\n\n${sentences(10)}\n\n## Two\n\nFresh start.`,
    });

    assert.equal(chunks.at(-1)?.markdown, '## Two\n\nFresh start.');
  });

  it('splits a paragraph too long for one chunk by sentences', () => {
    const chunks = chunkDocument({ title: 'Wall', content: sentences(100) });

    assert.ok(chunks.length > 2);

    for (const { markdown } of chunks) {
      assert.match(markdown, /\.$/, 'every chunk ends on a sentence');
    }
  });

  it('splits a single unbroken run of characters by length', () => {
    const chunks = chunkDocument({
      title: 'Blob',
      content: 'x'.repeat(TARGET_CHARS * 2 + 10),
    });

    assert.equal(chunks.length, 3);
    assert.equal(
      chunks.map(({ markdown }) => markdown).join(''),
      'x'.repeat(TARGET_CHARS * 2 + 10),
    );
  });
});
