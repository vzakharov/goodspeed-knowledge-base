---
description: How styling is layered here — where a rule has to live to win, and which Mantine props are unreachable from a stylesheet
paths:
  - apps/web/src/app/styles/**
  - apps/web/src/app/ui/theme-provider.tsx
  - apps/web/styles/**
  - apps/web/src/shared/ui/css-color.ts
  - '**/*.module.scss'
---

# Styling

Mantine is imported as the `.layer.css` half of each stylesheet, so everything
it ships lives in `@layer mantine`. **Any unlayered rule beats it, whatever the
specificity** — `globals.scss` and every `.module.scss` are
unlayered, so none of them needs `!important` — stylelint's
`declaration-no-important` holds that line.

**`theme-provider.tsx` imports the aggregate `styles.layer.css`, not one sheet
per component.** A per-component list is only safe with a check that a component
in use has its sheet, and the one such check reads the static export's HTML —
where almost nothing here renders, the app living behind sign-in. So the ~25 kB
gzipped the aggregate costs buys every component styled on first use, in
Mantine's own sheet order. A Mantine package outside `@mantine/core` brings its
own `styles.layer.css`, imported beside it.

## What a stylesheet cannot reach

Mantine renders three things as **inline `style`**, which no class can override:

- **Style props** — `p`, `fz`, `lh`, `ml`, `opacity`, and friends.
- **`vars` from a component's varsResolver** — `--button-bg`, `--ai-size`,
  `--stack-gap`, `--list-spacing`, …
- **Anything a visual value in `theme.components[…].defaultProps` produces.**

So a value that a stylesheet has to override later belongs in a CSS module, not on the call site. Variant colours belong in
`theme.variantColorResolver`; `defaultProps` is for props that render as data
attributes (`underline`), never for sizes or colours.

## Colours

Never write a colour literal in a component. The tokens are declared in
`apps/web/src/app/styles/globals.scss` as `--color-*` and reached from TSX through
`cssColor()`. Which tokens exist is settled by the `CSS_COLORS` array in
`apps/web/src/shared/ui/css-color.ts`, which types `cssColor()` and generates the
mixin that declares them (§ "SCSS"). They are colour-scheme aware, so nothing
branches on the scheme itself.

Mantine's own variables are bound to those tokens by the `cssVariablesResolver`
in `apps/web/src/app/ui/theme-provider.tsx`, not by a `:root` block. Mantine renders its
variable block as a `<style data-mantine-styles>` at the top of `<body>` — after
every stylesheet in `<head>`, on the same `:root` selector — so a `--mantine-*`
override written in a stylesheet loses on document order at equal specificity.
The `--color-*` tokens are safe there because Mantine never declares those
names.

## `white` and `black` are bound to the tokens, and Mantine does not know it

`theme.white` is the **background** token and `theme.black` the **foreground**
one, so a filled control paints background-coloured text on a foreground-coloured
fill in either scheme. Mantine's own stylesheet was written against a literal
palette, though, and a handful of its rules reach for `--mantine-color-white` as
"the readable colour in the dark scheme" — which here is the colour of the
surface behind the text. Its inline-`code` rule is one, which is why
`prose.scss` states that colour itself. Suspect this first when something is
invisible in exactly one scheme.

The tinted variants are the same trap on the monochrome palette: `light`,
`outline` and `dot` on an `Alert` or `Badge` lose their text in one scheme or
the other. A neutral notice is a `Card`, a neutral badge `outline` or
`default`; a real palette colour (`red` for a failure) renders in both.

## Rendered markdown

`apps/web/src/app/styles/prose.scss` owns the rhythm of the HTML
`react-markdown` renders, under `.prose-content`; its header carries what an
edit there must keep. **Mantine's `Typography` is no substitute for it**: its
element rules paint `code`, `pre` and `blockquote` on `--mantine-color-gray-0`,
a literal light grey that stays light in the dark scheme.

## SCSS

Every stylesheet here is Sass — a co-located `.module.scss` per component, plain
`.scss` for the global sheets. Two root partials carry what they share:
`styles/_mantine.scss` for the `light` / `dark` / `hover` / `smaller-than` /
`larger-than` mixins and the forwarded breakpoint scale, `apps/web/styles/_tokens.scss`
for the colour-token mixin each palette calls. Pull either in per file with a relative
`@use '…/_mantine' as mantine`, which keeps a module's dependencies visible in
the module; relative because Sass resolves its own imports and knows nothing
about the `@/` alias.

**Mantine documents those mixins as a PostCSS preset, and that route cannot
work here.** Next runs Sass before PostCSS, so `@include smaller-than(…)` reads
as an undefined _Sass_ mixin and fails the build before PostCSS sees the file.
Reach for `_mantine.scss`, not the preset.

**`_breakpoints.scss` and `_tokens.scss` are generated** from
`apps/web/src/app/styles/breakpoints.ts` and `apps/web/src/shared/ui/css-color.ts`
by `pnpm styles:codegen` (`scripts/generate-styles.ts` carries why): edit the
TypeScript and re-run it, never the partial. `_mantine.scss` forwards the
breakpoints, so a call site reaches `mantine.$breakpoint-sm`; the sheets that
declare a palette `@use` the token mixin directly. A new token is a new required
parameter of that mixin, so every `@include tokens.colors(…)` must pass it or
the Sass build fails.
