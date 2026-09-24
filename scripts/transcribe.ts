#!/usr/bin/env node

// Transcribes an audio recording through Deepgram, prints the text in
// paragraphs and saves it under `docs/remove-before-merging/transcripts/`, so
// it rides the branch for review and `/finalize` sweeps it before the merge.
//
//   pnpm transcribe <audio-file> [--language <code>]
//
// DEEPGRAM_API_KEY must be set. Without `--language` the language is detected.
// nova-3's code-switching `multi` does markedly worse than that on a recording
// in one language, so it is for a genuinely mixed one only.

/* eslint-disable no-console -- stdout is this script's interface: the
   transcript, for a person or an agent to read. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { flag } from './lib/argv.ts';
import { root } from './lib/ledger.ts';

const file = process.argv[2];
if (file === undefined || file.startsWith('--')) {
  console.error(
    'transcribe: usage: transcribe <audio-file> [--language <code>]',
  );
  process.exit(2);
}

const key = process.env['DEEPGRAM_API_KEY'];
if (key === undefined || key === '') {
  console.error('transcribe: DEEPGRAM_API_KEY is not set');
  process.exit(2);
}

const language = flag('language');
const params = new URLSearchParams({
  model: 'nova-3',
  ...(language === undefined ? { detect_language: 'true' } : { language }),
  smart_format: 'true',
  paragraphs: 'true',
});

const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
  method: 'POST',
  headers: {
    Authorization: `Token ${key}`,
    'Content-Type': 'application/octet-stream',
  },
  body: readFileSync(file),
});

if (!response.ok) {
  console.error(
    `transcribe: Deepgram answered ${response.status}: ${await response.text()}`,
  );
  process.exit(1);
}

// Only the first channel's best alternative is read; the rest pass unchecked.
const Alternative = z.object({
  transcript: z.string(),
  paragraphs: z
    .object({
      paragraphs: z.array(
        z.object({ sentences: z.array(z.object({ text: z.string() })) }),
      ),
    })
    .optional(),
});
const Channel = z.object({
  alternatives: z.tuple([Alternative], z.unknown()),
});
const Transcription = z.object({
  results: z.object({ channels: z.tuple([Channel], z.unknown()) }),
});

const {
  results: {
    channels: [
      {
        alternatives: [best],
      },
    ],
  },
} = Transcription.parse(await response.json());

const transcript =
  best.paragraphs === undefined
    ? best.transcript
    : best.paragraphs.paragraphs
        .map(({ sentences }) => sentences.map(({ text }) => text).join(' '))
        .join('\n\n');

const out = path.join(
  root,
  'docs/remove-before-merging/transcripts',
  `${path.parse(file).name}.txt`,
);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${transcript}\n`);

console.log(transcript);
console.error(`transcribe: saved to ${path.relative(root, out)}`);
