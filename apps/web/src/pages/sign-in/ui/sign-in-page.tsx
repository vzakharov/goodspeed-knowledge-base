'use client';

import { Center, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

import { returnPath } from '@/shared/lib/return-to';

import { useSession } from '@/entities/session';

import { ThemeToggle } from '@/features/switch-theme';

import { SignInForm } from './sign-in-form';

const WIDTH = 400;

/** Leaves for the remembered path the moment a session exists, however it came to. */
function RedirectWhenSignedIn() {
  const session = useSession();
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    // `null` only under the Pages Router, which `apps/web/pages/` exists to
    // keep empty; Next's types cover both.
    if (session.status === 'signed-in') {
      router.replace(returnPath(search ?? new URLSearchParams()));
    }
  }, [session.status, router, search]);

  return null;
}

export function SignInPage() {
  return (
    <Center mih="100dvh" p="md">
      {/* `useSearchParams` needs a boundary in a static export, which has no
          query string to render at build time. */}
      <Suspense>
        <RedirectWhenSignedIn />
      </Suspense>
      <Paper withBorder p="xl" w="100%" maw={WIDTH}>
        <Stack gap="lg">
          <Group justify="space-between" wrap="nowrap">
            <Stack gap={4}>
              <Title order={2}>Knowledge Base</Title>
              <Text size="sm" c="dimmed">
                Your documents, and a chat that answers from them.
              </Text>
            </Stack>
            <ThemeToggle label="Toggle theme" />
          </Group>
          <SignInForm />
        </Stack>
      </Paper>
    </Center>
  );
}
