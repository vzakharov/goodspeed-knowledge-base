#!/usr/bin/env node

// Transcribes an audio recording through Deepgram and prints the text in
// paragraphs.
//
//   pnpm transcribe <audio-file> [--language <code>]
//
// DEEPGRAM_API_KEY must be set. `--language` defaults to `multi`, nova-3's
// code-switching mode, so a recording that mixes Russian and English comes out
// in both rather than forced into one.

/* eslint-disable no-console -- stdout is this script's interface: the
   transcript, for a person or an agent to read. */

import { readFileSync } from 'node:fs';
import { z } from 'zod';

import { flag } from './lib/argv.ts';

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

const params = new URLSearchParams({
  model: 'nova-3',
  language: flag('language') ?? 'multi',
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

console.log(
  best.paragraphs === undefined
    ? best.transcript
    : best.paragraphs.paragraphs
        .map(({ sentences }) => sentences.map(({ text }) => text).join(' '))
        .join('\n\n'),
);
