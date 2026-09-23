# Issue #2: Follow-ups from the review of the initial PR: the decision document and the code changes

- **State:** open
- **URL:** https://github.com/vzakharov/goodspeed-knowledge-base/issues/2
- **Author:** @vzakharov (agent)
- **Created:** 2026-09-23T23:00:23Z
- **Updated:** 2026-09-23T23:18:12Z
- **Closed:** _not closed_
- **Labels:** _none_

---

## Body

The review of #1 ([review](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#pullrequestreview-5295088260)), taken out of that PR on purpose: the app is built and works, and #1 is already past a hundred commits and 240 files, so it lands as it is and this work continues from `main` in a new session. Every one of the review's 67 threads is linked below from the item it became; open the thread for the exact wording and the code it hangs off.

The work has two parts. **Part A** changes code. **Part B** is one new document.

## Part A — Code changes

### Errors

- **Typed errors, no message strings at the throw site.** Replace the `ConfigError` thrown on an embedding-dimension mismatch with a subclass whose constructor takes the two diverging dimensions and builds its own message. Then sweep the codebase: no thrown error takes a string literal as its parameter; each error's parameters are the facts specific to it. ([T02](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086081823))
- **No bare `Error`.** `conversations.service.ts` throws one when an exchange stores other than two messages; give it a class like the other error sites, or say why it is the exception. ([T16](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086406239))
- **One home for turning a caught error into an API response.** The SSE catch in `conversations.controller.ts` (log unless `AiProviderError`, then `toApiError`) and the other places that do the same should share one path. ([T15](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086391250))
- **The duplicated not-found builders**, such as `notFound` in `documents.service.ts`, get one home. ([T25](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086612013))

### Types

- **No `Pick`.** Define the narrower type and extend it. The exception is a type derived from the database, and only when no narrower schema can be defined first and extended. Sweep for every one, not only those marked: the review stopped marking them after [`models.ts`](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086145647) and [`thread.tsx`](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087804583). `Turn = Pick<Tables<'messages'>, …>` in `prompt.ts` may be that exception. Decide it once the sweep reaches it ([T17](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086459799)).
- **`recordChat`'s `promptTokens`/`completionTokens`** reuse the type they have in `usage` (plus `| undefined`), and settle when `usage` is `null` and whether its absence should be stricter. ([T14](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086360775))
- **`database.types.ts` is not hand-written.** `pnpm --filter api db:types` generates it with `supabase gen types`, which is the "hard reason" [T23](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086583720) asks about. So it stays as generated. The document explains its shape (Part B, [T24](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086601033)).

### Naming

- `AnswerService.standalone`, which rewrites a follow-up into a self-contained search query, gets a better name. ([T13](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086343285))
- `usage/ui/kind.tsx` and the symbols around it become `usage-kind` / `UsageKind…`: `kind` alone is too broad, even internally. ([T50](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087888654))

### UI

- **The home route.** With no documents, `/` is the documents page; with some, the chat. The model overview becomes a supplementary page of its own. ([T47](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087866905))
- **Header section links** are underlined on hover only, not always. ([T60](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088003266))

### Tooling and repo

- **`pnpm bootstrap` asks for the two required API keys** in its prompts. Each prompt can be skipped, for an operator without the key to hand or on a non-OpenAI provider. ([T62](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088022931))
- **The API's boundaries config moves out of `eslint.config.ts`** into a module of its own. ([T67](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088096378))
- **`scripts/type-overlap-check.README.md`** loses the adoption archaeology. ([T63](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088028646))
- **The comment above the Mantine aggregate import in `theme-provider.tsx`** reads as a polar bear, a mention that only denies what was removed. Check it and fix it. ([T34](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087691129))
- **The cost ledger:** a few session files under `.claude/costs/sessions/` carry `"name": null`; give them names. ([T01](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4085862956))

### Retrieval threshold

- **A proof-of-threshold script for `MIN_SIMILARITY`**, now `0.25`, where the reviewer's experience says anything below `0.6` is noise. Build a synthetic dataset where it is known which texts are close and which are not, and embed it with the configured model. Compute similarity for every pair. Then assess the distribution and pick the threshold by judgment rather than by code, and record the reasoning in the document. ([T11](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086293565))

## Part B — The decision document

One new file in the repo that explains the codebase's trickier parts and its choices to Goodspeed. Its name is open; "decision doc" is the working one ([T07](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086186880)). Write it **/plainly**, for a bystander. It must not show which points the author already understood and which they asked about to learn: some are there because the part deserves a word, some because the author did not yet know how it works, and the document reads the same either way. It is not hidden: the author will use it in the call with Goodspeed, and an explanation/decision document is worth having for its own sake ([T06](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086170042)). Questions the review asks and later answers itself stay in, because they mark where a reader stops ([T43](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087812359)).

### 1. Bird's-eye view — first

- A mermaid diagram of every module and how they relate, across `apps/api`, `apps/web` and the shared packages. ([T03](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086117292))

### 2. Choices and their alternatives

Each gives the pros and cons, and the migration path where one applies.

- **NestJS and a separate backend, and a monorepo at all,** against FSD plus Next.js's BFF, as in `playgramai/playgramapp`. The brief fixed NestJS, which does not say why it is the better fit. The author wants the tradeoff understood, for themselves first. ([T04](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086134746))
- **A single `src/` re-exported shallowly into each app**, as `vzakharov/vovazakharov.com` does with `apps/`, against the `@kb/contracts` package. Look briefly, not deeply, at whether Nest or Next (or both) would even allow imports from outside the app. ([T19](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086485128))
- **`node:test` against vitest.** Vitest scales better (sharding and the rest), but this is a PoC and works, so it stays. Give the tradeoffs and the path over if the app ever had to scale. ([T07](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086186880))
- **A static export for the web app:** is it inherited from the vovazakharov.com spin-off, or sound for this purpose? ([T36](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087740340))
- **The hand-drawn SVG chart**, against the libraries it could have used. Use it to illustrate a wider point: letting an agent write a makeshift part (another is the XLS parser in the playgram app) is often right while the blast radius stays small, and the risk is that the radius grows as "just that small thing" gathers features. ([T52](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087905843))
- **`useSyncExternalStore` for the session**, against Zustand. ([T38](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087760018))
- **`@tanstack/react-query`:** what it is and why it is here. ([T56](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087971711))
- **The type-overlap check:** how to explain its value using this codebase's own cases. ([T06](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086170042))

### 3. How it works

- **Providers:** every provider the brief offers speaks the OpenAI API, and there are no per-API adapters. A preset gives a base URL and flags. ([T08](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086219652)) Show how `CHAT_*` / `EMBEDDING_*` env vars reach a preset, and what a provider that serves no embeddings does when named as the embedding one. ([T09](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086248680))
- **The auth guard's request type:** how the request is known to match `ReaderRequest` when nothing parses it. ([T10](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086259250))
- **Condensing:** the rewrite of a follow-up into a standalone query before retrieval. ([T12](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086327216))
- **When `usage` is `null`**, and what the app does about it. ([T14](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086360775))
- **Supabase:** served locally, with no cloud project. ([T20](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086552450)) The gist of `supabase/config.toml`, and how RLS is set up and enforced here. ([T65](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088054576))
- **The database "functions":** what they are, who calls them and where they run. ([T21](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086570213))
- **Migrations going forward.** ([T22](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086572388))
- **The generated `database.types.ts`:** why its lower half (the `Tables` / `TablesInsert` helpers and the rest) is as large as it is. It is codegen, not an agent fighting the compiler. ([T24](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086601033))
- **Tests beside the code and tests under `test/`:** the conceptual difference. ([T30](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086724876))
- **`.swcrc` and `register.js`:** what they are for. ([T31](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087650776), [T32](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087657839))
- **The typographic quotes around `{title}`** in the confirm dialogs: plain JSX text around an expression, nothing from Mantine. ([T43](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087812359))
- **The embedding notice:** which document it shows for, and on what criteria. ([T45](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087851339))
- **Asking in one conversation, switching to another, asking there and coming back.** What happens, and if it is rough, the direction to improve it. ([T40](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087787734))
- **`packages/contracts`,** with `conversations.ts` as the example. ([T61](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088014024)) What `@kb/contracts: workspace:*` in the web app's `package.json` is and how the apps use it. ([T58](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087988256)) Whether the web app's schemas are the backend's own. ([T35](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087708487))
- **Turborepo.** ([T64](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088037747))
- **The ESLint boundaries setup**, with the `WORKSPACE_PACKAGE` element type as the case in point. ([T66](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4088090672))
- **The custom `vova/*` rules.** ([T59](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087995296))
- **The chart's SVG path code:** a short primer on the low-level parts. ([T51](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087903076))

### 4. House style and what the process produced

- **`{...{ asking }}` rather than `asking={asking}`**, a signature of the author's codebases: it saves tokens and it saves eyes. ([T41](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087794659))
- **`withSearchParam`** as the example of what `/polish` (its `/dry` pass) produced between the plan's chunks: a helper where an agent without it would have repeated the same code. Confirm it came from a polish run, going by the `polish:` commits; if it did not, find another example. ([T39](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087780947))
- **The sparse UX copy**, such as the delete confirmations. Trace it to a polish run if one produced it. ([T44](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087831671))
- **The `@media print` rules** dropped from `card.module.scss` in the spin-off, with no comment left saying "we print nothing". Confirm it across the `polish:` commits, then note it as a polar bear avoided. ([T55](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087960693))
- **Small, self-contained component modules**, helped by FSD's `ui/` per slice. A grab-bag `components/` folder would tempt an agent to grow components rather than crowd the folder. Say that this is a hunch from working with agents, not a measured result. ([T53](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087925919))
- **SCSS tokens generated from one source**, so they cannot drift. ([T57](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087985530))

### 5. Tradeoffs

The shortcuts this PoC took knowingly, each with what a real app would do. The author asked for this list as a section of its own ([T33](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087683355)). The philosophy to state first: a PoC is a snapshot by definition, so the first things cut are the ones that matter most for scale and for avoiding drift ([T35](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087708487)). Say too that the codebase is rigorous by PoC standards, and that a real one would go deeper ([T25](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086612013)).

- **Route handling** is rudimentary and somewhat hacky, as `isCurrent` shows. ([T33](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087683355))
- **Some duplication was left** for time. ([T25](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086612013))
- **Bulk calls to providers** go one at a time. Balancing UX against 429s on large batches is hard in a real app, and this goes for any large volume sent to an external provider, not only re-embedding. ([T26](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086638855))
- **Chunking:** semantic chunking is the obvious next step, since chunking is the core of the app. Give a brief overview of the approaches that exist. ([T27](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086667718))
- **Query helpers** like `matches` from `playgramai/playgramapp` would come in as the code grows. ([T28](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086684820))
- **File size:** `app.e2e.test.ts` is close to the author's rule of thumb of 450 lines. A real app would have a check that no file outgrows what an agent can reliably read, so agents split files as they grow. ([T29](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086712365))
- **The answer prompt** is the most basic form. In a real app it is the part likely to need the most upkeep, catching how models misbehave. ([T18](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086471085))
- **The API client:** a real app would type the request path strictly or generate a client (`api.documents.post(…)`). A single Next.js app would get typed server actions for free. ([T37](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087752655))
- **Contract drift** between the web app and the API, where both sides are our own code, depending on what the schema question in §3 finds. ([T35](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087708487))
- **Strings are hardcoded in components.** A real app would use i18n from the start if it had to be multilingual, or a "pre-i18n" rule like `no-hardcoded-strings` in `playgramai/playgramapp`. ([T46](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087860792))
- **Sign-up and sign-in** are password only. A real app would weigh OAuth, magic links, OTPs and invitations, which are often overlooked as funnel blockers. ([T48](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087876786))
- **Prompt caching** is not used. It is a major cost saver. ([T49](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087884251))
- **Security audits** would need more rigour, and that is hard in itself: top-level agents often take an attempt to harden security for a disguised attempt to break it. ([T54](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087948341))
- **The list is not only what the review noticed.** The taking session launches a subagent to sweep the codebase for more tradeoffs, and the author vets what it finds before any goes in. ([T35](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087708487))

## Answered in the threads

A few questions got a short answer in their thread straight away, which the review allowed for this kind ([T08](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086219652)): [T08](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086219652), [T09](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086248680), [T12](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086327216), [T20](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086552450), [T23](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086583720), [T24](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086601033), [T30](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4086724876), [T31](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087650776), [T32](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087657839), [T43](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087812359), [T45](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1#discussion_r4087851339). Those answers are a start, not the document's text. Each still gets its entry above.

---

## Comments

- **C01** @vzakharov (human) — 2026-09-23T23:18:12Z — "When splitting, Part B should be the first issue (taken as a…" → [↓](#c01)

<a id="c01"></a>

### Comment by @vzakharov (human) on 2026-09-23T23:18:12Z

[https://github.com/vzakharov/goodspeed-knowledge-base/issues/2#issuecomment-5804544790](https://github.com/vzakharov/goodspeed-knowledge-base/issues/2#issuecomment-5804544790)

When splitting, Part B should be the first issue (taken as a whole and planned from there on)

Of the rest, split out the UI ones, with the bootstrap one riding along (because these will be the ones facing goodspeed right away).

The others, split as you think fit but don't make it too many; the goal is to show how we decompose tech debt into issues, not have a plethora of them.

---

## Timeline (status, references, and other events)

- **2026-09-23T23:03:30Z** @vzakharov cross-referenced this issue from [#1 feat: knowledge base — database, API, sign-in, documents, chat, usage](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1).
- **2026-09-23T23:14:47Z** @vzakharov renamed from «Follow-ups from the review of #1: the decision document and the code changes» to «Follow-ups from the review of the initial PR: the decision document and the code changes».
