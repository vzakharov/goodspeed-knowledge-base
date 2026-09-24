#!/usr/bin/env node

// Transcribes an audio recording twice — Deepgram's nova-3 and a local
// faster-whisper — and prints the two merged word by word, so a word either
// model misheard shows up as a disagreement. That text is saved under
// `docs/remove-before-merging/transcripts/`, so it rides the branch for review
// and `/finalize` sweeps it before the branch lands.
//
//   pnpm transcribe <audio-file> [--language <code>]
//
// DEEPGRAM_API_KEY must be set. Whisper runs from a virtualenv under `tmp/`,
// made on first use, and its model (about 1.6 GB) downloads on first use too.
// Without `--language` both models detect it; Deepgram's code-switching `multi`
// does markedly worse than that on a recording in one language, so it is for a
// genuinely mixed one only.

/* eslint-disable no-console -- stdout is this script's interface: the
   transcript, for a person or an agent to read. */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { flag } from './lib/argv.ts';
import { root } from './lib/ledger.ts';

// Terms this project's recordings use, which both models mishear unprompted.
const VOCABULARY = [
  'Next.js',
  'static export',
  'NestJS',
  'Supabase',
  'pgvector',
  'RAG',
  'чанкинг',
  'эмбеддинги',
  'URL',
  'PDF',
  'Railway',
  'PR deployment',
  'Loom',
  'bootstrap',
  'rate limit',
  'Anthropic',
  'OpenAI',
];

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

// Resolves with the command's stdout; its stderr — pip, the model download —
// goes straight to ours.
const run = async (command: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString('utf8'));
      else reject(new Error(`${command} exited ${code}`));
    });
  });

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

const deepgram = async (): Promise<string> => {
  const params = new URLSearchParams({
    model: 'nova-3',
    ...(language === undefined ? { detect_language: 'true' } : { language }),
    smart_format: 'true',
    paragraphs: 'true',
  });
  for (const term of VOCABULARY) params.append('keyterm', term);

  const response = await fetch(`https://api.deepgram.com/v1/listen?${params}`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${key}`,
      'Content-Type': 'application/octet-stream',
    },
    body: readFileSync(file),
  });
  if (!response.ok) {
    throw new Error(
      `Deepgram answered ${response.status}: ${await response.text()}`,
    );
  }

  const {
    results: {
      channels: [
        {
          alternatives: [best],
        },
      ],
    },
  } = Transcription.parse(await response.json());
  return best.paragraphs === undefined
    ? best.transcript
    : best.paragraphs.paragraphs
        .map(({ sentences }) => sentences.map(({ text }) => text).join(' '))
        .join('\n\n');
};

const whisper = async (): Promise<string> => {
  const venv = path.join(root, 'tmp/whisper-venv');
  const python = path.join(venv, 'bin/python');
  if (!existsSync(python)) {
    console.error('transcribe: making the faster-whisper virtualenv');
    await run('python3', ['-m', 'venv', venv]);
  }
  // A no-op once satisfied, and a repair after an install that died partway.
  await run(python, [
    '-m',
    'pip',
    'install',
    '-q',
    '--disable-pip-version-check',
    'faster-whisper==1.2.1',
  ]);

  const stdout = await run(python, [
    path.join(root, 'scripts/whisper-transcribe.py'),
    file,
    ...(language === undefined ? [] : ['--language', language]),
    '--prompt',
    VOCABULARY.join(', '),
  ]);
  return stdout.trim();
};

const name = path.parse(file).name;
// `git diff` compares files, so the two hearings are staged as scratch.
const scratch = path.join(root, 'tmp/transcribe');
const heard = {
  deepgram: path.join(scratch, `${name}.deepgram.txt`),
  whisper: path.join(scratch, `${name}.whisper.txt`),
};
mkdirSync(scratch, { recursive: true });

const [fromDeepgram, fromWhisper] = await Promise.all([deepgram(), whisper()]);
writeFileSync(heard.deepgram, `${fromDeepgram}\n`);
writeFileSync(heard.whisper, `${fromWhisper}\n`);

const diff = spawnSync(
  'git',
  [
    'diff',
    '--no-index',
    '--no-color',
    '--word-diff=plain',
    '--word-diff-regex=[^[:space:]]+',
    '-U1000000',
    heard.deepgram,
    heard.whisper,
  ],
  { encoding: 'utf8' },
);
// `git diff` exits 1 when the files differ, which is the expected case.
if (diff.status !== 0 && diff.status !== 1) {
  throw new Error(`git diff exited ${diff.status}: ${diff.stderr}`);
}
const lines = diff.stdout.split('\n');
const merged = [
  '[-…-] Deepgram only, {+…+} Whisper only; the rest both heard alike.',
  '',
  ...lines.slice(lines.findIndex((line) => line.startsWith('@@')) + 1),
]
  .join('\n')
  .trimEnd();
const out = path.join(
  root,
  'docs/remove-before-merging/transcripts',
  `${name}.txt`,
);
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, `${merged}\n`);

console.log(merged);
console.error(`transcribe: saved ${path.relative(root, out)}`);
