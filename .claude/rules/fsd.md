---
description: Feature-Sliced Design conventions for apps/web/src/ — layer structure, public API, where the app layer lives, and the Next.js traps around it
paths:
  - apps/web/src/**
  - apps/web/app/**
  - apps/web/pages/**
---

# FSD (Feature-Sliced Design)

`apps/web/src/` holds every web module, organized by [Feature-Sliced
Design](https://feature-sliced.design/) — every layer, the app layer included.
`apps/web/app/` is a Next.js App Router and nothing else. Steiger
(`pnpm lint:fsd`) and `eslint-plugin-boundaries` enforce what follows;
`./scripts/vet.sh` runs both.

## Layers

Lowest (most generic) first — an import may only point downward:

| Layer       | Holds                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| `shared/`   | Segments carrying no page composition: `typings`, `ui`, `lib/*`                          |
| `entities/` | Business nouns and their own UI                                                          |
| `features/` | User-facing capabilities                                                                 |
| `widgets/`  | Composite blocks two page slices share                                                   |
| `pages/`    | Page composition                                                                         |
| `app/`      | Root layout, Mantine provider, global stylesheets and theme — `ui` and `styles` segments |

A layer is optional and **inventing one costs more than leaving it out** (see
"insignificant slices" below), so an entity waits for a noun with UI worth
naming, not the mere idea of one.

**A block two page slices share cannot sit in either of them** — slices may not
reach each other sideways — so it drops to a lower layer, and which of the three
below `pages/` takes it turns on what the block _is_, not on the fact that it is
shared:

- **`entities/`** — the block is one business noun's UI. A list of one entity's
  cards is that entity's UI, not a widget. FSD asks no model of an entity, so a
  ui-only one is a legal form.
- **`widgets/`** — the block _combines_ rather than belonging to one noun.
- **`shared/ui`** — the block knows nothing of the product. It is the barrel
  client components import, so a component there takes what it needs as props.

## Rules

- **Import direction is one-way**: `app → pages → widgets → features → entities → shared`. Never upward, never sideways between slices on the same layer.
- **Public API per slice and per shared segment.** Cross-slice imports go through the target's `index.ts`; reaching into its internals is an error from both checkers. Within a slice, use relative imports.
- **`shared` is a slice as well as a layer**, which is FSD's own exception to the rule above: every file in it reaches every other directly, exactly as the app layer's segments do. A segment's `index.ts` is what the layers _above_ enter by, not a wall between its segments.
- **Two suffixed barrels join `index.ts` as legal entry points**, on two axes, and the list is closed at those three names (`PUBLIC_API` in `eslint.config.ts`). `index.ts` keeps the majority surface either way, so a consumer needing neither suffix never learns they exist.
  - **`index.server-only.ts`** is the client-bundle axis: what a browser must not hold. Every module behind it opens with `import 'server-only'`, which is what enforces the split the barrel only names. A fence wants a reason of that kind: a dependency's weight is not one, since removing the dependency removes the fence and whatever was built on it.
  - **`index.node-safe.ts`** is the bundler axis: what resolves under `scripts/`, which runs with none — so the graph behind it spells its extensions, holds no CSS, JSX or asset import, and carries no `server-only`, which throws outside a React server bundle. A script reaching past a public API into a leaf is the smell that this barrel is missing.
- **`shared/lib` has no root barrel.** It is addressed one sub-library at a time (`@/shared/lib/class-names`), each **a single file** and its own public API — nothing sits beside it to hide, so `boundaries` lets the layers above enter segment `lib` at any top-level `*.ts`. That entry does not cross a slash: a sub-library that grows a directory is internals again. It is the holding area, not the destination: a sub-library becomes a top-level segment once it has several consumers and a purpose identity of its own, and only a helper too small to name one — `class-names` is a single function — stays under `lib`.
- **Segments are named by purpose, not by essence** — a segment names the concern it serves, never `shared/utils`. Steiger's `segments-by-purpose` rejects the second form. `shared/typings` is the one segment named for what it holds, because what it holds is the point: the base types that give every member two named types share a single home, which `pnpm type-overlap` enforces. A base whose declarers sit in one module belongs in that module, so the segment only ever holds what genuinely crosses slices.
- **No insignificant slices.** A slice with a single upward consumer belongs _inside_ that consumer, and Steiger says so (`insignificant-slice`).
- **Files are kebab-case**; page components are `*-page.tsx`. Exported identifiers keep their PascalCase (`card.tsx` exports `Card`).
- **The checkers run with the stock recommended ruleset and one override**, the `no-ui-in-app` exemption below. A new rule violation is a signal that the code is in the wrong place — move the code rather than exempting the path.

## The app layer is `src/app`; `apps/web/app/` is the router

Every layer lives under `src/`, the app layer with them. A layer parked beside
the router would be the single exception to that, and the consistency is worth
more than what the exception saves. The router holds routing and nothing else:
`layout.tsx` and each `page.tsx` re-export what they render.

That costs exactly one Steiger override — `fsd/no-ui-in-app`, scoped to
`apps/web/src/app/ui/**` in `steiger.config.mjs`. Next mandates a root layout,
and a root layout is app-layer UI wherever it is filed, so the rule has no
answer here.

Segment naming keeps it to that one. `provider(s)`, `context` and `hook(s)` are
on the plugin's `segments-by-purpose` list, so the theme provider is a file in
`src/app/ui/` rather than a `src/app/providers/` segment; `styles`, `config`,
`api` and `tests` pass as segment names if the layer ever needs them.

Because the app layer is above every other, it may import from all of them —
through their public APIs — and, being one unit rather than a set of isolated
slices, its own segments reach each other directly.

## Traps

- **`apps/web/pages/` is an empty Pages Router, and has to stay.** Next looks for `pages/` beside `app/`, then for `src/pages/` — which is the FSD pages layer. The empty directory is found first; delete it and the build fails with "`pages` and `app` directories should be under the same folder".
- **`@/app` is the FSD app layer, not the router.** The alias resolves into `src/`, so `@/app/ui` is `src/app/ui`. The router directory is reached only by Next's own routing conventions, never by import.
- **`@/` points at `apps/web/src/`, and only inside the web workspace.** Anything outside it — `public/`, the Sass partials under `apps/web/styles/` — is reached by URL or relative path. Root tooling (`scripts/`, `eslint/`) importing a type from the tree uses a relative path, the alias being the web workspace's alone.
