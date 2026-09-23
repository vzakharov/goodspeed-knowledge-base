# PR #1: feat: carry the frontend foundation into a Turborepo layout

- **State:** open
- **URL:** https://github.com/vzakharov/goodspeed-knowledge-base/pull/1
- **Author:** @vzakharov (human)
- **Base ← Head:** main ← claude/knowledge-base-f6yidh
- **Draft:** yes
- **Merged:** _not merged_
- **Created:** 2026-09-23T09:41:10Z
- **Updated:** 2026-09-23T09:48:22Z
- **Closed:** _not closed_
- **Labels:** _none_

---

## Body

## Summary

- **The foundation, carried over from `vzakharov/vovazakharov.com` and rewritten for a Turborepo layout.** `apps/web` is a Next.js 16 static export whose FSD `src/` is the source repo's design system with the product taken out: the Mantine theme, colour tokens and their Sass codegen, `shared/ui`, the theme switch, and a placeholder home page.
- **Root tooling repointed at the monorepo:** the ESLint ruleset with the `vova/*` rules and FSD boundaries, Steiger, stylelint, Prettier, `type-overlap`, the Mantine stylesheet check, Node's test runner, and the Claude cost ledger. `./scripts/vet.sh` runs all of it and passes.
- **The agent loop's project half is written for this repo:** `CLAUDE.md`, the path-scoped rules, `/preview`, and the pnpm install hook. The agent loop itself already sits on `main`, copied unchanged.
- **`docs/plans/knowledge-base.paused.md` is the plan for the assessment build**, next to the brief it answers: Supabase schema and RLS, NestJS API, a provider-agnostic AI layer, RAG, the web app, the README. It lists five open questions to settle first.

## QA Checklist

- [ ] `vet` — `pnpm install && ./scripts/vet.sh` from a fresh clone ends in `vet OK`.
- [ ] `dev` — `pnpm dev`, open `http://localhost:3000`: the placeholder page renders in the carried typography and colours.
- [ ] `theme` — the corner toggle switches light ↔ dark, and every surface and text colour follows.
- [ ] `export` — `pnpm build` writes `apps/web/out/index.html`, and it opens without a server.
- [ ] `boundaries` — an upward import (e.g. `shared/ui` importing `@/features/switch-theme`) fails `pnpm exec eslint .` and `pnpm lint:fsd`.
- [ ] `plan` — the plan's open questions read as answerable, and its steps cover every requirement row in `docs/plans/goodspeed-assessment.md`.

| Item         | Automatable | Covered? | Notes                                                   |
| ------------ | ----------- | -------- | ------------------------------------------------------- |
| `vet`        | e2e         | ✅       | `scripts/vet.sh` itself                                  |
| `dev`        | manual-only | —        | Visual check of the carried design system               |
| `theme`      | manual-only | —        | Colour correctness in both schemes; `/preview` can shoot both |
| `export`     | e2e         | ✅       | `pnpm build` inside vet; `check:mantine-styles` reads its output |
| `boundaries` | integration | ❌       | A fixture tree with a forbidden import, run through ESLint |
| `plan`       | manual-only | —        | A judgment on the plan's scope                          |

https://claude.ai/code/session_01U2d5SNyGi6uN7qFatwXHAQ

---

## Comments

- **C01** @vzakharov (agent) — 2026-09-23T09:41:20Z — "Proposed squash title/body: ``` feat: carry the frontend fou…" → [↓](#c01)

<a id="c01"></a>

### Comment by @vzakharov (agent) on 2026-09-23T09:41:20Z

[https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#issuecomment-5792548792](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#issuecomment-5792548792)

Proposed squash title/body:

```
feat: carry the frontend foundation into a Turborepo layout (pr #1)
```

```
The repository is the answer to Goodspeed's assessment brief, an
AI-powered knowledge base, spun off from vzakharov/vovazakharov.com to
reuse its frontend discipline. This lands that foundation in the
monorepo shape the brief asks for, so the product is built on it.

apps/web is a Next.js 16 static export whose Feature-Sliced src/ is
the source's design system without its product: the Mantine theme,
the colour tokens and their Sass codegen, shared/ui and the theme
switch. An empty apps/web/pages/ keeps Next from reading the FSD pages
layer as a Pages Router, a trap the monorepo layout exposes. The
ESLint ruleset with its vova/* rules and FSD boundaries, Steiger,
stylelint, Prettier, type-overlap, the Mantine stylesheet check and
the cost ledger run from the root over every workspace, and vet.sh
runs them all. turbo.json passes the proxy and CA variables through,
since Turborepo's strict environment otherwise hides them from
next/font.

CLAUDE.md, the path-scoped rules, /preview and the pnpm install hook
are written for this repo.

Co-authored-by: Claude <noreply@anthropic.com>
```

---

