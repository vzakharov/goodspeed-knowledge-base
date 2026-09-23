import type { ChatMessage } from '../ai/index.ts';
import type { PlacedMarkdown } from '../ingestion/index.ts';

/**
 * The prompts of the retrieval-augmented answer, as pure functions of their
 * inputs: what the model is told, and how its citations are read back.
 */

/** A retrieved chunk, as the prompt numbers and names it. */
export type Source = PlacedMarkdown & { documentTitle: string };

/** A turn of the conversation so far, as either side said it. */
export type Turn = Pick<ChatMessage, 'role' | 'content'> & {
  role: 'user' | 'assistant';
};

const CITATION = /\[(\d+)]/g;

/**
 * An earlier answer's `[n]` pointed at sources that are not in this prompt,
 * and left in, the model reads them as pointing at this prompt's `[n]`.
 */
function withoutCitations(text: string) {
  return text.replaceAll(/\s*\[\d+]/g, '');
}

function transcript(turns: Turn[]) {
  return turns
    .map(({ role, content }) =>
      role === 'user'
        ? `User: ${content}`
        : `Assistant: ${withoutCitations(content)}`,
    )
    .join('\n\n');
}

/**
 * Rewrites a follow-up into a question that stands on its own, so retrieval
 * searches for what was meant: "and how do I undo that?" retrieves nothing
 * useful until "that" is named.
 */
export function condensePrompt(
  history: Turn[],
  question: string,
): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        "Rewrite the user's latest question so that it can be understood without the conversation before it: replace every pronoun and reference with what it refers to.",
        'Reply with the rewritten question and nothing else — no answer, no preamble, no quotes.',
        'If the question already stands on its own, reply with it unchanged.',
      ].join(' '),
    },
    {
      role: 'user',
      content: `Conversation:\n\n${transcript(history)}\n\nLatest question: ${question}`,
    },
  ];
}

function formatSource(source: Source, number: number) {
  const location = [source.documentTitle, ...source.headingPath].join(' › ');

  return `[${number}] ${location}\n${source.markdown}`;
}

const ANSWER_RULES = [
  "You are the assistant of a personal knowledge base. You answer the user's questions from excerpts of their own documents, given below as numbered sources.",
  '',
  '- Use only the sources. When they do not contain the answer, say that the documents do not cover it, and say what they do cover if that helps. Do not answer from general knowledge, even when you know the answer.',
  '- After each statement, cite the sources it rests on by number in square brackets, like [1] or [2][3]. Cite nothing that is not a source below.',
  '- Answer in the language of the question, in concise markdown.',
].join('\n');

/**
 * The answer's prompt: the rules and the numbered sources as the system
 * message, then the conversation so far as real turns, then the question.
 * The sources number from 1 in the order given — most similar first.
 */
export function answerPrompt(
  history: Turn[],
  question: string,
  sources: Source[],
): ChatMessage[] {
  const context =
    sources.length === 0
      ? "Sources: none — nothing in the user's documents matched this question."
      : `Sources:\n\n${sources.map((source, index) => formatSource(source, index + 1)).join('\n\n')}`;

  return [
    { role: 'system', content: `${ANSWER_RULES}\n\n${context}` },
    ...history.map(({ role, content }) => ({
      role,
      content: role === 'assistant' ? withoutCitations(content) : content,
    })),
    { role: 'user', content: question },
  ];
}

/**
 * The source numbers an answer cites, in the order it first cites them, with
 * anything that names no source dropped.
 */
export function citedSources(answer: string, sourceCount: number): number[] {
  const cited = [...answer.matchAll(CITATION)]
    .map((match) => Number(match[1]))
    .filter((number) => number >= 1 && number <= sourceCount);

  return [...new Set(cited)];
}
