'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import type { WithChildren } from '@/shared/typings';

import { ErrorAlert } from './error-alert';

type ConfirmDeleteProps = WithChildren & {
  /** The modal's question — "Delete this document?". */
  title: string;
  remove: () => Promise<void>;
  onRemoved: () => void;
};

/** `children` is the modal's warning: what the delete takes with it. */
export function ConfirmDelete({
  title,
  remove,
  onRemoved,
  children,
}: ConfirmDeleteProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const deleting = useMutation({ mutationFn: remove, onSuccess: onRemoved });

  return (
    <>
      {/* Beside a long title, a button would shrink past its own label. */}
      <Button variant="default" size="xs" flex="none" onClick={open}>
        Delete
      </Button>
      <Modal
        {...{ opened, title }}
        onClose={() => {
          if (!deleting.isPending) close();
        }}
        centered
      >
        <Stack gap="md">
          <Text size="sm">{children}</Text>
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
