'use client';

import {
  Button,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

import { supabase } from '@/shared/api';
import { oneOf, pick } from '@/shared/lib/collections';
import { ErrorAlert } from '@/shared/ui';

const MODES = ['sign-in', 'sign-up'] as const;

type Mode = (typeof MODES)[number];

type Credentials = { email: string; password: string };

/** Supabase Auth's `minimum_password_length`, checked here before the round trip. */
const MIN_PASSWORD_LENGTH = 6;

const emailSchema = z.email();

const MODE_LABEL = {
  'sign-in': 'Sign in',
  'sign-up': 'Sign up',
} as const satisfies Record<Mode, string>;

const SUBMIT_LABEL = {
  'sign-in': 'Sign in',
  'sign-up': 'Create account',
} as const satisfies Record<Mode, string>;

/**
 * Resolves to whether a session came back. Sign-up returns none when the
 * project confirms email first, which the local stack does not.
 */
async function authenticate(
  mode: Mode,
  credentials: Credentials,
): Promise<boolean> {
  const { data, error } =
    mode === 'sign-in'
      ? await supabase.auth.signInWithPassword(credentials)
      : await supabase.auth.signUp(credentials);
  if (error !== null) throw error;

  return data.session !== null;
}

/**
 * Signing in changes the session, and the page's own subscription to it does
 * the redirect — so this form only ever reports failure.
 */
export function SignInForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const form = useForm<Credentials>({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) =>
        emailSchema.safeParse(value).success ? null : 'Enter an email address',
      password: (value) =>
        value.length >= MIN_PASSWORD_LENGTH
          ? null
          : `At least ${MIN_PASSWORD_LENGTH} characters`,
    },
  });
  const submit = useMutation({
    mutationFn: async (credentials: Credentials) =>
      authenticate(mode, credentials),
  });

  return (
    <form
      onSubmit={form.onSubmit((credentials) => {
        submit.mutate(credentials);
      })}
    >
      <Stack gap="md">
        {/* Unset, the active label is the theme's `white` — the background
            token — and vanishes on the dark indicator. The primary colour
            inverts the pair, as on the primary button. */}
        <SegmentedControl
          fullWidth
          color="monochrome"
          value={mode}
          onChange={(value) => {
            setMode(oneOf(MODES, value));
            submit.reset();
          }}
          data={MODES.map((value) => ({ value, label: MODE_LABEL[value] }))}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete={
            mode === 'sign-in' ? 'current-password' : 'new-password'
          }
          {...form.getInputProps('password')}
        />
        {submit.isError && <ErrorAlert {...pick(submit, 'error')} />}
        {submit.data === false && (
          <Text size="sm">Check your inbox to confirm the address.</Text>
        )}
        <Button type="submit" loading={submit.isPending}>
          {SUBMIT_LABEL[mode]}
        </Button>
      </Stack>
    </form>
  );
}
