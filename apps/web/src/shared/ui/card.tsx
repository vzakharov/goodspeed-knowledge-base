import { Paper } from '@mantine/core';

import type { WithChildren } from '@/shared/typings';

import classes from './card.module.scss';

export function Card({ children }: WithChildren) {
  return (
    <Paper withBorder className={classes['card']}>
      {children}
    </Paper>
  );
}
