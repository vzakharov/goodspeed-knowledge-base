import { Alert } from '@mantine/core';

import classes from './error-alert.module.scss';

type ErrorAlertProps = {
  error: Error;
  /** What failed, above the error's own message. */
  title?: string;
};

export function ErrorAlert({ error, title }: ErrorAlertProps) {
  return (
    <Alert
      color="red"
      variant="light"
      classNames={{ message: classes['message'] }}
      {...{ title }}
    >
      {error.message}
    </Alert>
  );
}
