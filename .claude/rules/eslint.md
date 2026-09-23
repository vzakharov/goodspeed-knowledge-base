---
description: ESLint severity policy — error/off only, never warn; how to grandfather
paths:
  - eslint.config.ts
  - eslint/**
---

# ESLint Conventions

- **Severity is `error` or `off` — never `warn`**, in the rule groups and in
  `eslint.config.ts`'s scoped overrides alike — a spread's `warn` included, which
  is re-stated at `error`. A rule worth having blocks the merge
  (`./scripts/vet.sh`); a warning is a rule nobody enforces, and LLMs and humans
  alike let warnings accumulate.

- **Grandfather with an `off`, not a `warn`.** When landing a new rule that
  pre-existing code violates, don't soften it to `warn` repo-wide — the rule
  stays `error` everywhere it isn't explicitly exempted, so it still catches any
  new violation the moment it's added.

- **The ESLint spellings of the placement rule** (CLAUDE.md, "an approved
  suppression goes at the point of use"). A single call site carries its own
  `eslint-disable-next-line`; a file whose every occurrence shares one reason
  carries `/* eslint-disable <rule> -- … */` under the docstring; an exemption
  spanning files is a scoped override block in `eslint.config.ts` that names
  them in `files:`.

- **Rule severities live in `eslint/rule-groups/*.ts`** via
  `withSeverity('error', [...])` / `withSeverity('off', [...])`. That tree sets
  what a rule is worth repo-wide; the exemptions above are how one site opts
  out of it. Keep the concerns in their respective places.

- **Rule files import relatively, never through `@/`.** ESLint loads the config
  with jiti, which does not apply the TypeScript path alias. `eslint/` is
  therefore self-contained in its runtime helpers: anything a rule needs from
  elsewhere is vendored into the tree (`eslint/from-entries.ts`) rather than
  imported from the web app. Shared _base types_ are the exception — the type-overlap
  gate allows a member exactly one declaration repo-wide, so a base the catalog
  already homes is re-exported from `apps/web/src/shared/typings` through a relative path
  (`eslint/rules/estree-mixins.ts`) instead of being redeclared here. A base the
  catalog does _not_ home is declared in `estree-mixins.ts` itself, where its
  only declarers are.

- **Some rules turn `off` because `tsconfig.json` already covers them.**
  `no-unused-vars` delegates to `noUnusedLocals`/`noUnusedParameters`,
  `consistent-return` to `noImplicitReturns`, `dot-notation` to
  `noPropertyAccessFromIndexSignature`. Removing one of those compiler flags
  silently opens a coverage gap that no lint run reports.
