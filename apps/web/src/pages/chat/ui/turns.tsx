import type { Citation, Message } from '@kb/contracts';
import { Box, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { pick } from '@/shared/lib/collections';
import { Card, InternalLink, Markdown } from '@/shared/ui';

import { documentHref } from '@/entities/document';

import classes from './turns.module.scss';

export function Question({ content }: Pick<Message, 'content'>) {
  return (
    <Box className={classes['question']}>
      <Card>
        <Text className={classes['questionText']}>{content}</Text>
      </Card>
    </Box>
  );
}

const HEADING_LINE = /^#{1,6}\s/;

function Source({
  index,
  documentId,
  documentTitle,
  headingPath,
  excerpt,
}: Citation) {
  // A document that opens on its title as a heading would name it twice, and
  // the trail already says which headings the excerpt sits under.
  const trail =
    headingPath[0] === documentTitle ? headingPath.slice(1) : headingPath;
  const passage = excerpt
    .split('\n')
    .filter((line) => !HEADING_LINE.test(line))
    .join('\n');

  return (
    <Stack gap={2}>
      <Text size="sm">
        <Text span c="dimmed">
          [{index}]{' '}
        </Text>
        <InternalLink href={documentHref(documentId)} fw={700}>
          {documentTitle}
        </InternalLink>
        {trail.length > 0 && (
          <Text span c="dimmed">
            {' › '}
            {trail.join(' › ')}
          </Text>
        )}
      </Text>
      <Text size="xs" c="dimmed" lineClamp={2}>
        {passage}
      </Text>
    </Stack>
  );
}

type AnswerProps = Pick<Message, 'content'> &
  Partial<Pick<Message, 'citations' | 'model'>> & {
    /** Shown under the answer in place of its sources, while it is written. */
    status?: ReactNode;
  };

/**
 * A source is the passage as it read when the answer was written; its link
 * opens the document as it is now.
 */
export function Answer({
  content,
  citations = [],
  model,
  status,
}: AnswerProps) {
  return (
    <Stack gap="sm">
      {content !== '' && <Markdown source={content} />}
      {status}
      {citations.length > 0 && (
        <Stack gap="xs" className={classes['sources']}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Sources
          </Text>
          {citations.map((citation) => (
            <Source key={citation.index} {...citation} />
          ))}
        </Stack>
      )}
      {model !== undefined && model !== null && (
        <Text size="xs" c="dimmed">
          {model}
        </Text>
      )}
    </Stack>
  );
}

type TurnProps = { message: Message };

export function Turn({ message }: TurnProps) {
  return message.role === 'user' ? (
    <Question {...pick(message, 'content')} />
  ) : (
    <Answer {...message} />
  );
}
