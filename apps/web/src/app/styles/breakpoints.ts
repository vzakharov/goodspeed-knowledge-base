import type { MantineBreakpointsValues } from '@mantine/core';

/**
 * The design's own breakpoint scale, and the only place it is written.
 * `styles/_breakpoints.scss` is generated from here by `pnpm styles:codegen`:
 * Sass needs the numbers as literals, since a media-query condition cannot
 * read a custom property, and cannot import TypeScript.
 */
export const breakpoints = {
  xs: '30em',
  sm: '40em',
  md: '48em',
  lg: '64em',
  xl: '80em',
} satisfies MantineBreakpointsValues;
