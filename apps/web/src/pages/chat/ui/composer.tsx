import { QUESTION_LENGTH } from '@kb/contracts';
import { Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useState } from 'react';

type ComposerProps = {
  /** Another answer is being written: the reader can type, not send. */
  busy: boolean;
  /** The answer being written is this conversation's, so it can be stopped here. */
  stoppable: boolean;
  onAsk: (question: string) => void;
  onStop: () => void;
};

const MIN_ROWS = 2;
const MAX_ROWS = 10;

/** Enter sends and Shift+Enter breaks the line, as in every chat the reader has used. */
export function Composer({ busy, stoppable, onAsk, onStop }: ComposerProps) {
  const [question, setQuestion] = useState('');
  const sendable = !busy && question.trim() !== '';

  const send = () => {
    if (!sendable) return;
    onAsk(question.trim());
    setQuestion('');
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <Stack gap="xs">
        <Textarea
          aria-label="Question"
          placeholder="Ask about your documents"
          autosize
          minRows={MIN_ROWS}
          maxRows={MAX_ROWS}
          maxLength={QUESTION_LENGTH}
          value={question}
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send();
            }
          }}
        />
        <Group justify="space-between" wrap="nowrap">
          <Text size="xs" c="dimmed">
            Answers come from your documents, citing what they use.
          </Text>
          {stoppable ? (
            <Button variant="default" onClick={onStop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!sendable}>
              Ask
            </Button>
          )}
        </Group>
      </Stack>
    </form>
  );
}
