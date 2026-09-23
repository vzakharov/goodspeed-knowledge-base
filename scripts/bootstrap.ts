#!/usr/bin/env node

/**
 * From a fresh clone to a runnable stack, as `pnpm bootstrap` (after its
 * `pnpm install`). The local Auth key is ES256, so the API verifies tokens
 * against JWKS exactly as it would against a hosted project.
 *
 * Re-running is safe and is how a changed stack reaches the apps: nothing
 * already running is restarted, no data is reset, and an existing `.env` keeps
 * every value in it except the Supabase ones, which follow the stack. A
 * variable a template gained since is appended with its default.
 */

/* eslint-disable no-console -- stdout is this script's interface: the stack's
   progress and the list of what is left to configure. */

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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

/** Writes `<app>/.env` and returns what it now assigns. */
function writeEnv(app: string, fromStack: Record<string, string>) {
  const dir = path.join(root, 'apps', app);
  const template = fs.readFileSync(path.join(dir, '.env.example'), 'utf8');
  const file = path.join(dir, '.env');
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

ensureSigningKey();
supabase(['start']);
supabase(['migration', 'up', '--local']);

const { url, publishableKey } = localSupabase();

const apiEnv = writeEnv('api', {
  SUPABASE_URL: url,
  SUPABASE_PUBLISHABLE_KEY: publishableKey,
});

writeEnv('web', {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
});

try {
  loadConfig(Object.fromEntries(apiEnv));
  console.log('\nReady — `pnpm dev` starts the web app and the API.');
} catch (error) {
  if (!(error instanceof ConfigError)) throw error;

  console.log(
    `\nThe stack is up; the API still needs configuring in apps/api/.env:\n${error.message}\n\nRe-run \`pnpm bootstrap\` to check again, then \`pnpm dev\`.`,
  );
}
