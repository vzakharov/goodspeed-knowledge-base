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
`apps/web/src/shared/ui/css-color.ts` — it types `cssColor()` and generates the mixin
that declares them, so adding one is a single edit there. They are
colour-scheme aware, so nothing branches on the scheme itself.

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

## Rendered markdown

`apps/web/src/app/styles/prose.scss` owns the whole rhythm of the HTML
`react-markdown` renders — a document's body and the chat's answers: sizes,
leading, vertical spacing, rules, tables that scroll inside the column —
scoped under `.prose-content`, which sits on the element holding the markup.
The markup is wrapped in nothing.

**Long-form copy is not on the site's UI scale, and Mantine's `Typography` is
not a substitute for this sheet.** `--mantine-line-height` and
`--mantine-font-size-*` are sized for controls: 1.55 is right on a button label
and cramped on a paragraph of an essay, and `Typography`'s own element rules
reach for `--mantine-color-gray-0` behind `code`, `pre` and `blockquote` — a
literal light grey that survives into the dark scheme. Every base rule here is
`:where()`, so its specificity is the class alone and a component sheet or an
element-specific rule below overrides it without out-specifying it.

**A `:where()` selector cannot be split across a Sass nesting level.** Nesting
`&:last-child` under `:where(tbody tr)` compiles to `:where(tbody tr):last-child`
— the pseudo-class now sits outside the wrapper and weighs, which is the one
thing the wrapper exists to prevent. Anything that belongs inside the
parentheses is written out in full, however much it repeats.

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

Both of the shared scales are written once in TypeScript, and their Sass halves
are **generated** by `pnpm styles:codegen` — TypeScript is the source because it
is the side a type can constrain, and Sass cannot import it:

| Written in                               | Generates                           | Why Sass needs its own copy                                                                           |
| ---------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/styles/breakpoints.ts` | `apps/web/styles/_breakpoints.scss` | A media-query condition cannot read a custom property, so the numbers have to be literals.            |
| `apps/web/src/shared/ui/css-color.ts`    | `apps/web/styles/_tokens.scss`      | Sass is what declares the `--color-*` properties; TypeScript only types the names `cssColor()` reads. |

`_mantine.scss` forwards the breakpoint partial, so a call site still reaches
`mantine.$breakpoint-sm`; the token mixin is `@use`d directly by the sheets that
declare a palette. Change either scale in its TypeScript and re-run the
generator — and forgetting to is caught either way, since the vet run runs the
generator itself and fails when it had to rewrite something, hand-edits of the
partial included.

Adding a colour token therefore cannot half-land: the generated mixin gains a
required parameter, and every `@include tokens.colors(…)` that does not pass it
fails the Sass build outright rather than defaulting.
