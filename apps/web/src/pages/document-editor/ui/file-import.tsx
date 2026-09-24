import { Button, Group, Loader, Modal, Stack, Text } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { useDisclosure } from '@mantine/hooks';
import { useMutation } from '@tanstack/react-query';
import { FileCheck, FileUp, FileX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { WithSignal } from '@/shared/typings';
import { ErrorAlert } from '@/shared/ui';

import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_FILES,
  blocksWhileReading,
  readDocumentFile,
  UNSUPPORTED_FILE,
} from '../lib/read-file';
import classes from './file-import.module.scss';

const ICON_SIZE = 20;

type FileImportProps = {
  /** Whether Content holds text a file would replace, which asks first. */
  replaces: boolean;
  onRead: (text: string, file: File) => void;
};

type Reading = WithSignal & { file: File };

const rejectionError = (rejections: FileRejection[]) =>
  new Error(
    rejections.some(({ errors }) =>
      errors.some(({ code }) => code === 'too-many-files'),
    )
      ? 'Drop one file at a time'
      : UNSUPPORTED_FILE,
  );

/**
 * A drop target in the field and another over the whole page, both reading
 * the file in the browser. A PDF holds the page behind a modal until its text
 * is in, or until the reader cancels.
 */
export function FileImport({ replaces, onRead }: FileImportProps) {
  const [file, setFile] = useState<File>();
  const [confirming, confirm] = useDisclosure(false);
  const [rejection, setRejection] = useState<Error>();
  const controllerRef = useRef<AbortController>(undefined);
  const reading = useMutation({
    mutationFn: async ({ file: read, signal }: Reading) =>
      readDocumentFile(read, signal),
  });

  // Leaving the page mid-read stops the worker rather than letting it finish
  // a document nobody is waiting for.
  useEffect(() => {
    const controllers = controllerRef;
    return () => {
      controllers.current?.abort();
    };
  }, []);

  const read = (target: File) => {
    setRejection(undefined);
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    reading.mutate(
      { file: target, signal },
      {
        onSuccess: (text) => {
          onRead(text, target);
        },
      },
    );
  };

  const cancel = () => {
    controllerRef.current?.abort();
    reading.reset();
  };

  const drop = {
    accept: ACCEPTED_FILES,
    multiple: false,
    classNames: { root: classes['dropzone'] },
    onDrop: ([dropped]: File[]) => {
      if (dropped === undefined) return;
      setFile(dropped);
      if (replaces) confirm.open();
      else read(dropped);
    },
    onReject: (rejections: FileRejection[]) => {
      reading.reset();
      setRejection(rejectionError(rejections));
    },
  };

  const error = rejection ?? reading.error ?? undefined;
  const blocking =
    reading.isPending && blocksWhileReading(reading.variables.file);

  return (
    <Stack gap="xs" mt="xs">
      <Dropzone {...drop} p="md">
        <Group justify="center" gap="sm" wrap="nowrap">
          <Dropzone.Accept>
            <FileCheck size={ICON_SIZE} aria-hidden />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <FileX size={ICON_SIZE} aria-hidden />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <FileUp size={ICON_SIZE} aria-hidden />
          </Dropzone.Idle>
          <Text size="sm" c="dimmed">
            Drop a {ACCEPTED_EXTENSIONS} file here, or click to choose one
          </Text>
        </Group>
      </Dropzone>
      <Dropzone.FullScreen
        {...drop}
        classNames={{ ...drop.classNames, inner: classes['fill'] }}
        active={!reading.isPending && !confirming}
      >
        <Stack align="center" justify="center" gap="sm" h="100%">
          <FileUp size={ICON_SIZE * 2} aria-hidden />
          <Text>Drop the file to read its text into Content</Text>
        </Stack>
      </Dropzone.FullScreen>
      {error !== undefined && (
        <ErrorAlert title="The file was not read" {...{ error }} />
      )}
      <Modal
        opened={confirming}
        onClose={confirm.close}
        title="Replace the current content?"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            The text of {file?.name} takes the place of what Content holds now.
            Nothing is saved until you save.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={confirm.close}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                confirm.close();
                if (file !== undefined) read(file);
              }}
            >
              Replace
            </Button>
          </Group>
        </Stack>
      </Modal>
      <Modal
        opened={blocking}
        onClose={cancel}
        title="Reading the PDF"
        withCloseButton={false}
        closeOnClickOutside={false}
        centered
      >
        <Stack align="center" gap="md">
          <Loader size="sm" />
          <Text size="sm">{file?.name}</Text>
          <Button variant="default" size="xs" onClick={cancel}>
            Cancel
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
