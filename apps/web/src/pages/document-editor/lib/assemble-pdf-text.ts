import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export type PdfTextItem = Pick<TextItem, 'str' | 'hasEOL' | 'transform' | 'height'>;

type Line = { text: string; baseline: number; height: number };

// A line advance past this many times the font's height is a paragraph gap:
// ordinary leading sits around 1.2.
const PARAGRAPH_GAP = 1.5;

// `transform` is the item's text matrix; its sixth entry is the baseline's y,
// measured upward from the page's bottom edge.
const baselineOf = ({ transform }: PdfTextItem): number => transform[5] ?? 0;

function linesOf(items: readonly PdfTextItem[]): Line[] {
  const lines: Line[] = [];
  let current: PdfTextItem[] = [];

  const close = () => {
    const inked = current.filter(({ str }) => str.trim() !== '');
    const text = current
      .map(({ str }) => str)
      .join('')
      .replaceAll(/\s+/gu, ' ')
      .trim();
    const [first] = inked;
    if (first !== undefined && text !== '') {
      lines.push({
        text,
        baseline: baselineOf(first),
        height: Math.max(...inked.map(({ height }) => height)),
      });
    }
    current = [];
  };

  for (const item of items) {
    current.push(item);
    if (item.hasEOL) close();
  }
  close();

  return lines;
}

// A lowercase continuation is what tells a word broken across lines from a
// hyphenated compound ending one, and it cannot tell them apart when the
// compound's second half is lowercase too: `well-` / `known` joins as
// `wellknown`.
const HYPHEN_BREAK = /\p{L}-$/u;
const LOWERCASE_START = /^\p{Ll}/u;

/**
 * Lines stay lines, so a list or a verse keeps its shape; only a word broken
 * across two of them is mended, its second half moving up to join the first.
 */
function paragraphText(lines: readonly string[]): string {
  const mended: string[] = [];

  for (const line of lines) {
    const previous = mended.at(-1);
    if (
      previous === undefined ||
      !HYPHEN_BREAK.test(previous) ||
      !LOWERCASE_START.test(line)
    ) {
      mended.push(line);
      continue;
    }
    const [fragment = '', ...rest] = line.split(' ');
    mended[mended.length - 1] = previous.slice(0, -1) + fragment;
    if (rest.length > 0) mended.push(rest.join(' '));
  }

  return mended.join('\n');
}

function pageText(items: readonly PdfTextItem[]): string {
  const paragraphs: string[][] = [];
  let previous: Line | undefined;

  for (const line of linesOf(items)) {
    const advance =
      previous === undefined ? 0 : previous.baseline - line.baseline;
    const paragraph = paragraphs.at(-1);
    // A baseline that climbs is a new column or a new block, never the next
    // line of the same paragraph.
    if (
      paragraph === undefined ||
      advance <= 0 ||
      advance > PARAGRAPH_GAP * Math.max(line.height, previous?.height ?? 0)
    ) {
      paragraphs.push([line.text]);
    } else {
      paragraph.push(line.text);
    }
    previous = line;
  }

  return paragraphs.map(paragraphText).join('\n\n');
}

/**
 * Plain text from what pdf.js reads off each page: lines where the PDF broke
 * them, a blank line between paragraphs and between pages.
 */
export const assemblePdfText = (pages: readonly PdfTextItem[][]): string =>
  pages
    .map(pageText)
    .filter((text) => text !== '')
    .join('\n\n');
