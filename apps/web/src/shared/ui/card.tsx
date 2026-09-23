import { Paper } from '@mantine/core';

import type { Described, Linked, Titled, WithChildren } from '@/shared/typings';

import classes from './card.module.scss';

/** A heading and the prose under it — the copy every card kind renders. */
export type Summarized = Titled & Described;

/** The label a screen reader reads, the card's own markup not being one. */
type CardLinkProps = Linked & {
  'aria-label': string;
};

export function Card({ children }: WithChildren) {
  return (
    <Paper withBorder className={classes['card']}>
      {children}
    </Paper>
  );
}

/**
 * Makes a whole card one link off the site. Rendered as the card's first child,
 * an overlay rather than a wrapper: an anchor cannot nest, so a link the card
 * holds itself stays clickable by painting over this one.
 */
export function CardLink({ href, 'aria-label': ariaLabel }: CardLinkProps) {
  return (
    <a
      {...{ href }}
      target="_blank"
      rel="noopener noreferrer"
      className={classes['link']}
      aria-label={ariaLabel}
    />
  );
}
