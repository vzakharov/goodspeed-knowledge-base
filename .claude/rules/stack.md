---
description: Why the vet run is shaped as it is, and what a workspace landing or a toolchain change has to wire
paths:
  - scripts/vet.sh
  - scripts/run-parallel.sh
  - .claude/hooks/install-deps.sh
  - package.json
  - '**/package.json'
  - pnpm-workspace.yaml
  - turbo.json
  - knip.jsonc
---

# The stack and the vet run

`scripts/vet.sh` is the roster. What about it is deliberate:

- **`pnpm build` is the check that covers the apps themselves** — the static export renders every route, so it catches a broken page, route or import.
- **The build and the codegen run alone, in that order, before the concurrent rest.** `next build` regenerates `apps/web/.next/types/`, which that workspace's tsconfig includes, so a type check overlapping it intermittently reads a route-type module the build hasn't finished writing. **Pre-generating with `next typegen` does not fix this and makes it worse** — typegen emits a `cache-life.d.ts` that the build then deletes, so the type check fails every time on a file it has already globbed. The codegen _writes_ two `.scss` files that `lint:css` and `format:check` glob. The rest touch nothing each other reads, so `scripts/run-parallel.sh` fans them out; a check added there has to be independent of whatever it runs beside.
- **`pnpm styles:codegen` is the one check that writes** — a generated partial has exactly one correct content, so it repairs a stale one and fails for having had to; `scripts/generate-styles.ts` carries the rest.
- **Only failures are printed.** `run-parallel.sh` buffers each check under `tmp/run-parallel/` and replays just the ones that failed, ending in the path to the verbatim log; the build and the codegen do the same through `tmp/vet-build.log` and `tmp/vet-styles.log`. The runner also flags a tree that was clean before the run and is dirty after — an autofix step that rewrote files and still exited 0.
- **Turborepo's strict environment is why `turbo.json` passes the proxy and CA variables through.** A task sees only the variables `turbo.json` names, so without them `next/font` cannot reach Google Fonts from behind a proxy and the build fails on a TLS error. They are pass-through rather than hashed because they describe the machine, not the build's inputs. `NEXT_PUBLIC_*` and each app's `.env` are the opposite — hashed build inputs, since Next inlines them into the bundle and `.env`, gitignored, is invisible to Turborepo's default inputs, which would replay a bundle built against the old values.
- **`pnpm lint:css` holds the styling cascade to `@.claude/rules/styling.md`**, `!important` included.
- **`pnpm type-overlap` holds every workspace to CLAUDE.md § "Derive types and schemas from the source of truth"'s one-home rule**, with nothing grandfathered. Working a finding: `scripts/type-overlap-check.README.md`.
- **`pnpm knip` holds every workspace to no unused file, export or dependency.** An export kept for a later step carries a `@tobeused` JSDoc tag, which `knip.jsonc` excludes; any other finding is fixed by deleting the code, or the `export` where the only use is in its own file.
- **`scripts/check-skill-catalog.sh` asserts that every `@`-reference into `.claude/`, and every section citation into a `CLAUDE.md`, resolves** — the failure it catches is silent.
- **`scripts/check-squash-message.sh` holds the squash proposal to the size caps `@.claude/skills/squash-message/SKILL.md` states**, and **`scripts/staged.sh check`** holds each staged copy to the rules `@.claude/rules/staging.md` states.

**A workspace that lands brings its checks into the roster in the same change**, and a failure the run let through is a signal to extend it.

**A workspace landing, or a toolchain change, is unfinished until three sites agree:**

1. `scripts/vet.sh` runs the new checks.
2. `.claude/hooks/install-deps.sh` installs the dependencies, so a resumed remote session tracks the current lockfile.
3. **The environment setup script** installs and pins the toolchain for remote sessions — `install-deps.sh` only re-syncs against the lockfile once that snapshot exists. No API, MCP tool or in-repo file stands behind it, so no agent can change it: **say in your report what the operator must add there** — a new runtime, a bumped pin, a new system dependency — or the next session runs under a version nobody chose.
