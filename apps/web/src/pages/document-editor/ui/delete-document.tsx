import type { Document } from '@kb/contracts';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { pick } from '@/shared/lib/collections';
import type { WithId } from '@/shared/typings';
import { ErrorAlert } from '@/shared/ui';

import { deleteDocument, documentsHref } from '@/entities/document';

export function DeleteDocument({
  id,
  title,
}: Pick<Document, 'title'> & WithId) {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const deleting = useMutation({
    mutationFn: async () => deleteDocument(id),
    onSuccess: () => {
      router.push(documentsHref(null));
    },
  });

  return (
    <>
      <Button variant="default" size="xs" onClick={open}>
        Delete
      </Button>
      <Modal
        {...{ opened }}
        onClose={() => {
          if (!deleting.isPending) close();
        }}
        title="Delete this document?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            “{title}” and its embeddings are deleted, and the chat stops
            answering from it. This cannot be undone.
          </Text>
          {deleting.isError && <ErrorAlert {...pick(deleting, 'error')} />}
          <Group justify="flex-end" gap="sm">
            <Button
              variant="default"
              onClick={close}
              disabled={deleting.isPending}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={deleting.isPending}
              onClick={() => {
                deleting.mutate();
              }}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
