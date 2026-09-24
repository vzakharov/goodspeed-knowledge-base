# Knowledge Base

Keep documents, then ask questions about them: a chat that answers from your own
documents by retrieving the passages relevant to each question (RAG).

- **Monorepo** — Turborepo on pnpm
- **Web** — Next.js 16 (App Router, static export), React 19, Mantine 9,
  TanStack Query
- **API** — NestJS
- **Database** — Supabase: Postgres with pgvector, and Supabase Auth
- **AI** — any provider that speaks the OpenAI API specification

What is there: sign-up and sign-in; documents in markdown with tags, a preview
and each one's embedding status, typed in or read from a dropped `.txt`, `.md`
or `.pdf` file; a chat that streams its answers, cites the passages it used and
keeps its conversations across sessions; and a usage page counting tokens per
model per day. All of the brief's stretch goals are in.

## Setup

Prerequisites: Node 24, pnpm 10, and Docker running — the local Supabase stack
runs on it through the Supabase CLI, which installs with the rest.

```bash
pnpm bootstrap
```

That installs the dependencies, starts the local stack, applies the
migrations, and writes `apps/api/.env` and `apps/web/.env` from the
`.env.example` beside each. With the defaults, what is left is an OpenAI key
for `CHAT_API_KEY` and `EMBEDDING_API_KEY`, and it asks for both. Enter skips
a key — to set in `apps/api/.env` later, or on
[another provider](#swapping-ai-providers) — and at the second prompt reuses
the first. It ends by saying what is still left to configure. Then:

```bash
pnpm dev
```

The web app is at <http://localhost:3000>, the API at <http://localhost:4000>,
and Supabase Studio at <http://localhost:54323>. Sign up with any address —
local email confirmation is off. Re-running `pnpm bootstrap` is safe: it
restarts nothing, resets no data, and keeps what you set.

Every variable is documented in the `.env.example` it comes from. To run the
checks — build, types, lint, format, knip, the unit tests, the pgTAP policy
tests and the API's end-to-end suite — with the stack up:

```bash
./scripts/vet.sh
```

## Layout

```text
apps/web            Next.js, static export, Feature-Sliced Design under src/
apps/api            NestJS: auth, documents, ingestion, chat, usage, ai
packages/contracts  @kb/contracts — Zod schemas for every request and response
supabase/           migrations and pgTAP tests, in the Supabase CLI's layout
scripts/            bootstrap, vet and the checks it runs
```

## Architecture decisions

[`docs/design-notes.md`](docs/design-notes.md) weighs each of these against
its alternatives, explains the parts of the code that are not obvious from
reading it, and lists the shortcuts taken on purpose.

**One contract package, types inferred from it.** Every body the API and the
web app exchange is a Zod schema in `@kb/contracts`. The API validates requests
with it, the web client parses every response with it, and both infer their
TypeScript types from it, so nothing redeclares a DTO. The database types are
generated from the schema (`pnpm db:types`), so from Postgres to the browser
each shape has one source.

**Row-level security is the authorization.** The API verifies the Supabase
access token against the project's JWKS, then queries Postgres _as that user_,
with the publishable key and the user's JWT. So the policies decide what a
request can reach, and no service-role key exists anywhere in the app. Every
table has RLS with one policy per operation, `user_id = auth.uid()`. The vector
search, `match_document_chunks`, is `security invoker`: the caller's policies
scope it, and there is no user id argument to spoof. The pgTAP suites under
`supabase/tests/` check that a second user and an anonymous caller reach none
of the first user's rows, and the end-to-end suite checks the same through
every API route.

**The schema.** `documents` holds the markdown, tags, a `content_hash` and the
embedding status. `document_chunks` holds each chunk's text, its heading path,
a `vector(1536)` under an HNSW cosine index, and the model that embedded it:
vectors from two models share no space, so the search only compares chunks
embedded by the model the query was, and a model swap leaves old chunks
visibly stale rather than silently wrong. `conversations` and `messages` keep
the chat, each answer with a snapshot of the passages it cited, so a citation
survives its document being edited. `usage_events` is an append-only record of
every model call — answers, follow-up rewriting and embeddings — and
`usage_by_day` aggregates it. Migrations are plain SQL under
`supabase/migrations/`, applied by the CLI and never edited once applied. The
list, tag and usage reads are `security invoker` functions rather than views,
since the type generator reads every view column as nullable.

**Chunking.** The chunker (`apps/api/src/ingestion/chunker.ts`) is
markdown-aware: its unit is a block — a paragraph, a list, a table, a fenced
code block — so a chunk cuts through a block only when that one block is too
large for a chunk, and then by sentences, then by words. A level 1 or 2
heading always starts a new chunk, since it starts a new topic. The numbers:

- **~800 tokens a chunk.** Large enough to hold a section's argument whole —
  a chunk that holds only half an answer retrieves as half an answer — and
  small enough that six of them leave the prompt focused.
- **15% overlap**, only where a chunk continues the one before it mid-section:
  a sentence that sits on the seam is then whole in at least one chunk. A
  chunk that opens a new section carries nothing over.
- **4 characters a token**, an estimate rather than a tokenizer, so no one
  provider's tokenizer is baked into a pipeline meant to swap providers. Chunks
  run some percent either side of their target, which costs nothing here.
- **What is embedded is the chunk under its document title and heading
  path**, so a chunk that says "it" is still found by what "it" is.

**Ingestion runs in the request.** Creating or saving a document chunks it,
embeds the chunks in batches and swaps them in one transaction, guarded by the
`content_hash` so an edit that changes neither title nor body embeds nothing.
Running in the request means the response already says how it went. A
provider failure is saved as the document's `failed` status, with the
provider's message, because the text is saved either way; the reader retries
from the document.

**Retrieval and the prompt.** A follow-up question is first rewritten into
one that stands alone ("and how do I undo that?" retrieves nothing until
"that" is named), from the last 8 messages. The rewrite is embedded and the 6
nearest chunks at cosine similarity 0.25 or better become numbered sources.
The threshold is low on purpose: the model is told to answer only from the
sources, to cite each statement as `[n]`, and to say so when the sources do
not cover the question, which fails better than a threshold that drops the one
relevant chunk. Earlier answers' `[n]` are stripped from the history, since
they point at sources that are not in this prompt.

**Streaming.** The chat is a `POST` answered with `text/event-stream`: text
deltas as the model writes, then one final event with the stored message, its
citations and usage. The client reads it with `fetch` because `EventSource`
can send neither a body nor an `Authorization` header. Stop aborts the
request, the abort reaches the provider call, and a stopped answer is not
stored.

**The AI layer is two capabilities, and a provider is a row of data.** The
code that uses a model sees only two interfaces, in outline (the full ones are
in `apps/api/src/ai/models.ts`):

```ts
type ChatModel = {
  complete: (messages: ChatMessage[]) => Promise<ChatCompletion>;
  stream: (messages: ChatMessage[]) => AsyncIterable<ChatStreamPart>;
};

type EmbeddingModel = {
  dimensions: number;
  embed: (texts: string[]) => Promise<Embeddings>;
};
```

They are separate because providers are: Groq and OpenRouter serve chat but
no embeddings, so "which provider" is asked once per capability, and each is
configured on its own. One implementation of each speaks the OpenAI API
through the `openai` SDK with a configured base URL, key and model. A provider
is a preset in `providers.ts` — a default base URL and what the server
supports (embeddings, usage in streams, the `dimensions` parameter) — so
adding one adds a row, not a class. Nest injects both by token, so the RAG
code never learns which provider is behind them. The configuration is parsed
with Zod at boot, and the API refuses to start on a misconfiguration: an
unknown provider, a missing key, a provider that serves no embeddings in the
embedding slot, or an embedding dimension that differs from the column's.
Token counts a provider did not report are stored as unknown rather than zero,
and the usage page names them.

**The web app is a static export.** There is nothing for a Next.js server to
do here: the API holds the data, and sign-in goes from the browser straight to
Supabase Auth. So routes use search parameters rather than dynamic segments
(`/documents/edit?id=…`, `/chat?c=…`), since a static export needs every
segment's values at build time, and the signed-in routes sit behind a
client-side guard — the API and RLS are what protect the data, the guard only
routes. Server state lives in TanStack Query, with no second store for it.
`src/` follows Feature-Sliced Design (app, pages, features, entities, shared),
its import rules enforced by ESLint's boundaries plugin and Steiger. The UI is
Mantine over a small set of colour tokens with a light and a dark scheme.

**The API's modules.** `config`, `http`, `database` and `auth` are
infrastructure any module may use. The feature modules — `documents`,
`ingestion`, `chat`, `usage` — reach each other only through a module's
`index.ts`, and `ai/` only from the modules that call a model. ESLint enforces
both, so the dependency graph is written down rather than discovered.

**Lint runs once, at the root.** Turborepo's idiom is a lint task per
workspace. Here one type-aware ESLint config runs over the whole tree, because
its boundaries rules have to see across workspaces and one run is simpler to
keep honest than a config package per app. Turborepo runs `build`, `dev`,
`typecheck` and the tests, each depending on `@kb/contracts` being built
first.

## Swapping AI providers

A swap is a change to `apps/api/.env` and a restart of `pnpm dev`; no code
changes. Chat and embeddings are configured apart, each with its own
`*_PROVIDER`, `*_MODEL`, `*_API_KEY` and `*_BASE_URL`. The provider is one of
`openai`, `groq`, `together`, `openrouter`, `ollama` or `custom`; each preset
knows its base URL, and `*_BASE_URL` overrides it — a proxy, a gateway.

The vector column is 1536 wide, which is OpenAI's `text-embedding-3-small`.
Keeping the embeddings there and swapping only chat is one block of the file.
Swapping the embedding model to another at 1536 is two lines, after which the
documents page offers to re-embed everything under the new model. A model of
another width needs a migration — below, under Ollama.

**OpenAI** — the default:

```dotenv
CHAT_PROVIDER=openai
CHAT_MODEL=gpt-5-mini
CHAT_API_KEY=sk-…
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_API_KEY=sk-…
```

**Groq** serves chat only, so the embeddings stay where they are:

```dotenv
CHAT_PROVIDER=groq
CHAT_MODEL=llama-3.3-70b-versatile
CHAT_API_KEY=gsk_…
```

**Together AI** serves both. Its embedding models are not 1536 wide, so moving
them is the migration under Ollama; moving only chat keeps the column:

```dotenv
CHAT_PROVIDER=together
CHAT_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
CHAT_API_KEY=…
```

**OpenRouter** serves chat only, with models named `vendor/model`:

```dotenv
CHAT_PROVIDER=openrouter
CHAT_MODEL=meta-llama/llama-3.3-70b-instruct
CHAT_API_KEY=sk-or-…
```

**Ollama**, local and keyless. Chat alone is:

```dotenv
CHAT_PROVIDER=ollama
CHAT_MODEL=llama3.2
```

Moving the embeddings too — nothing leaving the machine — takes a model of
another width: `nomic-embed-text` is 768. Add a migration
(`pnpm exec supabase migration new embeddings_768`) that deletes the old
chunks, changes `document_chunks.embedding` to `vector(768)`, recreates its
HNSW index and redefines `match_document_chunks` over a `vector(768)`
argument; apply it with `pnpm exec supabase migration up`, then:

```dotenv
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
```

and re-embed from the documents page. Until the column and the setting agree
the API refuses to start and says which to change.

**Any other server speaking the API** — vLLM, LiteLLM, a gateway — is
`custom` with its base URL:

```dotenv
CHAT_PROVIDER=custom
CHAT_MODEL=my-model
CHAT_BASE_URL=http://localhost:8000/v1
```

## What I would do with more time

- **Make the design calls myself, at the forks.** After four or five hours of
  agent work I read through some 250 files it had written, instead of taking
  each decision as it came up and knowing what every part does because I chose
  it. The calls it made aren't necessarily bad, but I would have made far more
  of them. Two examples:
  - _The static export._ It has real upsides, and trade-offs with them: a
    loader shown on every page, and not the prettiest URLs (`/chat?c=…`). I
    would probably have landed on the same choice, but as an informed one.
  - _The chat's data model._ A question and its answer are separate rows in
    `messages`. There is never a question without an answer, so for a system
    like this one row per exchange often makes more sense.
- **Branching conversations**: regenerate an answer and move back and forth
  between the versions, the way chat products do.
- **Document processing in the background, tested on hard files.** I have
  tried it on small PDFs, where it works fine. Large PDFs, scans with no text
  layer and broken files each need working out how the app should handle them,
  and those edge cases are a line of work of their own.
- **Retrieval quality.** RAG doesn't always get it right — the walkthrough
  shows a fairly simple question it misses. Semantic chunking and the like;
  in any system like this, the main work is in those details.
- **A cloud deployment**, on something simple like Railway, so the app can be
  shown with a link — and PR preview deployments on top, which always pay off:
  any feature can be tried live without running a local server. That work is
  tedious — auth, basic rate limits and so on — so it doesn't pay for itself
  in a test assignment, which is why the setup here is a local
  `pnpm bootstrap`: the fastest and most convenient option.
- **The UI.** Not gradients and shine — round the cards here, drop an
  underline there. Even with design ownership I would lean ascetic.

## Walkthroughs

- The app: _(Loom link to come)_
- How AI accelerated the work: _(Loom link to come)_
