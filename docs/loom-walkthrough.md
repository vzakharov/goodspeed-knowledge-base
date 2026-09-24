# Loom walkthrough — talking points

The order of the app walkthrough and what each part must not leave out. The
cues are for speaking freely, not for reading aloud. Target about 4:30 of the
5:00 the brief allows; talk over the waits (embedding, streaming, bootstrap)
rather than sitting through them.

**Before recording**

- The database already holds a few documents; the PDF to upload is at hand.
- `CHAT_API_KEY` and `EMBEDDING_API_KEY` blanked in `apps/api/.env`, so
  `pnpm bootstrap` asks for them; the key copied and checked.
- The editor open on the repo root, folders collapsed.

## 0:00 — Intro

_On screen: the app, open on Chat._

- Vova, Goodspeed assessment: a **knowledge base** — keep documents, chat
  answers from them.
- **All local**: Turborepo monorepo, Next.js, NestJS API, **Supabase in
  Docker** — **row-level security** keeps each user to their own data.

## 0:20 — Documents

_On screen: Documents → New document → drop the PDF → save → badge turns
Searchable._

- Opens on **Chat** because documents exist; **none → Documents**, waiting for
  the first.
- Typed in **markdown**, or read from a **file**.
- **PDF parsed in the browser** → server gets **text only**, no file to store
  or clean up.
- While it embeds — **chunking**: ~**800 tokens**, along the **markdown
  structure**, a **major heading starts a new chunk**, a little **overlap** at
  a mid-section seam.
- A few seconds → **Searchable**.

## 1:00 — Chat

_On screen: Chat → new conversation → type the question so it can be read._

- The new document argues **web over terminal** for coding agents — an
  **opinion**, not model knowledge.
- **Open question on purpose**: answer takes that side **and cites** the
  document → it came from **my documents**, not general knowledge.
- While it streams:
  - **Streaming** — a stretch goal.
  - Pipeline: question **embedded** with the same model → **closest chunks**
    by vector similarity → **into the prompt, numbered** → model answers and
    **cites** them.
- Once done:
  - Pulled points from **other documents** too, not only the new one.
  - **Citation opens its document** (click one).
  - **Conversations in the sidebar**, kept across sessions — a stretch goal.
- Design: **rudimentary** — brief asks **usable, not beautiful**; I lean
  **ascetic**.
  - **Corners cut on purpose**: bolder **bubbles**, links **without
    underlines** — "looks like ten minutes, rarely is".

## 2:10 — Usage

_On screen: Usage._

- **Tokens per model per day**.
- Chart **hand-rolled, no chart library** — for **one chart** a dependency
  outweighs the code it saves; **more charts → take one**.
- How the code was written → **the second video**.

## 2:35 — Models

_On screen: Models._

- What the **API is configured with**.
- **Chat and embeddings separate** — provider, model, key, base URL each —
  because **not every provider serves both**.
- **Any OpenAI-compatible provider** (OpenAI, Groq, OpenRouter, local Ollama)
  → a change to the **environment**, not the code.
- Later: **bring your own key** lives here.

## 3:05 — Setup

_On screen: stop `pnpm dev` → `pnpm bootstrap` → paste the key → Enter at the
second prompt → `pnpm dev` → ask "What is the precedent fallacy?"_

- For whoever clones it: **one command**, `pnpm bootstrap`.
- It **installs dependencies**, **starts Supabase in Docker**, **applies
  migrations**, **writes both `.env` files**.
- Asks for **just the two keys** — one OpenAI key here, **Enter reuses** it
  for embeddings.
- `pnpm dev` → back → another question from my documents → answered.

## 3:55 — Outro

_On screen: the editor; expand each folder as it is named._

- **Architecture in detail → on our call**; in short:
  - `apps/web` — Next.js, **static export**, **Feature-Sliced Design**.
  - `apps/api` — NestJS, **everything server-side**: auth, embeddings, model
    calls.
  - `packages/contracts` — a **Zod schema for every request and response**;
    both apps **infer their types** from it.
  - `supabase` — **migrations**, **pgTAP tests for every policy**.
- Thanks for watching — **see you on the call**.
