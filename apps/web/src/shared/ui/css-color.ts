/**
 * The colour tokens, named only here. `pnpm styles:codegen` generates the
 * `styles/_tokens.scss` mixin that declares them, taking its arguments in this
 * order — so a reorder reassigns both palettes in `src/app/styles/globals.scss`.
 */
export const CSS_COLORS = [
  'background',
  'foreground',
  'border-hairline',
  'border-hairline-strong',
  'surface',
  'surface-strong',
  // Chart series slots, handed to a chart's entities in this fixed order.
  'series-1',
  'series-2',
  'series-3',
] as const;

/** A token missing from here is a type error rather than a dead `var()`. */
export type CssColor = (typeof CSS_COLORS)[number];

export function cssColor(color: CssColor): `var(--color-${CssColor})` {
  return `var(--color-${color})`;
}
