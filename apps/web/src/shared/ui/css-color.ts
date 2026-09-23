/**
 * The site's colour tokens, and the only place their names are written.
 * `styles/_tokens.scss` is generated from this array by `pnpm styles:codegen`,
 * so the mixin that declares the `--color-*` properties and the union that
 * reads them cannot drift; the order is the order that mixin takes its palette
 * in.
 *
 * Every palette declares all of them — light and dark in
 * `src/app/styles/globals.scss`, print in `src/app/styles/print.scss` — so
 * call sites never branch on the scheme.
 */
export const CSS_COLORS = [
  'background',
  'foreground',
  'border-hairline',
  'border-hairline-strong',
  'surface',
  'surface-strong',
] as const;

/** A token missing from here is a type error rather than a dead `var()`. */
export type CssColor = (typeof CSS_COLORS)[number];

export function cssColor(color: CssColor): `var(--color-${CssColor})` {
  return `var(--color-${color})`;
}
