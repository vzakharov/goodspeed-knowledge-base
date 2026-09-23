/**
 * Splits a markdown document into the chunks that are embedded and retrieved.
 *
 * The unit is the markdown block — a paragraph, a list, a table, a fenced code
 * block — so a chunk ends mid-block only where one block alone outgrows a
 * chunk, and a heading inside a code fence is code. Blocks are packed greedily
 * up to a target size;
 * a heading of level 1 or 2 starts a new chunk, since it starts a new topic
 * and a chunk that straddles two answers neither well. A block too large for
 * one chunk is split by sentences, and a sentence too large by words.
 *
 * A chunk that continues the one before it — the split fell mid-section —
 * opens with the tail of that one, so a sentence that answers a question is
 * whole in at least one chunk even when it sits on the seam. A chunk opening a
 * new section does not: there is nothing on that side of the seam to carry.
 *
 * What is embedded is the chunk's text under the document title and the path
 * of headings it sits in, so a chunk that says "it" is still findable by what
 * "it" is. The README explains the numbers below.
 */

import type { Tables } from '../database/database.ts';

/**
 * Characters per token for English prose under the common BPE vocabularies.
 * Estimating from characters keeps any one provider's tokenizer out of the
 * pipeline, at the cost of chunks that run some percent either side of their
 * target in tokens.
 */
export const CHARS_PER_TOKEN = 4;

export const CHUNK_TARGET_TOKENS = 800;

/** Of a chunk that continues the one before it, the share that repeats that one's tail. */
export const CHUNK_OVERLAP = 0.15;

const TARGET_CHARS = CHUNK_TARGET_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = Math.round(TARGET_CHARS * CHUNK_OVERLAP);

// A heading this shallow or shallower opens a new chunk.
const SECTION_LEVEL = 2;

/** A piece of a document, and where in it the piece sits. */
export type PlacedMarkdown = {
  markdown: string;
  /** The headings it sits under, outermost first; a heading's own path includes it. */
  headingPath: string[];
};

/** A chunk as stored and shown: its own markdown, and what was embedded for it. */
export type Chunk = PlacedMarkdown & { embeddedText: string };

type Block = PlacedMarkdown & {
  /** Set on a heading block: its level, 1–6. */
  headingLevel?: number;
};

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Cuts markdown into blocks, tracking the heading path each sits under. */
function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const path: string[] = [];
  let pending: string[] = [];
  let fence: string | undefined;

  const flush = () => {
    const text = pending.join('\n').trim();

    if (text !== '') {
      blocks.push({ markdown: text, headingPath: [...path] });
    }

    pending = [];
  };

  for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
    const fenceMatch = FENCE.exec(line);

    if (fence !== undefined) {
      pending.push(line);

      if (fenceMatch?.[1]?.startsWith(fence) === true) {
        fence = undefined;
        flush();
      }

      continue;
    }

    if (fenceMatch?.[1] !== undefined) {
      flush();
      fence = fenceMatch[1];
      pending.push(line);
      continue;
    }

    const heading = HEADING.exec(line);

    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      flush();
      const level = heading[1].length;
      path.splice(level - 1);
      // A skipped level (`#` then `###`) leaves no hole in the path.
      path.push(heading[2]);
      blocks.push({
        markdown: line.trim(),
        headingLevel: level,
        headingPath: [...path],
      });
      continue;
    }

    if (line.trim() === '') {
      flush();
    } else {
      pending.push(line);
    }
  }

  // An unclosed fence runs to the end of the document, as markdown renders it.
  flush();

  return blocks;
}

const SENTENCE_END = /(?<=[.!?…])\s+(?=\S)/u;

/**
 * Pieces of `text` no longer than `limit`, split at the widest boundary that
 * fits — sentences, then words, then characters.
 */
function splitOversized(text: string, limit: number): string[] {
  if (text.length <= limit) {
    return [text];
  }

  for (const separator of [SENTENCE_END, /\s+/u]) {
    const parts = text.split(separator);

    if (parts.length > 1) {
      return pack(parts, limit, ' ').flatMap((part) =>
        splitOversized(part, limit),
      );
    }
  }

  return Array.from({ length: Math.ceil(text.length / limit) }, (_, index) =>
    text.slice(index * limit, (index + 1) * limit),
  );
}

/** Joins consecutive parts while the result stays within `limit`. */
function pack(parts: string[], limit: number, joiner: string): string[] {
  const packed: string[] = [];
  let current = '';

  for (const part of parts) {
    if (current === '') {
      current = part;
    } else if (current.length + joiner.length + part.length <= limit) {
      current += joiner + part;
    } else {
      packed.push(current);
      current = part;
    }
  }

  if (current !== '') {
    packed.push(current);
  }

  return packed;
}

/** The last whole sentences (or, failing those, words) of `text` within `limit`. */
function tail(text: string, limit: number): string {
  for (const separator of [SENTENCE_END, /\s+/u]) {
    const parts = text.split(separator);
    const kept: string[] = [];
    let length = 0;

    for (const part of parts.toReversed()) {
      if (length + part.length + 1 > limit) {
        break;
      }

      kept.unshift(part);
      length += part.length + 1;
    }

    // Repeating the whole text would be a duplicate chunk, not an overlap.
    if (kept.length > 0 && kept.length < parts.length) {
      return kept.join(' ');
    }
  }

  return '';
}

function isHeading({ headingLevel }: Block) {
  return headingLevel !== undefined;
}

type Draft = {
  blocks: Block[];
  length: number;
  /** The previous chunk's tail this one opens with, empty after a section break. */
  carried: string;
};

export function chunkDocument({
  title,
  content,
}: Pick<Tables<'documents'>, 'title' | 'content'>): Chunk[] {
  const blocks = toBlocks(content).flatMap((block) =>
    splitOversized(block.markdown, TARGET_CHARS).map((markdown) => ({
      ...block,
      markdown,
    })),
  );
  const drafts: Draft[] = [];
  let draft: Draft = { blocks: [], length: 0, carried: '' };

  const close = (next: 'continued' | 'section' | 'end') => {
    // Headings with nothing under them yet are the next section's opening,
    // not a chunk of their own.
    if (next === 'section' && draft.blocks.every((block) => isHeading(block))) {
      return;
    }

    if (draft.blocks.length === 0) {
      return;
    }

    drafts.push(draft);
    const previous = draft.blocks.map(({ markdown }) => markdown).join('\n\n');
    const carried = next === 'continued' ? tail(previous, OVERLAP_CHARS) : '';
    const { length } = carried;

    draft = { blocks: [], length, carried };
  };

  for (const block of blocks) {
    const opensSection =
      block.headingLevel !== undefined && block.headingLevel <= SECTION_LEVEL;

    if (opensSection) {
      close('section');
    } else if (draft.length + block.markdown.length > TARGET_CHARS) {
      close('continued');
    }

    draft.blocks.push(block);
    draft.length += block.markdown.length + 2;
  }

  close('end');

  return drafts.map(({ blocks: drafted, carried }) => {
    const text = drafted.map((block) => block.markdown).join('\n\n');
    const markdown = carried === '' ? text : `${carried}\n\n${text}`;
    // The path the chunk's first body block sits under — the headings it
    // opens with included — or, for a chunk of headings alone, the deepest.
    const headingPath =
      (drafted.find((block) => !isHeading(block)) ?? drafted.at(-1))
        ?.headingPath ?? [];
    const context = [title, ...headingPath].join(' › ');

    return {
      markdown,
      headingPath,
      embeddedText: `${context}\n\n${markdown}`,
    };
  });
}
