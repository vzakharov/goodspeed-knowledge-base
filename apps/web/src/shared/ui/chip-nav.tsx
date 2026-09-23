'use client';

import { Box, Group } from '@mantine/core';

import { cx } from '@/shared/lib/class-names';
import type { LabeledLink } from '@/shared/typings';

import classes from './chip-nav.module.scss';
import { InternalLink } from './internal-link';

/** One destination in the row; the current one renders inert rather than linked. */
export type Chip = LabeledLink & {
  current: boolean;
  /** The language the chip's destination is in, where the row switches one. */
  hrefLang?: string;
};

export type ChipNavProps = { chips: Chip[] };

/**
 * Every alternative shown at once, the current one inverted and inert. A row of
 * links rather than a control, so the switch works before hydration.
 */
export function ChipNav({ chips }: ChipNavProps) {
  return (
    <Group component="nav" gap={8} wrap="wrap" fz="sm" className="print-hidden">
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
