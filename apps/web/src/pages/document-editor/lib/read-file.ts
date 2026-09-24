import { DOCUMENT_LIMITS } from '@kb/contracts';

import { pdfText } from './pdf-text';

const MEGABYTE = 1024 ** 2;

const CONTENT_LIMIT = DOCUMENT_LIMITS.content.toLocaleString('en');

async function utf8Text(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error('This file is not UTF-8 text', { cause: error });
  }
}

type FileKind = {
  mimeType: string;
  extensions: readonly string[];
  maxBytes: number;
  /** Why a file over `maxBytes` is refused. */
  oversize: string;
  /** Whether the form waits behind an overlay while the file is read. */
  blocks: boolean;
  read: (file: File) => Promise<string>;
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
    read: async (file) => pdfText(await file.arrayBuffer()),
    empty:
      'This PDF has no text to extract — it is probably a scan, and scans are not read here',
  },
];

/** What the Dropzone offers and lets through, in react-dropzone's shape. */
export const ACCEPTED_FILES = Object.fromEntries(
  FILE_KINDS.map(({ mimeType, extensions }) => [mimeType, [...extensions]]),
);

const extensions = FILE_KINDS.flatMap((kind) => kind.extensions);

export const UNSUPPORTED_FILE = `Only ${extensions.slice(0, -1).join(', ')} and ${extensions.at(-1)} files are read here`;

// The extension first: what a browser reports as a `.md` file's type varies by
// operating system, and is as often empty or `application/octet-stream`.
function kindOf({ name, type }: File): FileKind {
  const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
  const kind =
    FILE_KINDS.find((candidate) => candidate.extensions.includes(extension)) ??
    FILE_KINDS.find(({ mimeType }) => mimeType === type);
  if (kind === undefined) throw new Error(UNSUPPORTED_FILE);
  return kind;
}

export const blocksWhileReading = (file: File): boolean => kindOf(file).blocks;

/**
 * The file's text, ready for the Content field, or an error saying in the
 * reader's words why there is none. Text over the document limit is refused
 * rather than cut: a truncated document reads as a whole one.
 */
export async function readDocumentFile(file: File): Promise<string> {
  const { maxBytes, oversize, read, empty } = kindOf(file);
  if (file.size > maxBytes) throw new Error(oversize);

  const text = (await read(file)).replaceAll('\r\n', '\n');
  if (text.trim() === '') throw new Error(empty);
  if (text.length > DOCUMENT_LIMITS.content) {
    throw new Error(
      `The file holds ${text.length.toLocaleString('en')} characters, and a document holds at most ${CONTENT_LIMIT}`,
    );
  }

  return text;
}
