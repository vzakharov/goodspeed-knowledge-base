import type { Document } from '@kb/contracts';
import { Alert, Button, Group, Text } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import type { WithId } from '@/shared/typings';
import { ErrorAlert } from '@/shared/ui';

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
    <Alert
      variant="light"
      color={embedding.status === 'failed' ? 'red' : undefined}
      title={
        embedding.status === 'failed'
          ? 'Embedding failed'
          : 'The chat cannot search this document'
      }
    >
      <Group justify="space-between" align="flex-end">
        <Text size="sm">{embeddingExplanation(embedding)}</Text>
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
    </Alert>
  );
}
