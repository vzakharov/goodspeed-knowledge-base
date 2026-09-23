'use client';

import { type AiSettings, aiSettingsSchema } from '@kb/contracts';
import { Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/shared/api';
import { pick } from '@/shared/lib/collections';
import type { Labeled } from '@/shared/typings';
import { Card, ErrorAlert, PageShell, Section } from '@/shared/ui';

type ModelCardProps = Labeled &
  AiSettings['chat'] & {
    detail?: string;
  };

function ModelCard({ label, provider, model, detail }: ModelCardProps) {
  return (
    <Card>
      <Stack gap={4}>
        <Text size="xs" tt="uppercase" c="dimmed">
          {label}
        </Text>
        <Text ff="monospace">{model}</Text>
        <Text size="sm" c="dimmed">
          {provider}
          {detail !== undefined && ` · ${detail}`}
        </Text>
      </Stack>
    </Card>
  );
}

/** Which models the API answers with — the configuration the brief asks to be swappable. */
function AiSettings() {
  const settings = useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: async ({ signal }) =>
      api.request('/settings/ai', aiSettingsSchema, { signal }),
  });

  if (settings.isPending) return <Loader size="sm" />;
  if (settings.isError) {
    return (
      <ErrorAlert title="The API did not answer" {...pick(settings, 'error')} />
    );
  }

  const { chat, embedding } = settings.data;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <ModelCard label="Chat" {...chat} />
      <ModelCard
        label="Embeddings"
        {...embedding}
        detail={`${embedding.dimensions} dimensions`}
      />
    </SimpleGrid>
  );
}

export function HomePage() {
  return (
    <PageShell>
      <Section id="overview">
        <Title order={1}>Knowledge Base</Title>
        <Text>Documents, and a chat that answers from them.</Text>
        <Title order={2} size="h4">
          Models
        </Title>
        <AiSettings />
      </Section>
    </PageShell>
  );
}
