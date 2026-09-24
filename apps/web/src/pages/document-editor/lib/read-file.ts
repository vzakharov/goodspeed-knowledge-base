import { DOCUMENT_LIMITS } from '@kb/contracts';

import { pdfText } from './pdf-text';

const MEGABYTE = 1024 ** 2;

const CONTENT_LIMIT = DOCUMENT_LIMITS.content.toLocaleString('en');

async function utf8Text(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    // What a fatal decoder throws on a malformed sequence.
    if (!(error instanceof TypeError)) throw error;
    throw new Error('This file is not UTF-8 text', { cause: error });
  }
}

type FileKind = {
  mimeType: string;
  extensions: readonly string[];
  maxBytes: number;
  /** Why a file over `maxBytes` is refused. */
  oversize: string;
  /** Whether the page waits for the file, as for one slow enough to notice. */
  blocks: boolean;
  read: (file: File, signal?: AbortSignal) => Promise<string>;
  /** Why a file of this kind came out with no text. */
  empty: string;
};

const TEXT = {
  // UTF-8 spends at most four bytes on a character, so a text file past this
  // holds more than a document may.
  maxBytes: DOCUMENT_LIMITS.content * 4,
  oversize: `The file holds more text than a document can: at most ${CONTENT_LIMIT} characters`,
  blocks: false,
  read: utf8Text,
  empty: 'This file is empty',
};

const FILE_KINDS: readonly FileKind[] = [
  { mimeType: 'text/plain', extensions: ['.txt'], ...TEXT },
  { mimeType: 'text/markdown', extensions: ['.md', '.markdown'], ...TEXT },
  {
    mimeType: 'application/pdf',
    extensions: ['.pdf'],
    maxBytes: 50 * MEGABYTE,
    oversize: 'The PDF is over 50 MB',
    blocks: true,
    read: async (file, signal) => pdfText(await file.arrayBuffer(), signal),
    empty:
      'This PDF has no text to extract — it is probably a scan, and scans are not read here',
  },
];

/** What the Dropzone offers and lets through, in react-dropzone's shape. */
export const ACCEPTED_FILES = Object.fromEntries(
  FILE_KINDS.map(({ mimeType, extensions }) => [mimeType, [...extensions]]),
);

/** `.txt, .md, .markdown, or .pdf` — the kinds read, as a reader is told them. */
export const ACCEPTED_EXTENSIONS = new Intl.ListFormat('en', {
  type: 'disjunction',
}).format(FILE_KINDS.flatMap(({ extensions }) => extensions));

export const UNSUPPORTED_FILE = `Only ${ACCEPTED_EXTENSIONS} files are read here`;

// The extension first: what a browser reports as a `.md` file's type varies by
// operating system, and is as often empty or `application/octet-stream`.
function findKind({ name, type }: File): FileKind | undefined {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  return (
    FILE_KINDS.find((kind) => kind.extensions.includes(extension)) ??
    FILE_KINDS.find(({ mimeType }) => mimeType === type)
  );
}

export const blocksWhileReading = (file: File): boolean =>
  findKind(file)?.blocks ?? false;

/**
 * The file's text, ready for the Content field, or an error saying in the
 * reader's words why there is none. Text over the document limit is refused
 * rather than cut: a truncated document reads as a whole one.
 */
export async function readDocumentFile(
  file: File,
  signal?: AbortSignal,
): Promise<string> {
  const kind = findKind(file);
  if (kind === undefined) throw new Error(UNSUPPORTED_FILE);
  const { maxBytes, oversize, read, empty } = kind;
  if (file.size > maxBytes) throw new Error(oversize);

  const text = (await read(file, signal)).replaceAll('\r\n', '\n');
  if (text.trim() === '') throw new Error(empty);
  if (text.length > DOCUMENT_LIMITS.content) {
    throw new Error(
      `The file holds ${text.length.toLocaleString('en')} characters, and a document holds at most ${CONTENT_LIMIT}`,
    );
  }

  return text;
}

/** A title for the document a file came from: its name, less the extension. */
export const titleFromFileName = (name: string): string =>
  name
    .replace(/\.[^.]+$/u, '')
    .trim()
    .slice(0, DOCUMENT_LIMITS.title);
