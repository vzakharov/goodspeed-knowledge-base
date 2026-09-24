import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assemblePdfText, type PdfTextItem } from './assemble-pdf-text';

const FONT = 12;

/** One text item at a baseline, closing its line unless told otherwise. */
const item = (str: string, baseline: number, hasEOL = true): PdfTextItem => ({
  str,
  hasEOL,
  height: FONT,
  transform: [FONT, 0, 0, FONT, 72, baseline],
});

/** Lines set at ordinary leading, top to bottom from `top`. */
const lines = (top: number, ...texts: string[]): PdfTextItem[] =>
  texts.map((text, index) => item(text, top - index * FONT * 1.2));

describe('assemblePdfText', () => {
  it('keeps the lines of a paragraph as lines', () => {
    assert.equal(
      assemblePdfText([lines(700, 'First line', 'second line')]),
      'First line\nsecond line',
    );
  });

  it('joins the items of one line and collapses their spacing', () => {
    assert.equal(
      assemblePdfText([
        [item('Bold', 700, false), item('  and ', 700, false), item('plain', 700)],
      ]),
      'Bold and plain',
    );
  });

  it('starts a paragraph where the gap between lines widens', () => {
    assert.equal(
      assemblePdfText([[...lines(700, 'One', 'two'), ...lines(640, 'Three')]]),
      'One\ntwo\n\nThree',
    );
  });

  it('starts a paragraph where the baseline climbs, as at a new column', () => {
    assert.equal(
      assemblePdfText([[...lines(100, 'Bottom of the left'), ...lines(700, 'Top of the right')]]),
      'Bottom of the left\n\nTop of the right',
    );
  });

  it('mends a word broken across lines', () => {
    assert.equal(
      assemblePdfText([lines(700, 'An exam-', 'ple of it', 'hyphen-', 'ation.')]),
      'An example\nof it\nhyphenation.',
    );
  });

  it('leaves a hyphen before a capitalized line alone', () => {
    assert.equal(
      assemblePdfText([lines(700, 'Anglo-', 'Saxon')]),
      'Anglo-\nSaxon',
    );
  });

  it('separates pages by a blank line and skips pages with no text', () => {
    assert.equal(
      assemblePdfText([lines(700, 'Page one'), [], [item('   ', 700)], lines(700, 'Page four')]),
      'Page one\n\nPage four',
    );
  });

  it('ignores the empty items pdf.js emits to mark a line end', () => {
    assert.equal(
      assemblePdfText([[item('Text', 700, false), item('', 0), ...lines(686, 'more')]]),
      'Text\nmore',
    );
  });
});
