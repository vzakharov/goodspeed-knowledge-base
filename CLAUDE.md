# CLAUDE.md

## About this project

An AI-powered knowledge base — users keep documents and ask questions about them through a chat that retrieves from those documents (RAG). It is Vova Zakharov's answer to a technical assessment, so a reviewer who clones it and runs it is the audience, and `README.md` is written for them. A Turborepo monorepo on pnpm: `apps/web` is Next.js 16 (App Router, React 19, Mantine 9) built as a **static export**, `apps/api` is NestJS, and Supabase (Postgres + pgvector, Auth) is the database, run locally through the Supabase CLI. The AI layer speaks the OpenAI API specification, so any compatible provider — OpenAI, Groq, Together, OpenRouter, a local Ollama — is a configuration change.

The static export is the constraint that shapes the web app: it is HTML and client code on a CDN, with no server at runtime, so every server-side concern — auth verification, persistence, embeddings, model calls — belongs to `apps/api`.

## About this file

This file is intentionally bare. It carries only the conventions that hold true regardless of stack. As the project's actual conventions emerge — directory layout, testing approach, naming patterns, deployment quirks, recurring pitfalls — flesh out the relevant sections below.

**Agent: this is yours to grow.** When you notice a pattern worth codifying, a trap worth warning about, or a tool/command that should be documented, propose the addition. Treat CLAUDE.md as a living artifact you and the human co-author over time — not a fixed doctrine to obey. The principles in "Key principles" below are the seed; everything around them should grow with the project.

## Repository layout

- **`apps/web/`** — the Next.js app. `app/` is **routing only**; `src/` holds every module in Feature-Sliced Design layers — `shared/`, `entities/`, `features/`, `widgets/`, `pages/`, `app/` — and `@.claude/rules/fsd.md` carries the conventions, which both checkers enforce. `pages/` beside `app/` is an empty Pages Router that keeps Next away from the FSD pages layer. `styles/` holds the Sass partials: `_mantine.scss` (counterparts to the mixins Mantine documents as a PostCSS preset) plus the two `pnpm styles:codegen` writes — `_tokens.scss` from `src/shared/ui/css-color.ts` and `_breakpoints.scss` from `src/app/styles/breakpoints.ts`. They sit outside `src/` because a Sass partial is not an FSD module — it has no import graph for the layer checkers to reason about.
- **`apps/api/`** — the NestJS service. Its tsconfig turns decorator metadata on, which `tsx` cannot emit, so it runs and tests under `@swc-node/register` (`register.js`).
- **`packages/`** — workspaces both apps share; `contracts` (`@kb/contracts`) holds every wire shape the two exchange, and resolves to its build output, so a task that runs an app depends on `^build`.
- **`supabase/`** — the Supabase CLI's own layout: `config.toml`, `migrations/`, pgTAP suites in `tests/`. The local stack runs on Docker; `pnpm bootstrap` (`scripts/bootstrap.ts`) starts it, generates the per-machine signing key, and writes each app's `.env` from the `.env.example` beside it.
- **`eslint/`** — the lint ruleset `eslint.config.ts` orchestrates: `rule-groups/` by plugin family, `rules/` for the project-local `vova/*` rules. Linted like any other source; see `.claude/rules/eslint.md`.
- **`.claude/costs/`** — what the work here would cost at Claude API rates: `prices.json`, the hand-maintained rate table, and `sessions/<YYYY-MM>/<session-id>.json`, one row per session, written by a `Stop` hook and carried to the trunk by the branch's merge. `pnpm costs` sums them on demand and writes nothing. `@.claude/rules/costs.md` carries how a transcript is priced, what checks the arithmetic, and how that hook shares the event with the harness's own.
- **`scripts/`** — agent-facing shell/Python tooling; `vet.sh` is the entrypoint below. `type-overlap-check.ts` (`type-overlap-check.README.md` is its reference) runs under `tsx`; `generate-styles.ts` under bare Node's type stripping.
- **`.claude/`** — Skills, rules and session hooks.

Anything that holds only over part of that tree lives as a path-scoped rule in `.claude/rules/`, loaded when a session touches the paths it names — the FSD layering and the styling cascade are both documented there rather than here.

## Deployment

**Nothing deploys.** The project is run locally by whoever reviews it, and `README.md` § setup is the whole of how it is served — which is why `/release`, `/hotfix` and `/log-review` are not part of this project's skill set. Nothing runs on pull requests either, so a green `./scripts/vet.sh` locally is the only pre-merge signal there is.

## Vetting

Vetting is the fast local check the agent runs over a branch _before pushing_ — lint, type-check, format-check, and any tests fast enough to run in seconds. Entrypoint: `./scripts/vet.sh`. **Vetting is the run; attestation is the record that it happened** — `/finalize` does both, and its docs-only flag (`no vet`) skips the first while still posting the second.

Here that is:

```bash
pnpm build            # turbo run build — every workspace's build
pnpm styles:codegen   # rewrites the generated Sass partials; fails if it had to
pnpm typecheck                  # root tsc + turbo typecheck    ┐
pnpm exec eslint .              # not `pnpm lint`               │
pnpm format:check               # prettier --check .            │
pnpm lint:css                   # stylelint, check-only         │ concurrent
pnpm lint:fsd                   # steiger apps/web/src          │
pnpm type-overlap               # scripts/type-overlap-check.ts │
pnpm test                       # root + turbo unit tests       │
pnpm test:db                    # pgTAP over the local stack    │
pnpm test:e2e                   # the API over the local stack  │
scripts/check-squash-message.sh # squash proposal size          │
scripts/check-skill-catalog.sh  # skill @-references            ┘
```

What about that list is deliberate:

- **`pnpm build` is the check that covers the apps themselves** — the static export renders every route, so it catches a broken page, route or import.
- **Vet needs the local stack running.** `test:db` and `test:e2e` run against it, and each fails naming `pnpm bootstrap` when it is down. A cloud session starts `dockerd` by hand (`nohup dockerd &`, not the tool's background mode), and again after a resume, which restarts the container; the CLI pulls its images from `public.ecr.aws`.
- **Never call `pnpm lint` from vet.** That script is `eslint . --fix`, and a fix it picks is a judgment about source someone wrote. `pnpm exec eslint .` is the checking form, and `pnpm lint:css` is stylelint's. `pnpm styles:codegen` is the one exception, because a generated partial has exactly one correct content.
- **The build and the codegen run alone, in that order, before the concurrent rest.** `next build` regenerates `apps/web/.next/types/`, which that workspace's tsconfig includes, so a type check overlapping it intermittently reads a route-type module the build hasn't finished writing. **Pre-generating with `next typegen` does not fix this and makes it worse** — typegen emits a `cache-life.d.ts` that the build then deletes, so the type check fails every time on a file it has already globbed. The codegen _writes_ two `.scss` files that `lint:css` and `format:check` glob. The rest touch nothing each other reads, so `scripts/run-parallel.sh` fans them out; a check added there has to be independent of whatever it runs beside.
- **Only failures are printed.** `run-parallel.sh` buffers each check under `tmp/run-parallel/` and replays just the ones that failed, ending in the path to the verbatim log; the build does the same through `tmp/vet-build.log`. The runner also flags a tree that was clean before the run and is dirty after — an autofix step that rewrote files and still exited 0.
- **Turborepo's strict environment is why `turbo.json` passes the proxy and CA variables through.** A task sees only the variables `turbo.json` names, so without them `next/font` cannot reach Google Fonts from behind a proxy and the build fails on a TLS error. They are pass-through rather than hashed because they describe the machine, not the build's inputs.
- **`pnpm lint:css` holds the styling cascade to `@.claude/rules/styling.md`** — the layered-Mantine import means no rule needs `!important`, so `declaration-no-important` rejects one outright.
- **`pnpm type-overlap` holds every workspace to § "Derive types and schemas from the source of truth"'s one-home rule**, with nothing grandfathered. Working a finding: `scripts/type-overlap-check.README.md`.
- **`pnpm styles:codegen` repairs the generated Sass partials rather than reporting on them.** There is deliberately no check-only mode: `vet.sh` fails when the tree changed under it, `git diff` is the report, and a re-run is green.
- **`scripts/check-skill-catalog.sh` asserts that every `@`-reference into `.claude/` resolves** — the failure it catches is silent.
- **`scripts/check-squash-message.sh` holds the squash proposal to the size caps `@.claude/skills/squash-message/SKILL.md` states.**

**Keep it current** as tooling evolves: a workspace that lands brings its checks into this list in the same change.

**One thing moves with the stack that no agent can move: the environment setup script**, which installs and pins the toolchain for remote sessions and has no API behind it — `.claude/hooks/install-deps.sh` only re-syncs dependencies against the lockfile once that snapshot exists. So a toolchain change — new runtime, bumped pin, new system dependency — is unfinished while only the repo files agree: **say in your report what the operator must add there**.

**Do not vet before every commit** on feature branches. The vet run happens at milestones: before pushing review-ready work, before flipping a PR to ready. `/finalize` is the canonical caller.

## Key principles

- **No "MVP" mindset.** Aim for production-grade durability from day one. Don't cut corners with "we'll fix it later" reasoning. Design decisions should be durable.
- **Don't replace what already works.** Only swap a tool or service for a concrete problem with it, not on aesthetics or novelty.
- **Never add lint-suppression comments without explicit user confirmation.** This includes `eslint-disable`, `# noqa`, `# type: ignore`, `// nolint`, and equivalents in any language. When a lint rule flags code, fix the code to satisfy the rule. If the rule is genuinely wrong for that case, ask the user before suppressing. **Exception for test files:** file-level suppression is acceptable when the disabled rules relate to mocking mechanics that conflict with test setup. Do not suppress rules that flag real code quality issues even in tests.
- **An approved suppression goes at the point of use, not in the linter's config.** Once the user has agreed to one, put it on or immediately above the offending code with the rationale in the same comment, so whoever edits that line reads why. Suppress at the shallowest layer that knows enough to justify it: the linter's config should not have to know what kind of code it lints — "this page has no locale for the i18n rule to protect" is a domain concern, and a config that carries domain concerns stops being portable. A central entry (a scoped block in `eslint.config.ts`, `pyproject.toml`'s `per-file-ignores`) is also invisible from the code it exempts, so it outlives that code silently. Reserve central-config exemptions for a suppression that genuinely spans files — a whole directory, a migration backlog — and have it name that scope explicitly; `.claude/rules/eslint.md` carries the ESLint mechanics.
  - A file-level suppression at the top of the file is the point-of-use form when every occurrence in the file shares one reason (a CLI whose stdout is its interface, a module that must augment a library type). The test-file exception above is one instance of this.
  - A permanent exemption states the invariant that makes it correct; a temporary one names the issue tracking its removal.
- **Linters are signals, not puzzles to game.** Do not contort the architecture solely to silence a rule when a clearer approach exists. Rules exist to keep the codebase consistent and safe — work _with_ them, not around them in a hacky way.
- **When analysis keeps failing to explain a real bug, widen the frame — don't just deepen it.** Re-reading the same code more closely won't surface a cause that lives in a part of the system you implicitly scoped out at the start. Stop and take in the bigger picture: explicitly name what you've been assuming is irrelevant or already-correct — adjacent layers, surrounding systems, the stretches of the request/data path you never opened — and question those boundaries. The blind spot is usually something you excluded from the problem, not something you misread inside it; "this code can't be wrong" is the cue to look at everything around it.
- **Comments describe the code's lasting contract, not the change that produced it.** Don't leave transient/situational notes that narrate an edit ("now also sets X", "migrated from Y", "this used to…") — they read as noise once the change is old. If the rationale is genuinely durable, phrase it as a present-tense property of the code. `/tend-prose` is the pass that enforces this over recent work.
- **Dev artifacts go under gitignored `tmp/`, not as new `.gitignore` entries.** Scratch files, spikes, exploratory output, extracted frames, probe results — all go under `tmp/` (already gitignored). Don't add per-artifact lines to `.gitignore`.
- **Plans must include a `## DRY notes` section.** When writing an implementation plan, always include one that states, for any code the plan adds or moves: what is genuinely shared vs. duplicated, which existing helper/type/module is reused, and — when you decide _not_ to extract a shared abstraction — why forcing one would be net-negative. This makes the reuse-vs-duplication call explicit and reviewable before implementation, rather than discovered in review.
- **Ignore IDE diagnostics until the vet run.** Do not react to or try to fix type errors, lint warnings, or other diagnostics that appear in IDE context during implementation. IDE servers can lag behind file changes and produce stale or misleading errors. `./scripts/vet.sh` is the single source of truth for correctness — only fix errors it reports.
- **Don't revert unexpected mid-execution changes.** If new code, comments, or edits appear in files during execution, they're most likely from the user editing concurrently. If the context makes it clear they're user-made, preserve them without asking. If genuinely unclear, ask before touching them — but never silently revert.
- **Don't spin on typing/linting errors.** If a type error or lint issue resists 2–3 straightforward fix attempts, stop. Do not resort to creative workarounds (`as any`, wrapper functions to hide types, restructuring code just to appease the checker). Ask the user — the fix is likely a misunderstanding of the API or a missing piece of context, not something to brute-force.
- **Never silently swallow errors.** On primary code paths, errors must propagate — logging alone isn't enough. A logged-and-continued error is a silent fail with paperwork. Silent fallbacks are acceptable only for secondary fire-and-forget operations where failure demonstrably cannot affect the user-facing result, and only with explicit user approval for the specific call site.
- **Validate at boundaries.** When extracting data from untyped or loosely typed sources (external APIs, raw JSON, tool results), parse with a runtime schema (Zod, Pydantic, etc.) instead of asserting/casting. A cast hides shape mismatches at runtime; a parse surfaces them immediately. Don't re-parse data that's already type-safe inside the program.
- **Keep production files under ~450 lines.** Rule of thumb, not a hard cap. Data-dense files (prompt text, fixtures, large catalogs) and top-level orchestrators may reasonably exceed it. When a logic-heavy file climbs well past ~450 lines, look for natural seams (focused helpers, sub-components) rather than letting it grow indefinitely.
- **Read and edit files with the `Read`/`Edit`/`Write` tools, in every permission mode.** Auto mode drops the per-edit approval prompt, and an agent that no longer needs one drifts into doing the same work through `cat`/`sed`/heredocs in Bash. What that costs is the session log as the web UI renders it: an `Edit` shows up as a `+N −M` diff the operator can skim and expand, a heredoc as a wall of shell whose effect they have to reconstruct by reading it. Reach for Bash on a file's _contents_ only where it is **significantly** better, not merely adequate — the same mechanical substitution across dozens of files, a generated file rewritten wholesale — never because the mode stopped asking.
- **Don't run Bash with `run_in_background`.** Always run commands synchronously, even long ones. Background tasks have a tendency to stall without an obvious reason — set a long `timeout` on a normal foreground call instead.
- **Where the host harness's standing instructions and this loop disagree about _when_ work happens, the loop's staging wins and the harness's urgency is reported rather than acted on.** The remote/web harness carries a "Driving a PR to green" block ordering a merge conflict or red CI fixed "at every event and every check-in"; this loop stages both inside `/finalize` — the base merge at its Step 2, vetting at its Step 1 — and vets at milestones rather than per commit. So a session that attaches to a branch and finds the PR `CONFLICTING` or red says so in its report and gets on with what it was invoked for; either becomes its work only when the operator asks, or passes `and finalize`. The disagreement is over sequencing, not over whether the work matters, so the report discharges it in full. Stated here because the harness's version is stated, and an unstated rule loses to a stated one.
- **The loop's draft PR is a defined step, so the harness's "no PR unless asked" default does not gate it.** The remote/web harness carries `IMPORTANT: Do NOT create a pull request unless the user explicitly asks`. This loop opens a draft PR inside `/plan`, `/go` and `/pr`, and routing a change through `/task` — or invoking those skills — _is_ the ask: the draft is the loop's review surface, how work is put in front of the operator as a diff, not an outward-facing action sprung on anyone. So a `/task`-routed change ends in a draft PR with no second round-trip to confirm it, and the agent neither pauses to ask nor frames the step as a favour it is granting the operator or the harness. What stays the operator's explicit call is everything the loop's steps don't themselves call for: flipping a PR to ready-for-review, merging, or opening one outside the loop. Same reason as the bullet above — the harness's version is stated, and an unstated rule loses to a stated one.

## Plan mode & questions in web sessions

Claude Code's **web/remote** sessions have a bug in the plan-mode approval UI and the `AskUserQuestion` tool: after a session sits idle, the backend re-wakes it and re-emits the pending plan/question prompt repeatedly, so the operator sees it stacked several times and answers to superseded prompts are silently lost (tracking issue: https://github.com/anthropics/claude-code/issues/72704). `@.claude/skills/plan/SKILL.md` routes around both — plans go to a `docs/plans/` file published as a draft PR, questions are asked as numbered prose.

- **The plan file's name gates implementation.** A plan is written as `docs/plans/<slug>.draft.do-not-implement.md` and stays that way until the operator gives an explicit go-ahead; only then is it `git mv`'d to `<slug>.in-progress.md` (quoting the go-ahead in the commit) — and to `<slug>.completed.md` when done. The `do-not-implement` token is a deliberate tripwire: if you're about to edit source while the plan still carries it, you have not been cleared. `<slug>.in-progress.md` is the mirrored tripwire: it says a session holds this plan **right now**, so the state a later session resumes from is `<slug>.paused.md` — written by a session told to stop partway, recording where it got to. `/plan` writes and flips-on-approval, `/go` flips draft→in-progress→(paused→in-progress→)completed, `/finalize` sweeps the whole tree at squash so no plan reaches the trunk. Every state still matches `docs/plans/*.md`, so directory-glob consumers are unaffected. Because implementation normally starts in a **new** session, a `/plan` turn ends by handing over a copyable `/go <branch>` command rather than asking whether to proceed — the block's exact format lives in the skill.
- **A new session's opening prompt routes on one question: does it ask for a change to this codebase?** This ladder is the home of that rule; `/task`, `/plan` and `/go` point at it rather than restating it.

  | Opening prompt                                                       | Routes to          |
  | -------------------------------------------------------------------- | ------------------ |
  | asks for a change — "add a case-study page", with or without a `#55` | `/task`            |
  | asks for no change — "what would a case-study page need?"            | nothing: answer it |

  Four things the rows do not say on their own:
  - **The test is the expected deliverable, not the grammar.** "Analyse the latest market trends" is an imperative and still lands in row 2, because nothing in this repo changes as a result.
  - **Row 2 is a stated bucket, not a gap.** It says: answer the question; no skill covers this by design. Where the read was wrong, the operator's next message is a directive and lands in row 1 — one turn, not a wasted plan file.
  - **`let's …` is a token collision.** It is on `@.claude/skills/plan/SKILL.md` § "The approval gate"'s go-ahead list, so "let's add a case-study page" is a directive at launch and an approval mid-session. The rule keys on launch-vs-continued, which the last bullet of this section separates.
  - **In doubt, read it as row 2.** The rows are not symmetric in what a wrong read costs: row 2 read as row 1 mutates and commits against a request that wanted an answer, and undoing it is a revert the operator has to ask for. Row 1 read as row 2 costs one turn — the answer lands, the operator says "now do it", and whatever the answer produced along the way is sitting in `tmp/`, to be moved somewhere tracked if it turns out to be wanted.

  **"No plan" (or equivalent) in the opening prompt skips Step 1** and enters `@.claude/skills/go/SKILL.md` § "Planless entry" directly — the one thing that overrides the agent's own call. And in a web/remote session neither row ever reaches native plan mode or `AskUserQuestion`: a plan goes to a `docs/plans/` file, a question goes out as numbered prose.

  **What row 1 costs, plainly:** the agent makes the plan-or-not call on every new session that asks for a change, without the operator opting into it. The gate survives that — `@.claude/skills/task/SKILL.md` Step 3 routes gate-worthy work back to `/plan` — but it fires when those questions say so rather than on every task. `/task` owns the questions, what each outcome runs, and which prose forms reach it.

- **An issue number is a detail of the prompt, not a destination.** A `#<N>` anywhere in it means the thread is **exported and committed before anything else happens — the routing call above included**: `@.claude/skills/take-issue/SKILL.md`, which `/task`, `/plan` and `/go` each run first, and which `.claude/hooks/prompt-issue-export.sh` has normally already fetched when the number ended the session's opening prompt. Read it, then route. An issue-shaped prompt — a bare `#55`, or a title naming a subject and no deliverable — is routinely one the rows cannot be read off, and what settles it is the body, comments and attachments a title only labels. The number changes what the session has read, not where it goes: a tracked task is owed the plan-or-not call exactly as an untracked one is.
- **`/plan` gets native plan mode, not the skill.** `plan` is a built-in slash command in the client, so the keystroke renders there and never reaches the agent; the operator's entry is bare prose — `plan: <task>`, or just the task, which the bullet above already routes to the skill. A session that lands in plan mode anyway, by that keystroke or by the UI mode switch, costs one operator approval to leave; `@.claude/skills/plan/SKILL.md` § "If the session is already in native plan mode" owns the recovery and the escape hatch for an operator who meant it.
- **This applies only to new sessions, not continued work.** Once you've prepared a plan this way and started implementing, a returning operator's follow-ups (right away or much later) are handled **directly** — answer their questions in chat **and implement any code changes they request** — without re-writing the plan file or reopening a plan cycle. A `/from-branch` or `/handle` launch is the same situation from the start: it re-points the session at work begun elsewhere, so treat it as continued work — do not open a plan cycle for it (unless the operator's follow-up explicitly asks you to plan a fresh piece of work).
- Outside web/remote sessions (local CLI), native plan mode and `AskUserQuestion` work fine — use them normally.

## Docstrings

Add a docstring only when the behavioral contract isn't obvious from the function name and types — side effects, runtime constraints, cross-boundary coupling, or "don't change this" traps. If the main reason to document something is that someone might break it while editing, a short inline comment inside the function is enough (the dev will see it while changing the code). Don't document things we're not actively working with — they may change or disappear.

Prefer code clear enough not to need usage examples in docstrings. If an example is the clearest way to convey usage, include one — but a need for examples is often a signal that the API itself could be clearer.

## Derive types and schemas from the source of truth

Never hand-write a type or schema whose shape tracks another declaration — derive it. Hand-written duplicates drift silently and the type checker won't catch it because the duplicate redeclared its own fields.

- Use your ORM/library's derivation utilities (e.g. `drizzle-zod`, Pydantic's `from_orm`, `sqlc`-generated types).
- When a runtime schema exists, infer the type from it rather than declaring a parallel type.
- For enums, define the values as a `const` array and derive the typed schema from it (`z.enum(VALUES)`, equivalents in other stacks). Use the array's element type for dispatch maps so the compiler enforces exhaustiveness.
- **Every member two named types both declare has exactly one home** — a shared base type they both intersect (`type Foo = Titled & { …own members… }`). This is the member-level half of the rule above: it covers a shape tracking nothing but a sibling's copy of itself. **The same holds one level up: a combination of bases spelled by two types gets a name of its own** (`type Summarized = Titled & Described`), since two spellings of one combination drift exactly as two spellings of one member do. `pnpm type-overlap` enforces both — floor 1 for members, floor 2 for combinations, one shared base being reuse working as intended — and `interface` is banned repo-wide (`@typescript-eslint/consistent-type-definitions`) because the gate scans type aliases only. Full reference: `scripts/type-overlap-check.README.md`.

## Testing

Every suite runs on **Node's built-in test runner**. A test imports `node:test` and `node:assert/strict` directly, sits beside the module it covers as `*.test.ts`, and is picked up by its workspace's glob. Keep it that way unless something genuinely needs a framework.

- **`pnpm test`** — the unit tests: the root's `scripts/**/*.test.ts` under `tsx`, then `turbo run test`, each workspace's own `src/**/*.test.ts` (the API's under `@swc-node/register`).
- **`pnpm test:e2e`** — the API end to end, `apps/api/test/**/*.e2e.test.ts`: the real app over the local stack, a fake model provider on the HTTP boundary (`test/fake-openai.ts`), and two users so every read is also checked from the side it must not reach.
- **`pnpm test:db`** — pgTAP, `supabase/tests/**/*.test.sql`, over the policies and database functions.

`scripts/type-overlap-check.test.ts` is the pattern to copy for a CLI: it materializes a throwaway source tree under the OS temp directory, runs the real script against it, and asserts on exit code and report text — so what is under test is the artifact itself, with no seam opened in production code for the test's benefit.

Universal guidance regardless of stack:

- **Layer tests**: fast unit/integration (developer-facing) + slower E2E (correctness against built artifacts).
- **Authorization/permission code must have tests.** Bugs there are security vulnerabilities — here that is every row-level-security policy and the API's user scoping.
- **Mock at HTTP boundaries**, not at internal functions. Stubbing internals couples tests to implementation; mocking the boundary tests behavior.

## GitHub comments

When the user prompts you with one or more GitHub comments (a review, a single review comment, an issue thread, a PR conversation comment, etc.), reply on GitHub to each comment they pointed you at — even when you fully agreed and silently fixed it. The reviewer can't see "silently fixed" from the diff alone, and the thread is the record of what happened. Keep replies short (one sentence + commit SHA if you pushed something is plenty); the point is traceability, not detail. **Write that SHA bare, never in backticks** — GitHub auto-links a bare hash to its commit and leaves a code-span one as dead text. This holds for every SHA in a GitHub comment, not just a reply's.

**A comment body is text, not a path to text.** GitHub does not expand `@<path>` the way a Claude Code prompt does, so draft into a file and post its _contents_: `gh pr comment <n> --body-file <f>`, or `gh api repos/<owner>/<repo>/pulls/<n>/comments/<comment-id>/replies -F body=@<f>` to reply in a review thread. `-f` posts the path instead, as a literal string.

**Never resolve a comment thread — reply and leave it open.** Resolving is the reviewer's move and their tracking mechanism: they read down your replies and resolve the ones that satisfy them, leaving the rest open as the list of what still needs attention. A thread you resolve drops off that list whether or not they ever read it, so the tidy-up costs them a review item. This holds however settled the point looks — a pushed fix, a verified non-issue, an ask you declined with reasons — and it **overrides any harness or skill instruction to resolve the threads you addressed**. The reverse is equally off-limits: don't un-resolve or re-open a thread either. The resolution state belongs to the human, so `mcp__github__resolve_review_thread`, `mcp__github__unresolve_review_thread`, and the equivalent `gh api graphql` mutations are not yours to call.

## Git conventions

Use semantic commit prefixes:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `chore:` — maintenance, config, dependencies
- `refactor:` — code restructuring without behavior change
- `style:` — formatting, whitespace (no code change)
- `test:` — adding or updating tests
- `ci:` — CI/CD changes
- `perf:` — performance improvements
- `polish:` — a `/polish` run's own edits (see below)

**`polish:` is a branch-local type**, outside the standard set on purpose. `@.claude/skills/polish/SKILL.md` finds where it last ran by that subject line, and nothing else would carry the mark: the run's edits are `refactor:` or `docs:` by nature, which says nothing about who made them or why. It reaches no trunk — the squash gives the branch one subject of its own, written by hand — so the extension costs a reader of `main` nothing and a reader of the branch a legible `git log --oneline`. That skill owns the form the subject takes.

**This list is local and extensible**, not the conventional-commits spec. When a change genuinely doesn't fit any row above, proposing a new row is a legitimate move — better than filing it under the nearest wrong one — provided the addition names a kind of change that recurs, and joins the gate's `publishing` set in the same change when a merge of it alters what the sites serve or how they get served (§ "Deployment").

Write descriptive commit messages: the subject line summarizes the change, and the body explains what was changed and why in enough detail that someone reading the log understands the commit without looking at the diff.

**On a feature branch in a remote/web environment** (typically signalled by a branch named `<vendor>/<autoname>`), commit and push proactively after each meaningful unit of work — don't wait to be asked. The operator is usually reviewing from a different machine than the VM the agent runs on, so they can only see the work once it's pushed.

**Do not vet before every commit on feature branches.** The vet run happens at milestones via `/finalize`. See "Vetting" above.

**Rename auto-generated remote/web branches early.** **First check whether the branch is already semantic.** The harness now often assigns a task-derived name at session start, in which case there is nothing to rename — leave it. This is an **undocumented** harness behavior and may be reverted at any time, so the rename procedure stays as the fallback: apply it only when the branch is an opaque `claude/<adjective>-<noun>-<hash>` name (e.g. `claude/relaxed-brown-EhDOB`). Rename it as soon as the task scope is clear — **before** the first commit, since `/plan` names the plan file after the branch slug — to `claude/<short-task-slug>-<hash>`, keeping the original random suffix so parallel sessions stay unique. **Always do this before opening a PR**: renaming a branch that already has a PR **closes that PR** (GitHub auto-closes when the head ref disappears and does not retarget onto the new name), forcing a replacement PR over the same diff. The routine "develop on branch `<name>`" line in a session's git-setup block is **not** a pin — only treat the name as fixed when the **user** explicitly says not to rename it. Rationale: `claude/lucid-hamilton-MigdG` tells nobody anything in `git log`, PR lists, or future search; `claude/rename-autobranches-MigdG` does. `@.claude/skills/branch-rename/SKILL.md` owns the procedure.

The proposed squash title/body goes up when the PR opens and is kept in sync as the branch changes — see `@.claude/skills/squash-message/SKILL.md` for when a push warrants a re-sync.

## Writing things down

The default is not to write it. Prose costs context on every session that loads it, and it goes stale invisibly — a constraint survives a refactor, a description of how the constraint works does not. Three questions, in this order:

1. **Should it exist at all?** Keep it only when all three hold: it is a **constraint or an accepted cost** rather than a description of how the code works; it is **not recoverable** from the code and its docstrings (or recovering it means holding more modules in your head at once than anyone does, where a paragraph gets there faster); and **getting it wrong breaks something** you can name.
2. **Is it durable?** Phrase it as a present-tense property of the code, never as the change that produced it. ("Key principles" above carries this.)
3. **Is it as short as it can be?** Only the non-obvious contract, at the length that contract takes.

**Never create a new top-level doc without asking the user**, and argue the "don't" side when you ask. A top-level doc is the one home nothing scopes, so every later session pays for it — and a decision plus the alternatives it beat already lives in the PR or issue thread that made it, which any of the scoped homes can cite by number.

**Read the long version sparingly.** `@.claude/skills/tend-prose/SKILL.md` holds the full test — where a line goes, the rule-vs-README criterion, the tells for each defect, and what to do with a finding — and it is the only home for those rules. Load it for a borderline call or a deliberate pass over prose you just wrote, not on every doc touch; loading it every time is the cost these rules exist to remove.

**When a convention changes, every place that states it changes with it.** Repoint the citations rather than leaving one home right and the others quietly wrong — and if you find the same constraint stated in two places, that is the finding: one of them is the home and the other is a pointer.

**When a convention goes away, stop stating it — don't negate it in place.** A sentence that survives only to deny the thing it used to describe ("copy is not a catalogue") reads as a constraint but answers a question no reader of the current tree would ask: the polar bear. Cut it; `/tend-prose negation` is the pass that finds them, and "polar bear here" on a PR comment asks for it by name.

**Retiring a doc leaves a tombstone.** Don't just `rm` a doc that other files, comments, or history cite — leave a file recording the last commit that contained it and the `git show <sha>:<path>` recipe to read it, so every surviving citation still resolves, plus a pointer to where any still-live content went. **One tombstone per retirement, not per file**: docs retired together get a single tombstone with a row each. A tombstone standing in for a whole retired directory is `retired.md` at that directory's root; one standing in for a single file is `<name>.retired.md` beside its siblings — so every tombstone matches `*retired.md`.

**Plans are the exception**, being transient by construction. Keep them current — when work deviates from the plan, update it to reflect actual progress and revised ordering — and keep their checklist items in forward-looking voice: how you'd phrase them _before_ doing the work, not as retrospective reports.

**An image the operator attached is a file on disk — decide whether it stays.** `.claude/hooks/session-images.sh` writes every attachment into gitignored `tmp/session-images/` with a manifest row carrying the prompt it arrived with. The transcript is the only other copy and both die with the machine, so an image nobody moves into the repo is gone. An image the repo has a lasting use for — a screenshot a doc points at, a diagram worth citing — moves to a permanent home and is committed there together with the prose that references it. Everything else is left where it is.

## Language

**Human-facing prose is English** — `README.md`, the docs a person reads to decide something, commit subjects and bodies, PR titles and bodies, and the plans and issue exports published for review.

Two further groups don't vary by project, so read them off here rather than asking:

- **Agent-facing — English.** `CLAUDE.md`, `.claude/skills/**`, `.claude/rules/**`, and code: comments, docstrings, identifiers. The reader here is the agent, who follows English most reliably; other scripts spend several times the tokens saying the same thing, a cost every session pays on every load.
- **Conversation — the language it was asked in.** Session replies, issue and PR comments, review replies. No standing artifact, so each reply matches the message it answers, per message rather than per person.

## Explaining things to people

How to write for a person is long enough to have its own file, so it is imported
from `.claude/voice/` rather than stated here — in force from every session's
first reply. `operators/` beside it holds one file per person, saying how that
person in particular wants to be talked to.

`/plainly` is the on-demand procedure: bare, it re-explains an answer that did
not land; with a question, it answers plainly from the start. Invoking it is
optional — the rule itself governs every reply regardless.

<!-- A real import, not a pointer, so it is unbackticked: the import parser
     skips code spans, and backticking it would silently stop it loading. Every
     other @-reference in this file is backticked because it is a pointer the
     agent opens on demand.

     `operators/` beside it is deliberately not imported. A session applies one
     person's entry, so importing the directory spends context on everyone
     else's, every session — `.claude/hooks/operator-voice.sh` resolves the
     operator at startup and prints that one entry instead. -->

@.claude/voice/voice.md

## Working with skills

This project ships a set of Claude Code skills under `.claude/skills/`. Invoke them as `/<name>` in a session.

**The main loop**, in the order a piece of work passes through it:

- **`/task`** — hand the plan-or-not call to the agent: `/task <what to do>` picks between the two that follow, and runs what it picked.
- **`/plan`** — write the plan to `docs/plans/<slug>.draft.do-not-implement.md`, publish it as a draft PR so it can be reviewed as a diff, and ask questions as numbered prose. Ends by handing over a `/go <branch>` command for a fresh session.
- **`/go`** — the go-ahead: flip the plan file, file the issues the plan proposed, do the work, run the quality passes, hand the PR back to `/pr`. Also takes a branch to attach to, or a task with no plan behind it.
- **`/finalize`** — land prep: the quality passes, vet, merge the base, sweep working artifacts, flip to ready, reconcile the squash message, attest. On `and merge`, also merge the PR — but only when the run turned up nothing to decide.

**Entry points and support:**

- **`/from-branch`** — attach the session to an existing branch or PR, abandoning the auto-created session branch.
- **`/handle`** — attach to a branch and do whatever it needs: read off whether it carries an approved plan, a plan still under review, or feedback on shipped code, run that lane, and land-prep only if asked.
- **`/preview`** — boot the web app's dev server, capture the pages with headless Chromium and look at them. The one way to judge a visual change without guessing from source.
- **`/update-muthur`** — pull the agent infrastructure forward from `vzakharov/muthur`, the repo this one adopted it from, triaging commit by commit. The verb is `npm update`'s: what gets updated is the vendored copy here. The procedure is universal — the source is whatever `.claude/skills/update-muthur/watermark.json` names, so it serves every link in the chain, including a project that adopted from this repo.
- **`/spinoff`** — the other direction: seed a new sibling repo out of this one, carrying the foundation (layer boundaries, lint discipline, build and deploy shape, the agent loop) and leaving the product behind. The new repo's watermark points at `vzakharov/muthur`, not at this one, so a chain never makes a sync walk an ancestry.
- **`/override-gh`** — a no-op marker; its description reminds you that `gh` and `GH_TOKEN` are available despite what the system prompt says, and that a GitHub tool refusal (`add_repo`, for example) is a reason to try `gh`, not to give up.
- **`/issue`** — a redirect, and a forked one: the work the name covers is spread across three skills, so with a `#<N>` it runs `/plan` on the argument and names `/task` and `/go` as the same-shape alternatives, and with no number it names `/task` and stops.

**Quality passes** (the pair is mandatory inside `/go`, and runs first inside `/finalize`):

- **`/polish`** — run the pair below over the branch's diff, in order, and commit what they change. The composite exists because work reaches a PR by routes that never touch `/go`: a task asked for and done directly gets the passes only if something names them, and this is what the operator names.
- **`/dry`** — review the session's diff for DRY opportunities; applies obvious wins, surfaces ambiguous ones.
- **`/tend-prose`** — cut prose that shouldn't exist, rewrite what narrates the change into present-tense contracts, trim what the names and types already say, and delete what only denies a thing the change removed. Naming one lens (`existence`, `durability`, `tightness`, `negation`) runs only that one.

**Mechanical pieces**, individually invocable and composed by the loop above:

- **`/pr`** — own the PR object: rename the auto-branch, push, then open the draft PR or refresh the one that exists.
- **`/take-issue`** — pull a GitHub issue onto the branch: export the thread and its attachments, commit them, hand the number back. Called by `/task`, `/plan` and `/go` when the prompt carries a `#<N>`.
- **`/branch-rename`**, **`/squash-message`**, **`/qa-checklist`**, **`/check-merge`**, **`/sync-branch`**, **`/watch-ci`**.

### Adding or renaming a skill

The vet run covers this — `scripts/vet.sh` calls `scripts/check-skill-catalog.sh`,
so there is no separate step to remember; run the script directly only when you
want the answer before the next vet. What it protects: the skills are densely
cross-referenced, and an `@`-reference into `.claude/` naming a file that
isn't there fails **silently** — the agent follows the surviving prose and skips
the step they couldn't load. It also asserts that no skill is left as an
unhydrated stub. (Its catalog assertions skip here by design: the catalog
describes the source's own tree and is never vendored.)

**Don't name a skill with a word the loop already uses as an instruction token.** Skills trigger on description matching before their body loads, so a name that doubles as a go-ahead ("implement", "proceed", "ship it", "let's …" — `@.claude/skills/plan/SKILL.md` § "The approval gate" holds the list) fires on prose that meant the token, not the skill. Where the skill takes an argument, naming it after the argument — `/task`, `/pr` — puts it out of reach of that reading entirely.

Add new skills as repeated workflows emerge — each as a directory under `.claude/skills/<name>/SKILL.md`. Skills checked into the repo are picked up automatically when Claude Code opens the project. Path-scoped conventions go in `.claude/rules/` instead (see its README) so they load only when the relevant files are touched.
