import { Alert } from '@mantine/core';

type ErrorAlertProps = {
  error: Error;
  /** What failed, above the error's own message. */
  title?: string;
};

export function ErrorAlert({ error, title }: ErrorAlertProps) {
  return (
    <Alert color="red" variant="light" {...{ title }}>
      {error.message}
    </Alert>
  );
}
