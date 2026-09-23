# Knowledge Base

Keep documents, then ask questions about them: a chat that answers from your own
documents by retrieving the passages relevant to each question (RAG).

- **Monorepo** — Turborepo on pnpm
- **Web** — Next.js 16 (App Router, static export), React 19, Mantine 9
- **API** — NestJS
- **Database** — Supabase: Postgres with pgvector, and Supabase Auth
- **AI** — any provider that speaks the OpenAI API specification

> **Status:** under construction. The sections below marked _(to come)_ are
> filled in as the pieces they describe land.

## Setup

Prerequisites: Node 24, pnpm 10, and Docker running — the local Supabase stack
runs on it through the Supabase CLI, which installs with the rest.

```bash
pnpm bootstrap
```

That installs the dependencies, starts the local stack, applies the
migrations, and writes `apps/api/.env` and `apps/web/.env` from the
`.env.example` beside each. It ends by saying what is left to configure —
with the defaults, an OpenAI key in `CHAT_API_KEY` and `EMBEDDING_API_KEY`.
Set it, then:

```bash
pnpm dev
```

The web app is at <http://localhost:3000>, the API at <http://localhost:4000>,
and Supabase Studio at <http://localhost:54323>. Re-running `pnpm bootstrap`
is safe: it restarts nothing, resets no data, and keeps what you set.

## Architecture decisions

_(to come)_

## Swapping AI providers

_(to come)_

## What I would do with more time

_(to come)_

## Walkthroughs

- The app: _(Loom link to come)_
- How AI accelerated the work: _(Loom link to come)_
