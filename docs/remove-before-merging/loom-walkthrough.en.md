# Loom walkthrough — script

Target: about 4:30 of the 5:00 the brief allows. Timings are cumulative and
assume about 140 words a minute, plus the pauses the screen needs.

**Before recording:** the database already holds a few documents; the PDF to
upload is at hand; `CHAT_API_KEY` and `EMBEDDING_API_KEY` in `apps/api/.env`
are blanked (so `pnpm bootstrap` asks for them), with the key copied and
checked; the editor is open on the repo root with its folders collapsed.

## 0:00 — Intro

_On screen: the app, open on Chat._

> Hi, I'm Vova, and this is my knowledge base for the Goodspeed assessment:
> you keep documents, and a chat answers questions from them. Everything runs
> locally — a Turborepo monorepo with a Next.js front end, a NestJS API, and
> Supabase in Docker, where row-level security keeps each user to their own
> data.

## 0:20 — Documents

_On screen: Documents → New document → drop the PDF → save → the badge turns
Searchable._

> It opens on the chat because I already have documents; with none, it would
> open here, on Documents, waiting for the first one. A document is typed in
> markdown or read from a file, and a PDF is parsed right in the browser — the
> server only ever receives text, so there is no file to store or clean up.
>
> Saving splits the text into chunks of about eight hundred tokens along its
> markdown structure — a major heading always starts a new chunk, and a
> section that runs across two chunks overlaps a little at the seam — and
> embeds them. A few seconds, and it's searchable.

## 1:00 — Chat

_On screen: Chat → new conversation → type the question, so it can be read._

> The document I just added argues that coding agents are better driven from
> the web than from a terminal — an opinion, not something the model knows. So
> I ask an open question on purpose: if the answer takes that side and cites
> the document, it came from my documents, not from general knowledge.

_While the answer streams:_

> It streams — one of the stretch goals. Behind it: the question is embedded
> with the same model as the documents, the closest chunks are retrieved by
> vector similarity, and they go into the prompt, numbered, for the model to
> answer from and cite.

_Once it has finished: click a citation._

> And it's pulled in points from other documents too, not only the one I just
> uploaded. Each citation opens the document it came from, and conversations
> stay in the sidebar across sessions — another stretch goal.
>
> The design is rudimentary: the brief asks for usable, not beautiful, and I
> lean ascetic anyway. It's also where I cut corners on purpose — bolder
> bubbles, links without underlines: the kind of fix that looks like ten
> minutes and rarely is.

## 2:10 — Usage

_On screen: Usage._

> Usage counts tokens per model per day. The chart is hand-rolled, with no
> chart library: for a single chart, a dependency would weigh more than the
> code it saves. If charts multiplied, I'd bring one in. How the code itself
> was written is what the second video is about.

## 2:35 — Models

_On screen: Models._

> Models shows what the API is configured with. Chat and embeddings are set up
> separately, each with its own provider, model, key and base URL, since not
> every provider serves both. So any service that speaks the OpenAI API —
> OpenAI, Groq, OpenRouter, a local Ollama — is a change to the environment,
> not to the code. This page is also where bring-your-own-key would go.

## 3:05 — Setup

_On screen: the terminal; stop `pnpm dev`, run `pnpm bootstrap`, paste the key,
Enter at the second prompt; `pnpm dev`; back in the browser, ask “What is the
precedent fallacy?”_

> Which brings me to setup. Whoever clones the repo runs one command,
> `pnpm bootstrap`. It installs the dependencies, starts Supabase in Docker,
> applies the migrations, and writes both apps' `.env` files. All it asks for
> is the two keys — here one OpenAI key for chat and embeddings, so Enter at
> the second prompt reuses the first.
>
> Then `pnpm dev`, and we're back. Another one from my documents — and there's
> the answer.

## 3:55 — Outro

_On screen: the editor; expand `apps/web`, `apps/api`, `packages/contracts`
and `supabase` one by one as each is named._

> The architecture I'd rather go through on our call, but in short: `apps/web`
> is the Next.js app, a static export laid out in Feature-Sliced Design.
> `apps/api` is NestJS, and owns everything server-side — auth, embeddings,
> model calls. `packages/contracts` holds a Zod schema for every request and
> response, and both apps infer their types from it. And `supabase` holds the
> migrations, with pgTAP tests for every policy.
>
> Thanks for watching — see you on the call.
