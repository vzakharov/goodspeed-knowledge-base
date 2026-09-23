import {
  type Document,
  DOCUMENT_LIMITS,
  type DocumentInput,
  documentInputSchema,
} from '@kb/contracts';
import {
  Button,
  Group,
  Input,
  Stack,
  Tabs,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';

import { pick } from '@/shared/lib/collections';
import { ErrorAlert } from '@/shared/ui';

import classes from './document-form.module.scss';
import { Markdown } from './markdown';

const CONTENT_MIN_ROWS = 16;

const EMPTY: DocumentInput = { title: '', content: '', tags: [] };

const editable = (document: Document): DocumentInput =>
  pick(document, 'title', 'content', 'tags');

type DocumentFormProps = {
  /** The document being edited; absent, the form creates one. */
  document?: Document;
  save: (input: DocumentInput) => Promise<Document>;
  onSaved?: (document: Document) => void;
};

/**
 * Sends what the reader typed and takes the API's answer back as the new
 * starting point, so the normalizing the contract does — trimmed title,
 * lowercased and deduplicated tags — shows up in the form once saved.
 */
export function DocumentForm({ document, save, onSaved }: DocumentFormProps) {
  const form = useForm<DocumentInput>({
    initialValues: document === undefined ? EMPTY : editable(document),
    validate: schemaResolver(documentInputSchema, { sync: true }),
  });
  const saving = useMutation({
    mutationFn: save,
    onSuccess: (saved) => {
      form.setInitialValues(editable(saved));
      form.setValues(editable(saved));
      onSaved?.(saved);
    },
  });
  const creating = document === undefined;

  return (
    <form
      onSubmit={form.onSubmit((input) => {
        saving.mutate(input);
      })}
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          maxLength={DOCUMENT_LIMITS.title}
          {...form.getInputProps('title')}
        />
        <TagsInput
          label="Tags"
          description="Enter or comma to add one"
          maxTags={DOCUMENT_LIMITS.tags}
          clearable
          {...form.getInputProps('tags')}
        />
        <Input.Wrapper
          label="Content"
          description="Markdown"
          error={form.errors['content']}
        >
          <Tabs defaultValue="write" keepMounted={false} mt="xs">
            <Tabs.List>
              <Tabs.Tab value="write">Write</Tabs.Tab>
              <Tabs.Tab value="preview">Preview</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="write" pt="sm">
              <Textarea
                aria-label="Content"
                autosize
                minRows={CONTENT_MIN_ROWS}
                maxLength={DOCUMENT_LIMITS.content}
                classNames={{ input: classes['content'] }}
                {...form.getInputProps('content')}
                error={form.errors['content'] !== undefined}
              />
            </Tabs.Panel>
            <Tabs.Panel value="preview" pt="sm">
              {form.values.content.trim() === '' ? (
                <Text c="dimmed">Nothing to preview yet.</Text>
              ) : (
                <Markdown source={form.values.content} />
              )}
            </Tabs.Panel>
          </Tabs>
        </Input.Wrapper>
        {saving.isError && (
          <ErrorAlert
            title="The document was not saved"
            {...pick(saving, 'error')}
          />
        )}
        <Group justify="flex-end" gap="sm">
          {saving.isPending && (
            <Text size="sm" c="dimmed">
              Saving and embedding…
            </Text>
          )}
          <Button
            type="submit"
            loading={saving.isPending}
            disabled={!creating && !form.isDirty()}
          >
            {creating ? 'Create' : 'Save'}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
