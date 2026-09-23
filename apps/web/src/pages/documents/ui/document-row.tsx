import type { DocumentSummary } from '@kb/contracts';
import { Badge, Group, Stack, Text } from '@mantine/core';

import { Card, InternalLink } from '@/shared/ui';

import { documentHref, EmbeddingBadge } from '@/entities/document';

const updatedFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
});

type DocumentRowProps = { document: DocumentSummary };

export function DocumentRow({ document }: DocumentRowProps) {
  const { id, title, excerpt, tags, embedding, updatedAt } = document;

  return (
    <Card>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <InternalLink href={documentHref(id)} size="lg" fw={700}>
            {title}
          </InternalLink>
          <EmbeddingBadge {...{ embedding }} />
        </Group>
        <Text size="sm" c="dimmed" lineClamp={2}>
          {excerpt}
        </Text>
        <Group gap="xs">
          {tags.map((tag) => (
            <Badge key={tag} variant="default" radius="sm" tt="none">
              {tag}
            </Badge>
          ))}
          <Text size="xs" c="dimmed" ml="auto">
            Updated {updatedFormat.format(new Date(updatedAt))}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
