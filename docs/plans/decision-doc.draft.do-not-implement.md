> ⛔ **DRAFT — DO NOT IMPLEMENT.** This plan is not approved. Do not edit source while this file is named `*.draft.do-not-implement.md` — prep and spikes go in `tmp/`. On an explicit operator go-ahead, `git mv` it to `*.in-progress.md` and delete this banner (quoting the go-ahead in the commit) _before_ touching code.

# #2, carved: the decision document first, then the code changes

#2 collects the review of #1 into two parts: code changes (Part A) and one new document (Part B). The operator's comment on #2 settles the carve's shape: Part B is the first issue, taken whole; the UI items go together, with the bootstrap item riding along; the rest splits into only as many issues as show how the debt decomposes.

This plan specs **child 1, the document**. The other children are parked coarsely below.

## Issues this plan proposes

The only open issue is #2 itself, so no slice is already tracked. #2 stays open as the parent, and every slice is a child of it, natively linked. This PR closes child 1 (`Closes #<tbd>` until `/go` files it).

1. **Design notes: how the knowledge base works, and why** — _this plan._ Part B of #2, whole: the bird's-eye diagram, the choices and their alternatives, how the trickier parts work, the house style, and the tradeoffs.
2. **What a reviewer meets first: the home route, the header links, and the bootstrap's key prompts** — `/` is the documents page with no documents and the chat with some, the model overview moves to a page of its own, header section links underline on hover only, and `pnpm bootstrap` asks for the two API keys, each prompt skippable (T47, T60, T62).
3. **Errors, types and names hold one shape each** — typed error subclasses built from their facts (starting with the embedding-dimension mismatch) and a sweep so no throw passes a string literal, a class for the bare `Error` in `conversations.service.ts`, one path from a caught error to an API response, one not-found builder, the `Pick` sweep (deciding `Turn` in `prompt.ts`), `recordChat`'s token types reusing `usage`'s, and its call moved so a stopped or failed answer's tokens are recorded too (sweep finding S2 below), `AnswerService.standalone` renamed, `usage/ui/kind.tsx` → `usage-kind` (T02, T16, T15, T25, T17, T14, T13, T50). `database.types.ts` stays as generated (T23), so nothing to do there.
4. **Tooling and repo hygiene** — the API's boundaries config out of `eslint.config.ts` into its own module, the adoption archaeology cut from `scripts/type-overlap-check.README.md`, the polar bear above the Mantine aggregate import in `theme-provider.tsx`, names for the cost-ledger sessions that carry `"name": null` (T67, T63, T34, T01).
5. **A measured `MIN_SIMILARITY`** — a synthetic dataset with known close and far pairs, embedded with the configured model, every pair's similarity computed, the threshold picked by judgment from the distribution, and the reasoning recorded in the document and in the README's retrieval paragraph (T11). Its own child because it needs a live embedding key and the outcome is unknown until the numbers are in.

Children 2–5 each state, in their body, that a change they make to something the document describes updates the document in the same PR (CLAUDE.md § "Writing things down": every place that states a convention changes with it). 3 and 5 are the two that certainly will: 3 renames `standalone` and may change what a `null` `usage` records; 5 replaces the threshold's reasoning.

## Child 1 — the document

### Name and place

`docs/design-notes.md`, titled **"Design notes: how the knowledge base works, and why"**. It holds decisions _and_ explanations of how things work, and "decisions" names only the first. The issue opens the name, and asks for the file itself, which answers CLAUDE.md's "ask before a new top-level doc".

### What it does not repeat

The brief requires the README to carry the architecture decisions and the "more time" list, and it does: `README.md` § "Architecture decisions" already covers the contract package, RLS, the schema, chunking, in-request ingestion, retrieval, streaming, the AI layer, the static export, the API's modules and root-level lint. It also has § "Swapping AI providers" and § "What I would do with more time".

So where an entry has a README counterpart, the document **links to that README section and adds what it leaves out**: the alternatives, the pros and cons, the migration path, the mechanism. It does not restate the README's paragraph. The README gains one line pointing at the document, under § "Architecture decisions". Nothing moves out of the README, because the brief is what puts it there.

### How it is written

- **/plainly, for a bystander.** Load `.claude/skills/plainly/SKILL.md` before drafting, and run its pass over each section before committing it: cause first, the reader's nouns, a chain rather than a list. Each entry opens with its answer.
- **Neutral about who knew what.** Each entry is a topic heading and its explanation. Nothing says "the reviewer asked" or "for the record", and no entry is written as a correction. An entry the author understood and one they asked about to learn read the same.
- **Questions the review asked and answered itself stay in** (T43): the typographic quotes, the SWC files, the tests' two homes. They are where a reader stops.
- **The thread replies are a start, not the text.** The eleven questions answered in their threads get an entry built from the code, with the reply as a starting point.
- **Code is cited as `path:line` links**, relative to the repo, so the document can be read with the code beside it.
- **Where the history is the answer, it says so plainly.** The static export came in with the frontend foundation the spin-off carried over (`31586b1`). The entry says so, then asks whether it holds up for this app on its own merits.

### Structure

A short opening (what the document is, who it is for, how to read it) and a contents list, then the issue's five sections in its order, one entry per bullet. Section 1 comes first because everything after it names modules.

1. **Bird's-eye view.** One mermaid diagram of every module and how they relate: the API's modules (`config`, `http`, `database`, `auth`, `documents`, `ingestion`, `chat`, `usage`, `ai`), the web app's FSD slices by layer, `@kb/contracts`, and the three things outside the code (Postgres, Supabase Auth, the model provider), with edges for imports and for calls over the wire. If one diagram passes ~35 nodes and stops being readable, it becomes an overview plus one diagram per app. Below it, a paragraph walking one request through it: a question asked in the chat.
2. **Choices and their alternatives**, the eight entries #2 lists, each with pros, cons, and the migration path where one applies. The look at "would Nest or Next import from outside the app" (T19) is a quick check of what each build allows (Next's `transpilePackages` / `externalDir`, Nest's compiler `rootDir`), not a spike.
3. **How it works**, the eighteen entries #2 lists. The one on the conversation switch (T40) is traced through the code, and is reproduced in the app if the code leaves it unclear (`/preview` for the web app, the local stack for the API).
4. **House style and what the process produced**, the six entries, with these traces already settled:
   - **`withSearchParam` came from a polish run.** `a6caddb` "polish: one helper for a path carrying a search parameter" folded four hand-spelled copies (`documentsHref`, `documentHref`, `chatHref`, the documents list query) into it. That is the example.
   - **The sparse delete copy did not.** It was written as it stands in the feature commit (`45aef6f`). The polish run over those files (`b7cad84`) tightened the `ConfirmDelete` docstring, not the copy. The entry attributes the copy to the feature commit and the house voice, and uses `b7cad84` as the example of polish working on comments rather than UI text.
   - **The `@media print` rules were not dropped by a polish run either.** `6dad133` "refactor(web): settle the design system for an app behind sign-in" stripped the print medium: the blocks, the print-hidden classes, and the comments naming the caller's `print.scss`. It left nothing saying "we print nothing". The entry still stands as a polar bear avoided, attributed to that refactor.
   - The component-size point is labelled a hunch from working with agents, not a measured result, as #2 asks.
5. **Tradeoffs.** The philosophy first: a PoC is a snapshot, so the first things it cuts are the ones that matter most for scale and against drift. Then that the codebase is rigorous by PoC standards, and a real one would go deeper. Then #2's thirteen entries, then whichever of the sweep's candidates below the operator keeps. Where README § "What I would do with more time" already names an item (background ingestion, measured retrieval, deployment and CI, limits), the entry links to it and adds only the tradeoff reasoning.

### Tradeoffs the review did not list: candidates to vet

_The subagent sweep #2 asks for has run over the whole tree. Its findings are below, each with the code it rests on and a recommendation. **The operator vets this list; none goes into the document without a keep.** Recommended keeps are written in; strike any to drop it. The central claims were re-checked against the code while planning. The sweep's line numbers were not reliable, so the writing session re-cites each from the code._

| #   | Candidate                                                                                                                                                                                                                                                                                                                                                                                         | Recommendation                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | **Server-owned fields can be written straight to the database.** The browser holds the publishable key and the user's token, and each policy checks only `user_id = auth.uid()`. So a user can call the database API directly to mark their own document `ready`, insert assistant messages with made-up citations, or insert chunks or usage rows, bypassing the API and any limit it would add. | **Keep**, as its own entry. It is the cost of "no service-role key anywhere", a choice the README presents as a strength. A real app has the API write server-owned state, or grants columns per role. |
| S2  | **Tokens from a stopped or failed answer are never recorded.** `recordChat` runs after the stream loop (`answer.service.ts`), so an abort or a provider failure mid-answer throws past it. The provider bills tokens the usage page never shows, which contradicts the README's "every model call".                                                                                               | **Not a tradeoff: a bug.** Fixed in child 3, beside `recordChat`'s token types (T14), which already reopens that function. The document gets no entry for it.                                          |
| S3  | **Lists stop at 1,000 rows without saying so.** `supabase/config.toml` sets `max_rows = 1000`, and no list pages: documents, conversations, a conversation's messages, the re-embed backlog.                                                                                                                                                                                                      | **Keep**, stating the silent truncation plainly. A real app pages every list with a cursor, and works through the re-embed backlog in batches.                                                         |
| S4  | **A stuck ingestion is never recovered.** A process that dies mid-ingest leaves the document `pending`, and nothing finds it again unless the reader re-embeds.                                                                                                                                                                                                                                   | **Keep**, inside the bulk-calls entry (T26) beside README's "background ingestion": a lease with an expiry and a sweeper.                                                                              |
| S5  | **The prompt has no token budget.** History is the last 8 messages, answers have no length cap, and 6 chunks of ~800 tokens go on top. Nothing counts the total, so a small-context model (Ollama's default) silently loses the overflow.                                                                                                                                                         | **Keep.** A real app fits history and sources to the configured model's context.                                                                                                                       |
| S6  | **Two tabs overwrite each other.** A document save carries no version, so the later one wins, and two questions sent at once in one conversation read the same history and interleave.                                                                                                                                                                                                            | **Keep.** A real app rejects a stale save (409) and allows one answer in flight per conversation. It pairs with the conversation-switch entry (T40).                                                   |
| S7  | **Sources go into the `system` message** (`prompt.ts`), so a document's text is read with instruction-level authority.                                                                                                                                                                                                                                                                            | **Keep**, inside the answer-prompt entry (T18): harmless while a reader owns every document, prompt injection once sharing or upload lands.                                                            |
| S8  | **Sign-up and sign-out settings are the local defaults.** Six-character passwords, email confirmation off, and `signOut({ scope: 'local' })`, which leaves the refresh token live on the server and the access token valid for its hour.                                                                                                                                                          | **Keep**, inside the sign-up entry (T48).                                                                                                                                                              |
| S9  | **No UI tests.** The web app's tests cover helper modules only. There are no component or browser tests, and the end-to-end suite never exercises Stop, which the README promises does not store the answer.                                                                                                                                                                                      | **Keep.** A real app has a Playwright smoke test over sign-up, a document, a chat and Stop.                                                                                                            |
| S10 | **The stream has no heartbeat, backpressure or resume.** Nothing is sent while condensing and retrieval run before the first token, which proxies with idle timeouts may cut. `write`'s return value is ignored, and a dropped stream cannot be resumed.                                                                                                                                          | **Keep**, short, with the streaming facts under the conversation-switch entry (T40).                                                                                                                   |
| S11 | **No observability.** Logging is Nest's `Logger` on 5xx and provider warnings. There are no request ids, metrics or tracing, and the health check touches neither the database nor the provider.                                                                                                                                                                                                  | **Keep**, short: the absence of any deployment makes it deliberate here.                                                                                                                               |
| S12 | **The streaming answer is not announced to screen readers.** It has no `aria-live` region.                                                                                                                                                                                                                                                                                                        | **Keep**, short, beside the hardcoded-strings entry (T46), as accessibility.                                                                                                                           |

The sweep also weighed and dropped two: the configured model name interpolated into a query filter (it comes from config, not users), and the provider's error text reaching the client (documented as deliberate).

### Sources the writing session reads

- `docs/issue/2/issue.md`, the item list.
- PR #1's review threads, for the exact wording and the code each hangs off: exported with `python3 scripts/export-github-item.py 1 --include-resolved` and committed as context (`docs/issue/1/`, swept by `/finalize` like the rest of `docs/issue/`).
- The `polish:` commits and the rest of #1's history, on `origin/claude/knowledge-base-f6yidh`.

## Steps

- [ ] Export PR #1's threads and commit the export as context.
- [ ] Write the opening, the contents list and §1, and check that the diagram renders (`@mermaid-js/mermaid-cli` under `tmp/`, against the pre-installed Chromium).
- [ ] Write §2, §3, §4 and §5, one commit per section, each after its /plainly pass.
- [ ] Add the README's pointer line.
- [ ] Check that every `path:line` link and README anchor in the document resolves.
- [ ] `pnpm format:check` over the new Markdown.
- [ ] Hand the PR to `/pr` (quality passes via `/go`).

## DRY notes

- **The README is the one home for what it already says.** The document's entries on the contracts, RLS, chunking, retrieval, streaming, the AI layer and the static export link to the README paragraph and add only alternatives, mechanism and migration. Restating them would give each decision two homes that drift apart the first time either is edited.
- **CLAUDE.md and `.claude/rules/` stay the agent-facing homes** of the conventions the document explains (vetting, Turborepo's environment, FSD, the type-overlap check). The document explains them to a person and links to the rule. It does not copy the rule's text, because the rule is written for an agent and changes with the tooling.
- **`scripts/type-overlap-check.README.md` stays the check's reference.** The document's entry is the case for the check's value, told through this codebase's own findings, and links to it for the mechanics.
- **No shared abstraction is in play.** This is one new prose file and one README line. The only reuse call is which home states what, settled above.

## Questions

Each has a recommendation, and the plan is written with it in force, so silence means the recommendation stands.

1. **The document's name.**
   a. `docs/design-notes.md`, "Design notes: how the knowledge base works, and why" _(recommended: it covers the explanations as well as the decisions)_
   b. `docs/decisions.md`, the working name
   c. `docs/how-it-works.md`
2. **How many children after this one.**
   a. Four, as above: UI and bootstrap; errors, types and names; tooling and hygiene; the threshold _(recommended: each is one area a reviewer can hold in their head)_
   b. Three: fold tooling and hygiene into errors, types and names. Fewer issues, but one PR spanning the API's code and the repo's tooling.
3. **The sparse delete copy (T44) did not come from a polish run.**
   a. Keep the entry, attributed to the feature commit and the house voice, and use `b7cad84` to show polish working on comments _(recommended)_
   b. Drop the "from a polish run" framing and fold the copy into the component-size entry as house style
4. **The sweep's candidates.** Keep the recommended ones as marked above, or strike any by number (S1…S12).
5. **S2, the unrecorded tokens of a stopped answer.**
   a. Fix it in child 3, beside the `recordChat` work already there _(recommended: it is a bug against the README's own claim, and the function is open anyway)_
   b. List it as a tradeoff in the document and leave the code
