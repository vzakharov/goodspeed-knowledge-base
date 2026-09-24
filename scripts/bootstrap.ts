#!/usr/bin/env node

/**
 * From a fresh clone to a runnable stack, as `pnpm bootstrap` (after its
 * `pnpm install`). The local Auth key is ES256, so the API verifies tokens
 * against JWKS exactly as it would against a hosted project.
 *
 * Re-running is safe and is how a changed stack reaches the apps: nothing
 * already running is restarted, no data is reset, and an existing `.env` keeps
 * every value in it except the Supabase ones, which follow the stack. A
 * variable a template gained since is appended with its default. A model API
 * key the configured provider requires is asked for while it is empty.
 */

/* eslint-disable no-console -- stdout is this script's interface: the stack's
   progress and the list of what is left to configure. */

import password from '@inquirer/password';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import {
  PROVIDER_NAMES,
  PROVIDER_PRESETS,
} from '../apps/api/src/ai/providers.ts';
import { ConfigError, loadConfig } from '../apps/api/src/config/env.ts';
import { localSupabase } from '../apps/api/test/local-supabase.ts';

const root = path.join(import.meta.dirname, '..');

/**
 * Runs the Supabase CLI with its progress, on stderr, passed through, and its
 * stdout — a JSON dump on success — held back. A failure's reason is in that
 * stdout too, so a failing command prints it and exits.
 */
function supabase(args: string[]) {
  try {
    execFileSync('pnpm', ['exec', 'supabase', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
  } catch (error) {
    const stdout =
      error instanceof Error &&
      'stdout' in error &&
      typeof error.stdout === 'string'
        ? error.stdout.trim()
        : '';

    console.error(
      `\`supabase ${args.join(' ')}\` failed${stdout === '' ? '' : `:\n${stdout}`}`,
    );
    process.exit(1);
  }
}

function ensureSigningKey() {
  const file = path.join(root, 'supabase', 'signing_keys.json');

  if (fs.existsSync(file)) return;

  // The shape `supabase gen signing-key` prints, which the CLI cannot be asked
  // to write here: it reads the configured file before generating, and fails
  // on the missing file it would have created.
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
  });
  const key = {
    ...privateKey.export({ format: 'jwk' }),
    kid: crypto.randomUUID(),
    alg: 'ES256',
    use: 'sig',
    key_ops: ['sign', 'verify'],
    ext: true,
  };

  fs.writeFileSync(file, `${JSON.stringify([key], null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(`Generated ${path.relative(root, file)}`);
}

const ASSIGNMENT = /^[A-Z][\dA-Z_]*=/;

/** A `NAME=value` line split at its first `=`; comments and blanks are `undefined`. */
function assignment(line: string) {
  if (!ASSIGNMENT.test(line)) return;

  const at = line.indexOf('=');

  return [line.slice(0, at), line.slice(at + 1)] as const;
}

function parseEnv(text: string) {
  return new Map(
    text.split('\n').flatMap((line) => {
      const pair = assignment(line);

      return pair ? [pair] : [];
    }),
  );
}

/** `text` with each of `values` assigned in place, and those it lacked appended. */
function assign(text: string, values: Map<string, string>) {
  const pending = new Map(values);
  const lines = text.split('\n').map((line) => {
    const name = assignment(line)?.[0];

    if (name === undefined || !pending.has(name)) return line;

    const value = pending.get(name);

    pending.delete(name);

    return `${name}=${value}`;
  });
  const appended = [...pending].map(([name, value]) => `${name}=${value}`);

  return `${[...lines, ...appended].join('\n').trimEnd()}\n`;
}

const envFile = (app: string) => path.join(root, 'apps', app, '.env');

/** Writes `<app>/.env` and returns what it now assigns. */
function writeEnv(app: string, fromStack: Record<string, string>) {
  const file = envFile(app);
  const template = fs.readFileSync(`${file}.example`, 'utf8');
  const existing = fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : undefined;

  const stack = new Map(Object.entries(fromStack));
  const current = parseEnv(existing ?? '');
  const added = [...parseEnv(template)].filter(
    ([name]) => !current.has(name) && !stack.has(name),
  );
  const text =
    existing === undefined
      ? assign(template, stack)
      : assign(existing, new Map([...added, ...stack]));

  fs.writeFileSync(file, text);
  console.log(
    existing === undefined
      ? `Wrote apps/${app}/.env`
      : `Updated apps/${app}/.env${added.length > 0 ? ` (added ${added.map(([name]) => name).join(', ')})` : ''}`,
  );

  return parseEnv(text);
}

const providerSchema = z.enum(PROVIDER_NAMES);

/**
 * Asks for `<capability>_API_KEY` where its provider requires one and `env`
 * leaves it empty. Enter answers with `chatKey`, or skips the key without one;
 * `undefined` is a key skipped or never asked for.
 */
async function askForApiKey(
  env: Map<string, string>,
  capability: 'CHAT' | 'EMBEDDING',
  chatKey = '',
) {
  const name = `${capability}_API_KEY`;
  const provider = providerSchema.safeParse(env.get(`${capability}_PROVIDER`));

  if (
    !provider.success ||
    !PROVIDER_PRESETS[provider.data].requiresApiKey ||
    (env.get(name) ?? '') !== ''
  ) {
    return;
  }

  const answer = await password({
    message: `${name} for ${provider.data} (Enter ${chatKey === '' ? 'skips' : 'reuses the chat key'}):`,
    mask: true,
  });
  const key = answer.trim() === '' ? chatKey : answer.trim();

  return key === '' ? undefined : key;
}

/**
 * The API keys `.env` still needs, asked for — the operator may not have one to
 * hand, so each is skippable. Where the embeddings reach the same endpoint as
 * the chat, they default to its key. Off a terminal nothing is asked, and the
 * closing check names what is missing.
 */
async function askForApiKeys(env: Map<string, string>) {
  const answers = new Map<string, string>();

  if (!process.stdin.isTTY) return answers;

  const chat = await askForApiKey(env, 'CHAT');
  const sameEndpoint =
    env.get('CHAT_PROVIDER') === env.get('EMBEDDING_PROVIDER') &&
    env.get('CHAT_BASE_URL') === env.get('EMBEDDING_BASE_URL');
  const embedding = await askForApiKey(
    env,
    'EMBEDDING',
    sameEndpoint ? (chat ?? env.get('CHAT_API_KEY')) : undefined,
  );

  if (chat !== undefined) answers.set('CHAT_API_KEY', chat);
  if (embedding !== undefined) answers.set('EMBEDDING_API_KEY', embedding);

  return answers;
}

/** Assigns `values` in `<app>/.env` and returns what it now assigns. */
function updateEnv(app: string, values: Map<string, string>) {
  const file = envFile(app);
  const text = assign(fs.readFileSync(file, 'utf8'), values);

  if (values.size > 0) {
    fs.writeFileSync(file, text);
    console.log(`Set ${[...values.keys()].join(', ')} in apps/${app}/.env`);
  }

  return parseEnv(text);
}

ensureSigningKey();
supabase(['start']);
supabase(['migration', 'up', '--local']);

const { url, publishableKey } = localSupabase();

const writtenApiEnv = writeEnv('api', {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
});

writeEnv('web', {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
});

const apiKeys = await askForApiKeys(writtenApiEnv).catch((error: unknown) => {
  // Ctrl-C at a prompt: the keys already answered are not written.
  if (error instanceof Error && error.name === 'ExitPromptError') {
    process.exit(130);
  }

  throw error;
});
const apiEnv = updateEnv('api', apiKeys);

try {
  loadConfig(Object.fromEntries(apiEnv));
  console.log('\nReady — `pnpm dev` starts the web app and the API.');
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;

  console.log(
    `\nThe stack is up; the API still needs configuring in apps/api/.env:\n${error.message}\n\nRe-run \`pnpm bootstrap\` to check again, then \`pnpm dev\`.`,
  );
}
