import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  answerPrompt,
  citedSources,
  condensePrompt,
  type Source,
} from './prompt.ts';

const SOURCES: Source[] = [
  {
    documentTitle: 'Setup',
    headingPath: ['Install'],
    markdown: 'Run pnpm setup.',
  },
  { documentTitle: 'Setup', headingPath: [], markdown: 'Docker is required.' },
];

describe('answerPrompt', () => {
  it('numbers the sources in the system message, under their location', () => {
    const [system] = answerPrompt([], 'How do I install it?', SOURCES);

    assert.equal(system?.role, 'system');
    assert.match(system.content, /\[1] Setup › Install\nRun pnpm setup\./);
    assert.match(system.content, /\[2] Setup\nDocker is required\./);
  });

  it('says so when nothing matched, rather than sending an empty context', () => {
    const [system] = answerPrompt([], 'Anything?', []);

    assert.match(system?.content ?? '', /Sources: none/);
  });

  it('replays the conversation as turns, stripped of their old citations', () => {
    const messages = answerPrompt(
      [
        { role: 'user', content: 'What does it need?' },
        { role: 'assistant', content: 'Docker [2] and pnpm [1].' },
      ],
      'Which version?',
      SOURCES,
    );

    assert.deepEqual(
      messages.slice(1).map(({ role, content }) => [role, content]),
      [
        ['user', 'What does it need?'],
        ['assistant', 'Docker and pnpm.'],
        ['user', 'Which version?'],
      ],
    );
  });
});

describe('condensePrompt', () => {
  it('hands the model the transcript and the latest question', () => {
    const [, user] = condensePrompt(
      [
        { role: 'user', content: 'How do I install it?' },
        { role: 'assistant', content: 'Run pnpm setup [1].' },
      ],
      'And undo that?',
    );

    assert.equal(
      user?.content,
      'Conversation:\n\nUser: How do I install it?\n\nAssistant: Run pnpm setup.\n\nLatest question: And undo that?',
    );
  });
});

describe('citedSources', () => {
  it('reads the numbers in the order they are first cited, once each', () => {
    assert.deepEqual(citedSources('A [2]. B [1][2]. C [2].', 3), [2, 1]);
  });

  it('drops numbers that name no source', () => {
    assert.deepEqual(citedSources('A [0]. B [4]. C [3].', 3), [3]);
  });

  it('finds nothing in an answer that cites nothing', () => {
    assert.deepEqual(citedSources('The documents do not cover it.', 3), []);
  });
});
