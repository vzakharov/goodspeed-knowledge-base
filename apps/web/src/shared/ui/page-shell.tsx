import { Box, Container } from '@mantine/core';

import type { WithChildren } from '@/shared/typings';

import classes from './page-shell.module.scss';

/**
 * The padded full-height frame and reading measure the site's pages share. The
 * article page is the exception: a wider column, and print re-keys the padding.
 */
export function PageShell({ children }: WithChildren) {
  return (
    <Box className={classes['page']}>
      <Container size={896} px={0}>
        {children}
      </Container>
    </Box>
  );
}
