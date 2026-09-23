# Knowledge Base — the assessment build

The product this repository exists for: Goodspeed's technical assessment, an
AI-powered knowledge base (documents + a RAG chat over them). The brief is
[`docs/assessment.md`](../assessment.md), outside `docs/plans/` so it survives
the squash, and is the acceptance test — every requirement row in it has a step
below.

This plan was written by the `/spinoff` session in `vzakharov/vovazakharov.com`
that seeded the repo, and is left `paused`: the seed carried the foundation,
and everything from "Remaining work" on is the build.

## Session budget

Each session takes one digestible chunk of the remaining work — a slice that
lands whole, leaves `vet` green, and fits in a budget of a little over 200k
tokens. Glance at the running total now and then rather than on every step.
At the chunk's end — or earlier, if the budget is closing in — close it in
this order:

1. `/polish` over the chunk — the quality passes run per chunk, not once for
   the whole plan, so each chunk lands reviewed.
2. Record under "Progress" what is done, what is left, and what the next
   chunk needs — its scope, and anything it has to start from (the stack up,
   a decision still open, a deviation it inherits).
3. `git mv` the plan back to `knowledge-base.paused.md`, commit and push, so
   the next session resumes from the file rather than from the conversation.
4. `/pr` — refresh PR #1's title, body and QA checklist to the branch as it
   now stands, so the PR never trails the work by more than one chunk.

A per-chunk polish is a plain `/polish`: its scope is everything since the
last `polish:` commit, which is the previous chunk's polish, so it covers the
chunk and every commit between. Each pass's commit subject is `polish:` —
never `polish(<scope>):`, which the floor lookup skips, so the next run would
re-read ground already cleared. A chunk's polish is thereby the next one's
floor, and `/finalize`'s reads only what came after the last chunk.

## Done in the seed (this PR)

- `main` carries the agent loop, copied unchanged from the caller.
- This branch carries the frontend foundation, rewritten for a Turborepo
  layout, and builds green under `./scripts/vet.sh`:
  - `apps/web` — Next.js 16 static export, FSD `src/` reduced to the design
    system: the Mantine theme, the colour tokens and their Sass codegen, the
    layered stylesheet import and its `check:mantine-styles` gate,
    `shared/ui` (`Card`, `SummaryCard`, `ChipNav`, `PageShell`, `Section`,
    `InternalLink`, `hoverDim`, `cssColor`), `shared/typings`, `shared/lib`,
    the `switch-theme` feature, a placeholder home page.
  - Repo-wide tooling at the root: the ESLint ruleset with the `vova/*` rules,
    boundaries and Steiger over `apps/web/src`, stylelint, Prettier,
    `type-overlap`, the Node test runner, the cost ledger.
  - `pnpm-workspace.yaml`, `turbo.json` (build, typecheck, dev), per-workspace
    `package.json`, a regenerated lockfile.
  - `CLAUDE.md`, the `fsd`/`styling`/`eslint`/`costs` rules and `/preview`
    rewritten for this repo; `README.md` as a skeleton.
- Left behind in the caller on purpose: i18n and the `no-hardcoded-strings`
  rule (one language here), the markdown content pipeline, the CV, the
  multi-site mechanism, GitHub Pages deploy, the PDF/OG renders.

## Progress

Steps 1–5 are done bar the stretch upload; step 6 has not started. `vet` is
green at the pause and
needs the stack up — `pnpm bootstrap` in a fresh session, after starting
`dockerd` by hand. The API boots only with a model provider configured;
`/preview` says how to point it at the fake one.

**The seventh session** landed the usage page:

- `/usage` over `GET /usage`: a total per kind (Answers, Follow-up
  rewriting, Embeddings) that is also the chart's legend, a note naming
  calls the provider reported no counts for, a stacked column per UTC day
  of the window with a hover or arrow-key tooltip, and the per-model,
  per-day table the brief asks for. `Usage` joined `NAV`.
- The chart is plain SVG measured with `useElementSize`, no chart library.
  Its colours are new tokens `series-1..3` (the dataviz skill's first three
  categorical slots, light and dark steps), validated for CVD separation
  against `#fff` and `#000`; light-mode aqua sits under 3:1 contrast, which
  the table view relieves.
- `usageWindow` / `usageWindowStart` in `@kb/contracts` are the one
  spelling of the 30-UTC-day window, shared by the API's `since` and the
  chart's columns (the `/dry` pass).
- Previewed at 1280 and 500px in both themes with a month of backdated
  usage, hover tooltips at both edges included; `/preview` says how to seed
  that history.
- `/dry` left for the operator: the pending → `Loader`, error →
  `ErrorAlert` query guard is now in four pages.

**The sixth session** landed the chat:

- `/chat` and `/chat?c=…` — the conversation list beside the open thread
  (below `sm` the thread takes the width, the list a link away), answers
  streaming as they are written, each stored answer's sources linking to
  their documents, Stop, and "Ask again" on a failed or stopped question.
  A first question creates the conversation, titled after it, and moves the
  address; `useAsking` lives above the address read so the stream survives
  that.
- `shared/lib/event-stream.ts`: `readEvents`, tested, parses the answer
  stream. `ReadableStream` is wrapped as an async iterable by hand, Safari
  lacking the built-in one.
- `Markdown` and `ConfirmDelete` (the delete modal) joined `shared/ui` at
  their second consumers; `withSearchParam` joined `search-param.ts`, the one
  spelling of every `?param` address.
- The header hides its brand below `sm`, beside the email, so the links fit
  at phone width; the usage row will need that room too.
- Driven end to end in Chromium at 1280 and 500px in both themes: ask,
  follow-up, an uncovered question, Stop mid-answer, ask again — through a
  throwaway CDP driver over Node's global `WebSocket` (gitignored `tmp/`, so
  gone with the container). `/preview` now names the latency trick that
  makes Stop catchable against the fake.
- `/dry` left for the operator, none blocking: `updatedFormat` (the medium
  date) spelled in `document-row.tsx` and `conversation-list.tsx`; the
  pending → `Loader`, error → `ErrorAlert` query guard, now in three pages.
- Stopping a conversation's first question leaves it existing and empty — in
  the list, deletable, asked again in place. Accepted rather than deleting
  it behind the reader's back.

**The fifth session** landed the documents pages:

- `/documents` — the list, a tag filter held in `?tag=`, each row's
  embedding status, and a notice offering to re-embed every document that
  is not searchable. `/documents/new` and `/documents/edit?id=…` share one
  form (title, tags, markdown with Write/Preview tabs through
  `react-markdown` + `remark-gfm` and `prose.scss`); the editor adds delete
  behind a modal and an "Embed again" retry for a failed or stale document.
- `entities/document`: the query options, the writes that keep the cache
  honest (a save's answer goes into its detail entry, the lists and tag
  counts refetch), the routes (`documentHref`, `documentsHref`) and
  `EmbeddingBadge` with the one sentence per status the editor reuses.
- `shared/ui` gained `ErrorAlert` (the error `Alert`, lifted at its third
  use) and `shared/lib/search-param.ts` the `useSearchParam` hook. No
  `@tobeused` tag survives: `InternalButton` and `pick` found consumers.
- `PageShell`'s padding stays as it is: the list reads well at 1280 and at
  500px, previewed in both themes, and create → edit → delete was driven end
  to end in the browser.

**The fourth session** landed knip and the web app's foundation:

- `pnpm knip` runs in vet over every workspace (`knip.jsonc`). Its first run
  deleted the caller's leftover UI (`ChipNav`, `SummaryCard`, `CardLink`,
  `Subheading`, `hoverDim`, `class-names`) and the unused typings, and took
  `export` off what only its own file uses. `@tobeused` survives on
  `InternalButton` (the documents list's "new document") and `pick`.
- `shared/api`: the env parse, the Supabase client (Auth only),
  `createApiClient` — `request(path, schema, init)` parses with the
  contract, `send` returns the raw 2xx `Response` for a 204 or the chat's
  stream — and the `QueryClient`. `entities/session` has `useSession` and
  `signOut`.
- `/sign-in` (sign-in and sign-up, `?next=` back to where the guard sent
  it), the `(signed-in)` route group inside `SignedInLayout` (guard plus an
  `AppShell` header), and `/` as an overview reading `/settings/ai`. The
  header's links are the `NAV` array in `signed-in-layout.tsx`; each page
  adds its row.
- Previewed end to end in both themes and at 500px: guard → sign-in →
  sign-up → overview → sign-out. `/preview` says how to capture behind the
  guard.

**Next session's chunk:** step 6 — the README (setup, architecture
decisions and why, provider swaps with one worked example per preset, what
more time would buy, the Loom links as placeholders the operator fills),
then the `@tobeused` sweep and `/finalize`. The stretch upload stays out
unless the operator asks for it. The `/dry` leftovers listed below are the
operator's call before `/finalize`, not the README's.

**The third session was a full `/polish` and nothing else** (the operator's
call, on budget). The fourth session's polish covered everything after it and
closes with an empty `polish:` commit, which is the branch's floor now — its
two pass commits carry the skipped `polish(chunk: …)` form. `/dry` left these for the
operator, none blocking:

- API: an owned-row lookup/delete/404 helper shared by the conversation and
  document services; a `NamedError` base for the four error classes; one
  fixed-size-pieces helper for embedding batches and chunker runs; a shared
  `' › '` heading trail for the chunker and the prompt; a `trimmed(max)`
  title schema in `contracts/src/fields.ts`; one `loggable(error)` for the
  error filter and the stream.
- ESLint: the boundaries strictness rules spelled in both apps' blocks of
  `eslint.config.ts`; the fully-defaulted-param check written in two rules;
  build-output ignore globs in both ESLint and stylelint.
- Web: `defaultColorScheme="auto"` in the root layout and the provider (the
  `'use client'` boundary decides where a shared const could live); the
  `150ms ease` hover timing in two stylesheets; `prose.scss`'s blockquote
  bar equal to `--color-border-hairline-strong`; its `1.25em` flow space.
- Tooling: the start-month slice in `session-cost.ts` and `cost-totals.ts`.
- `.claude/rules/README.md` lost its "ships empty" line, and
  `watermark.json` lists it as adopted verbatim, so `/update-muthur` will
  show a diff there.
- `apps/api/src/ingestion/chunker.ts` says "The README explains the numbers
  below" — true only once step 6's README lands.

**Still open from the second session:** whether to land the foundation and
backend as they stand and build the web app in a PR of its own, or carry on
here. This session carried on here, as the operator's "давай продолжать" read.

**Open questions, as taken:** 1 — the aggregate Mantine sheet, and
`check:mantine-styles` retired. 2 — lint stays at the root. 3 — boundaries
over the API, lightly (`eslint.config.ts` § the API's layout). 4 — the
recommendation, `vector(1536)` and `text-embedding-3-small`; the 768-for-all
alternative is still a one-migration change. 5 — Docker runs in the cloud
session: `dockerd` is started by hand and images come from
`public.ecr.aws` (Docker Hub rate-limits it), so the local stack is how the
database layer is verified.

**Where the build departs from the steps below:**

- Usage is its own append-only `usage_events` table (kind, provider, model,
  tokens) rather than token columns on `messages`, so embedding and condense
  calls are counted too; `usage_by_day` aggregates it.
- The list, tag and usage reads are `security invoker` SQL functions rather
  than views, since the type generator reads every view column as nullable.
- `document_chunks.user_id` is held equal to the document's by a composite
  foreign key; `replace_document_chunks` swaps a document's chunks in one
  transaction, guarded by `content_hash`.
- Local Auth signs with an ES256 key in `supabase/signing_keys.json`
  (gitignored), so the API verifies tokens against JWKS; generating it is the
  setup script's job.
- API tests run under `@swc-node/register` (`apps/api/register.js`), since
  `tsx` cannot emit decorator metadata; `pnpm test` is now the root's own
  tests plus `turbo run test`.
- The setup script is `pnpm bootstrap`, since `pnpm setup` is a pnpm
  built-in. It applies pending migrations rather than resetting, so a re-run
  keeps the reviewer's data, and it merges into an existing `.env` rather
  than overwriting it.
- `.env.example` is one per app, beside the `.env` each reads, rather than
  one at the root. The web template already names the variables step 5
  reads: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_API_URL`.
- `supabase/seed.sql` is dropped and seeding is off: a document is useful
  only embedded, which SQL cannot do.
- `@steiger/toolkit` stays a devDependency knip is told to ignore: the
  Steiger plugin's declarations import it.
- The theme toggle lives in the signed-in header and on the sign-in card;
  the fixed theme corner is gone. The sign-in card's heading is an `h2`,
  since the theme's `h1` grows with the viewport past the card's width.
- A list row's excerpt is plain text: `markdown_excerpt` (its own migration,
  tested in pgTAP) takes the markdown's syntax out of the opening, so a row
  does not open on `# Heading **bold**`.
- The overview at `/` is a real page — the configured models, from
  `/settings/ai` — rather than a placeholder, so the typed client has a
  consumer from the first chunk.

## Remaining work

Ordered so each step leaves `vet` green and the app runnable.

### 1. Settle the foundation

- [x] Answer the open questions below; the answers change steps 2–4.
- [x] Strip the print medium the design system still carries — `@media print`
      blocks in `card.module.scss`, `theme.module.scss`, `prose.scss`, the
      `print-hidden` classes in `chip-nav.tsx` and `theme-toggle.tsx`, and
      the comments naming the deleted `print.scss`. The caller printed its
      pages to PDF; nothing here prints.
- [x] Retarget `prose.scss` from the caller's content pipeline to rendered
      document markdown (the document view and the chat's answers), dropping
      the Shiki/Mermaid/directive rules nothing here emits.
- [x] Revisit `no-console` in `eslint/rule-groups/core.ts`: its rationale is the
      static export's, and the API logs through Nest's `Logger`.

### 2. Monorepo and DX

- [x] `packages/contracts` (`@kb/contracts`) — Zod schemas for every request
      and response the API exchanges with the web app; both sides infer their
      types from it (CLAUDE.md § "Derive types and schemas").
- [x] `apps/api` — NestJS, built with SWC. Its tsconfig extends the root but
      turns off `erasableSyntaxOnly` and turns on decorator metadata, since
      Nest's DI is constructor parameter properties plus
      `emitDecoratorMetadata`. Extend `eslint.config.ts` for it: a scoped block
      for what Nest's idiom needs (`no-extraneous-class` with
      `allowWithDecorator`, parameter properties), and — if the answer to Q3 is
      yes — a boundaries layout over its modules.
- [x] `supabase/` at the root, the CLI's own layout: `config.toml` (email
      confirmation off locally, or Mailpit documented), `migrations/`,
      `seed.sql`. The `supabase` npm package as a root devDependency, so no
      global install.
- [x] `pnpm bootstrap`: install → signing key → `supabase start` → pending
      migrations → write each app's `.env` from `supabase status` plus the AI
      defaults → print what is left to configure. `pnpm dev` runs web and api
      through Turborepo.
- [x] `.env.example` per app, every variable documented.
- [x] Add each new workspace's checks to `vet.sh` and CLAUDE.md § "Vetting" in
      the same change.
- [x] Update `/preview` with the routes as they land (step 5).
- [x] Knip over every workspace — unused files, exports, dependencies — with
      its Next, NestJS, ESLint and Node-test plugins, joining `vet.sh` and
      CLAUDE.md § "Vetting" in the same change. An export kept for a later
      step carries a `@tobeused` JSDoc tag, which the config excludes
      (`tags: ["-tobeused"]`); every other finding is fixed by deleting the
      code. First in the next chunk, so step 5 starts from a tree knip passes.

### 3. Database

- [x] Migration: `documents` (`id`, `user_id` default `auth.uid()`, `title`,
      `content`, `tags text[]`, `content_hash`, `embedding_status`,
      `created_at`, `updated_at` via trigger).
- [x] Migration: `document_chunks` (`document_id` on delete cascade,
      `user_id` denormalized for the policy and the search filter,
      `chunk_index`, `content`, `embedding vector(<dims>)`,
      `embedding_model`), HNSW index on `vector_cosine_ops`.
- [x] Migration: `conversations`, `messages` (`role`, `content`,
      `citations jsonb`, `model`, `prompt_tokens`, `completion_tokens`).
- [x] RLS on every table, one policy per operation, `user_id = auth.uid()`.
- [x] `match_document_chunks(query_embedding, match_count, min_similarity)` —
      `security invoker`, so the caller's RLS scopes the search and no
      `user_id` argument can be spoofed.
- [x] Tests over the policies: a second user sees, updates and deletes nothing
      of the first's (CLAUDE.md § "Testing": authorization code must have
      tests).

### 4. API

- [x] Auth guard: verify the Supabase access token (JWKS), then build a
      per-request Supabase client carrying the user's JWT, so Postgres RLS is
      the enforcement and the API's own scoping is the second line. No
      service-role key on any user-data path.
- [x] Config module: one Zod schema over `process.env`, parsed at boot —
      a misconfigured provider fails the start, not the first request.
- [x] AI layer (the brief's "key requirement"):
  - Two capabilities, configured independently: `ChatModel` (`stream`,
    `complete`) and `EmbeddingModel` (`embed`, `dimensions`). Independent
    because providers differ: Groq and OpenRouter serve chat but no
    embeddings, so "swap the provider" has to mean per capability.
  - One implementation of each over the `openai` SDK with `baseURL`, `apiKey`
    and `model` from config. Provider presets (`openai`, `groq`, `together`,
    `openrouter`, `ollama`) are data — a default base URL and a capability
    row (streams usage or not, serves embeddings or not) — never a subclass.
  - Nest injection tokens for both; RAG code depends on the interfaces only.
  - At boot, compare `EMBEDDING_DIMENSIONS` with the column's dimension and
    refuse to start on a mismatch.
  - Tests: fakes for the RAG services; the OpenAI-compatible implementation
    tested against a local HTTP server speaking the spec (CLAUDE.md: mock at
    HTTP boundaries).
- [x] Documents module: CRUD over `@kb/contracts` schemas.
- [x] Ingestion: on create and on update-with-changed-`content_hash`, chunk →
      embed in batches → replace the document's chunks → set
      `embedding_status`. A failure sets `failed` and propagates; a retry
      endpoint re-runs it.
  - Chunking: markdown-aware recursive split — headings, then paragraphs,
    then sentences — to a target of ~800 tokens with ~15% overlap, the
    document title and heading path prefixed to the text that is embedded.
    Tokens estimated from characters so no one provider's tokenizer is baked
    in. The README explains each number.
- [x] Chat module: condense a follow-up into a standalone query from the
      history → embed → `match_document_chunks` → prompt with numbered
      context blocks and an instruction to answer only from them, cite `[n]`,
      and say so when the context does not hold the answer → stream.
  - Transport: `POST` returning `text/event-stream`, read with `fetch` on the
    client (`EventSource` can send neither a body nor an `Authorization`
    header). Token deltas, then one final event carrying citations and usage.
  - Persist both turns with citations and token counts.
- [x] Usage endpoint aggregating tokens per model per day.

### 5. Web

- [x] Supabase Auth in the browser (email/password sign-up, sign-in,
      sign-out); a client-side guard around every authenticated route.
- [x] Server state through TanStack Query over an API client typed from
      `@kb/contracts`; no second store for what the server owns.
- [x] **Routes use search params, not dynamic segments** — `/documents/edit?id=…`,
      `/chat?c=…`. A static export needs every dynamic segment's values at
      build time, and user data has none.
- [x] Documents: list with tag filter, create/edit with a markdown preview,
      delete with confirmation, embedding status visible.
- [x] Chat: conversation list, streaming answer, citations linking back to
      the chunk's document, history kept across sessions.
- [x] Usage page.
- [ ] Stretch, last and only if time allows: PDF/TXT upload with text
      extraction into a new document.

### 6. Submission

- [ ] README: setup, architecture decisions and why, how to swap providers
      (one worked example per preset), what more time would buy, both Loom
      links.
- [ ] No `@tobeused` tag survives: each export either found its consumer
      (drop the tag) or never did (drop the export).
- [ ] `/finalize`.

## Open questions

1. **`check:mantine-styles` behind sign-in.** The check reads the static
   export's HTML, and almost every page here renders only after sign-in, so
   the sheets those pages need never appear in it and the check reports them
   as unused. Recommend importing Mantine's aggregate `styles.layer.css` and
   retiring the check: its premise — the static HTML shows what renders —
   does not hold for this app, and ~25 kB gzipped is not what an assessment
   is judged on. The alternative is a static route that renders every
   component in use, kept in sync by hand.
2. **Lint at the root or per workspace.** Turborepo's idiom is an
   `eslint-config` package and a cached `lint` task per workspace. The
   carried ruleset is one type-aware config over the whole tree. Recommend
   keeping it at the root and saying why in the README — one config, one
   run, the boundaries rules able to see across workspaces — unless you would
   rather show the idiom to reviewers.
3. **Boundaries over the API.** Recommend yes, lightly: `modules/*` reach each
   other only through a module's exported providers, `ai/` is imported by
   nothing but the modules that need a model.
4. **Default embedding model.** Recommend OpenAI `text-embedding-3-small` at
   1536 dimensions as the documented default, with the Ollama path
   (`nomic-embed-text`, 768) as the no-key local option — which means
   switching between them is a migration plus a re-embed, and the README
   says so. Or pick 768 as the column and use OpenAI's `dimensions`
   parameter to match it, which makes both paths share one schema.
5. **Where the DB layer gets verified.** The Supabase CLI runs on Docker,
   which a cloud session may not have. If it does not, the RLS tests and the
   end-to-end flow need either a hosted Supabase project whose URL and keys go
   into the environment's secrets, or Postgres with pgvector installed by the
   environment setup script.

## DRY notes

- **`@kb/contracts` is the one home of every wire shape.** The API validates
  with the schemas, the web client infers its types from them; nothing
  redeclares a DTO. `type-overlap` spans every workspace, so a duplicated
  member between `apps/web` and `apps/api` fails the gate and names the
  shared home it wants.
- **One implementation per AI capability.** Provider differences are data (a
  preset row), so adding a provider adds a row, not a class. A subclass per
  provider would duplicate everything but the base URL.
- **One ingestion path** serves create and update; update differs only in
  first deleting the old chunks, gated by `content_hash`.
- **RLS policies stay explicit per table**, not generated by a helper
  function: four short policies per table read as the security model
  itself, which is what a reviewer is looking for, and a generator would
  hide them.
- **The design system is carried, not re-made.** New UI composes
  `shared/ui` and the theme; a component joins `shared/ui` only once two
  slices use it.
