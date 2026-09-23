import { Button, Group, Text } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import { Card, ErrorAlert } from '@/shared/ui';

import { documentQueries, reembedOutdated } from '@/entities/document';

/**
 * Counts over every document rather than the filtered list, since the fix
 * re-embeds every one of them.
 */
export function OutdatedNotice() {
  const all = useQuery(documentQueries.list(null));
  const reembed = useMutation({ mutationFn: reembedOutdated });

  const outdated =
    all.data?.documents.filter(({ embedding }) => embedding.status !== 'ready')
      .length ?? 0;

  if (reembed.isError) {
    return (
      <ErrorAlert title="Re-embedding failed" {...pick(reembed, 'error')} />
    );
  }
  if (outdated === 0) return null;

  return (
    <Card>
      <Group justify="space-between">
        <Text size="sm">
          {outdated === 1
            ? 'One document is not searchable.'
            : `${outdated} documents are not searchable.`}{' '}
          The chat answers only from embedded documents.
        </Text>
        <Button
          variant="default"
          size="xs"
          loading={reembed.isPending}
          onClick={() => {
            reembed.mutate();
          }}
        >
          Re-embed
        </Button>
      </Group>
    </Card>
  );
}
