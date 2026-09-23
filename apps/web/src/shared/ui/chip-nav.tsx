'use client';

import { Box, Group } from '@mantine/core';

import { cx } from '@/shared/lib/class-names';
import type { LabeledLink } from '@/shared/typings';

import classes from './chip-nav.module.scss';
import { InternalLink } from './internal-link';

export type Chip = LabeledLink & {
  current: boolean;
  hrefLang?: string;
};

export type ChipNavProps = { chips: Chip[] };

/**
 * Every alternative shown at once, the current one inverted and inert. A row of
 * links rather than a control, so the switch works before hydration.
 */
export function ChipNav({ chips }: ChipNavProps) {
  return (
    <Group component="nav" gap={8} wrap="wrap" fz="sm">
      {chips.map(({ label, href, current, hrefLang }) =>
        current ? (
          <Box
            key={label}
            component="span"
            aria-current="page"
            className={cx(classes['chip'], classes['chipCurrent'])}
          >
            {label}
          </Box>
        ) : (
          <InternalLink
            key={label}
            {...{ href, hrefLang }}
            underline="never"
            c="inherit"
            className={cx(classes['chip'], classes['chipLink'])}
          >
            {label}
          </InternalLink>
        ),
      )}
    </Group>
  );
}
