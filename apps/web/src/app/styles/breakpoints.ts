import type { MantineBreakpointsValues } from '@mantine/core';

/**
 * The breakpoint scale, written only here. `pnpm styles:codegen` generates
 * `styles/_breakpoints.scss` from it: a media query needs literals, and Sass
 * cannot import TypeScript.
 */
export const breakpoints = {
  xs: '30em',
  sm: '40em',
  md: '48em',
  lg: '64em',
  xl: '80em',
} satisfies MantineBreakpointsValues;
