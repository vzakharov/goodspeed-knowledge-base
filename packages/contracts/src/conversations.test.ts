import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CONVERSATION_TITLE_LENGTH,
  conversationTitleFrom,
} from './conversations.ts';

describe('conversationTitleFrom', () => {
  it('keeps a short question whole', () => {
    assert.equal(conversationTitleFrom('What is RAG?'), 'What is RAG?');
  });

  it('takes the first line and collapses its whitespace', () => {
    assert.equal(
      conversationTitleFrom('  What   is\tRAG?\nAnd why?'),
      'What is RAG?',
    );
  });

  it('cuts a long question at a word boundary', () => {
    const title = conversationTitleFrom(`${'word '.repeat(40)}end`);

    assert.ok(title.length <= CONVERSATION_TITLE_LENGTH);
    assert.match(title, /^(?:word )*word…$/);
  });

  it('cuts a question with no spaces at the limit', () => {
    const title = conversationTitleFrom('x'.repeat(200));

    assert.equal(title, `${'x'.repeat(CONVERSATION_TITLE_LENGTH - 1)}…`);
  });
});
