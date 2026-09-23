# Knowledge Base — the assessment build

The product this repository exists for: Goodspeed's technical assessment, an
AI-powered knowledge base (documents + a RAG chat over them). The brief is
[`docs/assessment.md`](../assessment.md), outside `docs/plans/` so it survives
the squash, and is the acceptance test — every requirement row in it has a step
below.

This plan was written by the `/spinoff` session in `vzakharov/vovazakharov.com`
that seeded the repo, and is left `paused`: the seed carried the foundation,
and everything from "Remaining work" on is the build.

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

## Remaining work

Ordered so each step leaves `vet` green and the app runnable.

### 1. Settle the foundation

- [ ] Answer the open questions below; the answers change steps 2–4.
- [ ] Strip the print medium the design system still carries — `@media print`
      blocks in `card.module.scss`, `theme.module.scss`, `prose.scss`, the
      `print-hidden` classes in `chip-nav.tsx` and `theme-toggle.tsx`, and
      the comments naming the deleted `print.scss`. The caller printed its
      pages to PDF; nothing here prints.
- [ ] Retarget `prose.scss` from the caller's content pipeline to rendered
      document markdown (the document view and the chat's answers), dropping
      the Shiki/Mermaid/directive rules nothing here emits.
- [ ] Revisit `no-console` in `eslint/rule-groups/core.ts`: its rationale is the
      static export's, and the API logs through Nest's `Logger`.

### 2. Monorepo and DX

- [ ] `packages/contracts` (`@kb/contracts`) — Zod schemas for every request
      and response the API exchanges with the web app; both sides infer their
      types from it (CLAUDE.md § "Derive types and schemas").
- [ ] `apps/api` — NestJS, built with SWC. Its tsconfig extends the root but
      turns off `erasableSyntaxOnly` and turns on decorator metadata, since
      Nest's DI is constructor parameter properties plus
      `emitDecoratorMetadata`. Extend `eslint.config.ts` for it: a scoped block
      for what Nest's idiom needs (`no-extraneous-class` with
      `allowWithDecorator`, parameter properties), and — if the answer to Q3 is
      yes — a boundaries layout over its modules.
- [ ] `supabase/` at the root, the CLI's own layout: `config.toml` (email
      confirmation off locally, or Mailpit documented), `migrations/`,
      `seed.sql`. The `supabase` npm package as a root devDependency, so no
      global install.
- [ ] `pnpm setup`: install → `supabase start` → `supabase db reset` → write
      each app's `.env` from `supabase status -o env` plus the AI defaults →
      print what is left to configure. `pnpm dev` runs web and api through
      Turborepo.
- [ ] `.env.example` at the root, every variable documented, grouped by the
      workspace that reads it.
- [ ] Add each new workspace's checks to `vet.sh` and CLAUDE.md § "Vetting" in
      the same change; update `/preview` with the routes as they land.

### 3. Database

- [ ] Migration: `documents` (`id`, `user_id` default `auth.uid()`, `title`,
      `content`, `tags text[]`, `content_hash`, `embedding_status`,
      `created_at`, `updated_at` via trigger).
- [ ] Migration: `document_chunks` (`document_id` on delete cascade,
      `user_id` denormalized for the policy and the search filter,
      `chunk_index`, `content`, `embedding vector(<dims>)`,
      `embedding_model`), HNSW index on `vector_cosine_ops`.
- [ ] Migration: `conversations`, `messages` (`role`, `content`,
      `citations jsonb`, `model`, `prompt_tokens`, `completion_tokens`).
- [ ] RLS on every table, one policy per operation, `user_id = auth.uid()`.
- [ ] `match_document_chunks(query_embedding, match_count, min_similarity)` —
      `security invoker`, so the caller's RLS scopes the search and no
      `user_id` argument can be spoofed.
- [ ] Tests over the policies: a second user sees, updates and deletes nothing
      of the first's (CLAUDE.md § "Testing": authorization code must have
      tests).

### 4. API

- [ ] Auth guard: verify the Supabase access token (JWKS), then build a
      per-request Supabase client carrying the user's JWT, so Postgres RLS is
      the enforcement and the API's own scoping is the second line. No
      service-role key on any user-data path.
- [ ] Config module: one Zod schema over `process.env`, parsed at boot —
      a misconfigured provider fails the start, not the first request.
- [ ] AI layer (the brief's "key requirement"):
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
- [ ] Documents module: CRUD over `@kb/contracts` schemas.
- [ ] Ingestion: on create and on update-with-changed-`content_hash`, chunk →
      embed in batches → replace the document's chunks → set
      `embedding_status`. A failure sets `failed` and propagates; a retry
      endpoint re-runs it.
  - Chunking: markdown-aware recursive split — headings, then paragraphs,
    then sentences — to a target of ~800 tokens with ~15% overlap, the
    document title and heading path prefixed to the text that is embedded.
    Tokens estimated from characters so no one provider's tokenizer is baked
    in. The README explains each number.
- [ ] Chat module: condense a follow-up into a standalone query from the
      history → embed → `match_document_chunks` → prompt with numbered
      context blocks and an instruction to answer only from them, cite `[n]`,
      and say so when the context does not hold the answer → stream.
  - Transport: `POST` returning `text/event-stream`, read with `fetch` on the
    client (`EventSource` can send neither a body nor an `Authorization`
    header). Token deltas, then one final event carrying citations and usage.
  - Persist both turns with citations and token counts.
- [ ] Usage endpoint aggregating tokens per model per day.

### 5. Web

- [ ] Supabase Auth in the browser (email/password sign-up, sign-in,
      sign-out); a client-side guard around every authenticated route.
- [ ] Server state through TanStack Query over an API client typed from
      `@kb/contracts`; no second store for what the server owns.
- [ ] **Routes use search params, not dynamic segments** — `/documents/edit?id=…`,
      `/chat?c=…`. A static export needs every dynamic segment's values at
      build time, and user data has none.
- [ ] Documents: list with tag filter, create/edit with a markdown preview,
      delete with confirmation, embedding status visible.
- [ ] Chat: conversation list, streaming answer, citations linking back to
      the chunk's document, history kept across sessions.
- [ ] Usage page.
- [ ] Stretch, last and only if time allows: PDF/TXT upload with text
      extraction into a new document.

### 6. Submission

- [ ] README: setup, architecture decisions and why, how to swap providers
      (one worked example per preset), what more time would buy, both Loom
      links.
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
