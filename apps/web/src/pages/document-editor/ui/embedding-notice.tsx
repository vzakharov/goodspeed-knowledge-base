import type { Document } from '@kb/contracts';
import { Button, Group, Stack, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import type { WithId } from '@/shared/typings';
import { Card, ErrorAlert } from '@/shared/ui';

import { embeddingExplanation, reembedDocument } from '@/entities/document';

type EmbeddingNoticeProps = WithId & Pick<Document, 'embedding'>;

/**
 * Offers a retry wherever the chat cannot reach the document. A save embeds
 * again on its own, so this is for a document whose content has not changed.
 */
export function EmbeddingNotice({ id, embedding }: EmbeddingNoticeProps) {
  const reembed = useMutation({ mutationFn: async () => reembedDocument(id) });

  if (embedding.status === 'ready') return null;

  return (
    <Card>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Stack gap={4}>
            <Text fw={700}>
              {embedding.status === 'failed'
                ? 'Embedding failed'
                : 'The chat cannot search this document'}
            </Text>
            <Text size="sm">{embeddingExplanation(embedding)}</Text>
          </Stack>
          <Button
            variant="default"
            size="xs"
            loading={reembed.isPending}
            onClick={() => {
              reembed.mutate();
            }}
          >
            Embed again
          </Button>
        </Group>
        {reembed.isError && <ErrorAlert {...pick(reembed, 'error')} />}
      </Stack>
    </Card>
  );
}
