import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

const statusSchema = z.object({
  API_URL: z.url(),
  PUBLISHABLE_KEY: z.string().min(1),
});

/**
 * The local stack `pnpm setup` started, read from the Supabase CLI itself so
 * a test needs no environment of its own. Throws with the command to run when
 * the stack is down.
 */
export function localSupabase() {
  let output: string;

  try {
    output = execFileSync(
      'pnpm',
      ['exec', 'supabase', 'status', '-o', 'json'],
      {
        cwd: path.join(import.meta.dirname, '..', '..', '..'),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (error) {
    throw new Error(
      'The local Supabase stack is not running — start it with `pnpm db:start`',
      { cause: error instanceof Error ? error : new Error(String(error)) },
    );
  }

  const status = statusSchema.parse(JSON.parse(output));

  return { url: status.API_URL, publishableKey: status.PUBLISHABLE_KEY };
}

const sessionSchema = z.object({
  access_token: z.string(),
  user: z.object({ id: z.uuid() }),
});

/** Signs a fresh user up through Supabase Auth, as the web app does. */
export async function signUp({
  url,
  publishableKey,
}: ReturnType<typeof localSupabase>) {
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: `e2e-${randomUUID()}@example.com`,
      password: `pw-${randomUUID()}`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Sign-up failed: ${response.status} ${await response.text()}`,
    );
  }

  const {
    access_token: token,
    user: { id },
  } = sessionSchema.parse(await response.json());

  return { id, token };
}
