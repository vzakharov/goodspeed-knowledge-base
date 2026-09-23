'use client';

import {
  AppShell,
  Button,
  Center,
  Group,
  Loader,
  Text,
  Tooltip,
} from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { signInHref } from '@/shared/lib/return-to';
import type { LabeledLink, WithChildren } from '@/shared/typings';
import { InternalLink } from '@/shared/ui';

import { signOut, useSession } from '@/entities/session';

import { ThemeToggle } from '@/features/switch-theme';

const HEADER_HEIGHT = 56;

/** The signed-in app's sections, in the header's order. */
const NAV: LabeledLink[] = [{ label: 'Overview', href: '/' }];

function SignOutButton() {
  const signingOut = useMutation({ mutationFn: signOut });

  return (
    <Tooltip
      label={signingOut.error?.message}
      disabled={!signingOut.isError}
      color="red"
      opened={signingOut.isError}
    >
      <Button
        variant="default"
        size="xs"
        loading={signingOut.isPending}
        onClick={() => {
          signingOut.mutate();
        }}
      >
        Sign out
      </Button>
    </Tooltip>
  );
}

/**
 * Every route behind sign-in renders inside this. The guard is client-side by
 * necessity — a static export has no server to check a session on — so what it
 * protects is the UI; the data is protected by the API and row-level security,
 * which answer a request without a valid token with nothing.
 */
export function SignedInLayout({ children }: WithChildren) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status === 'signed-out') {
      router.replace(signInHref(pathname + globalThis.location.search));
    }
  }, [session.status, router, pathname]);

  if (session.status !== 'signed-in') {
    return (
      <Center mih="100dvh">
        <Loader aria-label="Loading" />
      </Center>
    );
  }

  return (
    <AppShell header={{ height: HEADER_HEIGHT }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group component="nav" gap="lg" wrap="nowrap">
            <Text fw={700}>Knowledge Base</Text>
            {NAV.map(({ label, href }) => (
              <InternalLink
                key={href}
                {...{ href }}
                size="sm"
                fw={pathname === href ? 700 : 400}
                aria-current={pathname === href ? 'page' : undefined}
              >
                {label}
              </InternalLink>
            ))}
          </Group>
          <Group gap="sm" wrap="nowrap">
            <Text size="sm" c="dimmed" visibleFrom="sm" truncate>
              {session.session.user.email}
            </Text>
            <ThemeToggle label="Toggle theme" />
            <SignOutButton />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
