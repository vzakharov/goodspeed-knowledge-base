'use client';

import {
  Anchor,
  type AnchorProps,
  Button,
  type ButtonProps,
  type ElementProps,
} from '@mantine/core';
import Link from 'next/link';

import type { Anchored, WithOptionalClassName } from '@/shared/typings';

// `ElementProps` omits what `AnchorProps` claims, so a plain anchor attribute —
// `hrefLang`, `target` — reaches the `<a>` without the two types shadowing.
export type InternalLinkProps = Anchored &
  AnchorProps &
  WithOptionalClassName &
  ElementProps<'a', keyof AnchorProps | 'href' | 'className'>;

/**
 * Another page of this app, through `next/link`. The pairing sits behind this
 * client boundary because React cannot serialise `next/link` into Mantine's
 * `component` prop from a server component.
 */
export function InternalLink({ href, children, ...props }: InternalLinkProps) {
  return (
    <Anchor component={Link} {...{ href }} {...props}>
      {children}
    </Anchor>
  );
}

/** The call-to-action shape of the same pairing. */
export function InternalButton({
  href,
  children,
  ...props
}: ButtonProps & Anchored) {
  return (
    <Button component={Link} {...{ href }} {...props}>
      {children}
    </Button>
  );
}
