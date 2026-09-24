# PR #3: docs: carve #2 and plan the decision document

- **State:** open
- **URL:** https://github.com/vzakharov/goodspeed-knowledge-base/pull/3
- **Author:** @vzakharov (agent)
- **Base ← Head:** main ← claude/decision-doc-1lmvss
- **Draft:** yes
- **Merged:** _not merged_
- **Created:** 2026-09-23T23:23:46Z
- **Updated:** 2026-09-24T00:07:09Z
- **Closed:** _not closed_
- **Labels:** _none_

---

## Body

## Summary

- **Carves #2 into five children, in the order the operator's comment on #2 sets:** the decision document whole; the home route, header links and bootstrap key prompts; errors, types and names; tooling hygiene; a measured `MIN_SIMILARITY`. #2 stays open as their parent. `/go` files the children on the go-ahead, and this PR closes the first.
- **Specs the first child: `docs/design-notes.md`**, the document Part B of #2 asks for. It covers where the document lives, the rule that it links to the README's architecture sections rather than restating them (the brief requires those to stay in the README), how it is written (/plainly, neutral about which points the author knew), and its five sections in #2's order.
- **Settles three of #2's "trace it to a polish run" items now.** `withSearchParam` did come from one (a6caddb). The sparse delete copy (45aef6f) and the dropped `@media print` rules (6dad133) did not, and the plan says how each entry is attributed instead.
- **Carries the codebase sweep #2 asks for:** twelve tradeoff candidates the review did not list, each with a keep or drop recommendation, for the operator to vet. One of them, a stopped answer's tokens never being recorded, is a bug, and the plan routes it to child 3 rather than the document.

## QA Checklist

- [ ] `carve` — The five children in the plan's "Issues this plan proposes" match the split the operator's comment on #2 asks for, with each item of Part A landing in exactly one of them
- [ ] `sweep` — Each of S1–S12 in the plan is either kept or struck, and each recommendation reads as right
- [ ] `readme-overlap` — Every entry the document will link to `README.md` for, rather than restate, has a README paragraph that actually covers it
- [ ] `traces` — a6caddb, 45aef6f, b7cad84 and 6dad133 say what the plan says they do (`git show <sha>` on `origin/claude/knowledge-base-f6yidh`)

| Item             | Automatable | Covered? | Notes                                               |
| ---------------- | ----------- | -------- | --------------------------------------------------- |
| `carve`          | manual-only | —        | Judgment on scope, which only the operator can make |
| `sweep`          | manual-only | —        | The vetting #2 reserves for the author              |
| `readme-overlap` | manual-only | —        | Prose coverage, read side by side                   |
| `traces`         | manual-only | —        | Reading commit history against the plan's claims    |

Closes #<tbd>

---

## Comments

- **C01** @vzakharov (agent) — 2026-09-23T23:24:05Z — "Proposed squash title/body: ``` docs: design notes on how th…" → [↓](#c01)

<a id="c01"></a>

### Comment by @vzakharov (agent) on 2026-09-23T23:24:05Z

[https://github.com/vzakharov/goodspeed-knowledge-base/pull/3#issuecomment-5804605391](https://github.com/vzakharov/goodspeed-knowledge-base/pull/3#issuecomment-5804605391)

Proposed squash title/body:

```
docs: design notes on how the knowledge base works, and why (pr #3)
```

```
The review of #1 asked for one document that explains the codebase's
trickier parts and its choices to a reader who was not there, and for
the code changes it raised to be carved into issues under #2. This is
the document, the first of those issues.

docs/design-notes.md opens with a diagram of every module across the
API, the web app and @kb/contracts. Then come the choices, each against
its alternatives with a migration path where one applies (NestJS beside
Next.js, the contracts package, node:test, the static export, the
hand-drawn chart, the session store, TanStack Query, the type-overlap
check), and how the trickier parts work, from provider presets and the
auth guard to RLS, migrations and the generated database types.

It closes on the house style the process produced and on the shortcuts
the PoC took knowingly, each with what a real app would do. That list
includes those a sweep of the codebase found beyond the review's. The
README keeps its architecture sections and points here; entries it
already covers link to it rather than restating it.

Co-authored-by: Claude <noreply@anthropic.com>
```

---

## Review threads

- **T01** `docs/plans/decision-doc.draft.do-not-implement.md`:38 — unresolved — last: @vzakharov (human) 2026-09-23T23:29:55Z — "to be clear, the document itself should contain no mentions…" → [↓](#t01)
- **T02** `docs/plans/decision-doc.draft.do-not-implement.md`:37 — unresolved — last: @vzakharov (human) 2026-09-23T23:30:55Z — "reads kind of ambiguously, but yes, I want them included too…" → [↓](#t02)
- **T03** `docs/plans/decision-doc.draft.do-not-implement.md`:47 — unresolved — last: @vzakharov (human) 2026-09-23T23:54:54Z — "I'd say that the last one, "The type-overlap check", does no…" → [↓](#t03)
- **T04** `docs/plans/decision-doc.draft.do-not-implement.md`:48 — unresolved — last: @vzakharov (human) 2026-09-23T23:57:26Z — "minus the embedding notice (was being silly too) vova/ lint…" → [↓](#t04)
- **T05** `docs/plans/decision-doc.draft.do-not-implement.md`:51 — unresolved — last: @vzakharov (human) 2026-09-23T23:59:22Z — "then let's try and programmatically find (maybe via a subage…" → [↓](#t05)
- **T06** `docs/plans/decision-doc.draft.do-not-implement.md`:52 — unresolved — last: @vzakharov (human) 2026-09-23T23:59:54Z — "ok ditch that then" → [↓](#t06)
- **T07** `docs/plans/decision-doc.draft.do-not-implement.md`:66 — unresolved — last: @vzakharov (human) 2026-09-24T00:04:07Z — "btw, reminded: how would a local Ollama technically work? Wo…" → [↓](#t07)
- **T08** `docs/plans/decision-doc.draft.do-not-implement.md`:72 — unresolved — last: @vzakharov (human) 2026-09-24T00:05:39Z — "Oh yeah, have a look (via shimmed gh) and describe the sophi…" → [↓](#t08)
- **T09** `docs/plans/decision-doc.draft.do-not-implement.md`:117 — unresolved — last: @vzakharov (human) 2026-09-24T00:07:04Z — "all as recommended except for 3, which is commented on above" → [↓](#t09)

<a id="t01"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:38 — unresolved

```diff
@@ -0,0 +1,117 @@
… 34 lines elided …
+- **/plainly, for a bystander.** Load `.claude/skills/plainly/SKILL.md` before drafting, and run its pass over each section before committing it: cause first, the reader's nouns, a chain rather than …
+- **Neutral about who knew what.** Each entry is a topic heading and its explanation. Nothing says "the reviewer asked" or "for the record", and no entry is written as a correction. An entry the auth…
+- **Questions the review asked and answered itself stay in** (T43): the typographic quotes, the SWC files, the tests' two homes. They are where a reader stops.
+- **The thread replies are a start, not the text.** The eleven questions answered in their threads get an entry built from the code, with the reply as a starting point.
```

**@vzakharov (human)** — 2026-09-23T23:29:55Z

to be clear, the document itself should contain no mentions of the threads; it should read as a self-sufficient, standalone doc

---

<a id="t02"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:37 — unresolved

```diff
@@ -0,0 +1,117 @@
… 33 lines elided …
+
+- **/plainly, for a bystander.** Load `.claude/skills/plainly/SKILL.md` before drafting, and run its pass over each section before committing it: cause first, the reader's nouns, a chain rather than …
+- **Neutral about who knew what.** Each entry is a topic heading and its explanation. Nothing says "the reviewer asked" or "for the record", and no entry is written as a correction. An entry the auth…
+- **Questions the review asked and answered itself stay in** (T43): the typographic quotes, the SWC files, the tests' two homes. They are where a reader stops.
```

**@vzakharov (human)** — 2026-09-23T23:30:55Z

reads kind of ambiguously, but yes, I want them included too (not the typographic quotes though, it was just me being dumb lol)

---

<a id="t03"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:47 — unresolved

```diff
@@ -0,0 +1,117 @@
… 43 lines elided …
+A short opening (what the document is, who it is for, how to read it) and a contents list, then the issue's five sections in its order, one entry per bullet. Section 1 comes first because everything …
+
+1. **Bird's-eye view.** One mermaid diagram of every module and how they relate: the API's modules (`config`, `http`, `database`, `auth`, `documents`, `ingestion`, `chat`, `usage`, `ai`), the web app…
+2. **Choices and their alternatives**, the eight entries #2 lists, each with pros, cons, and the migration path where one applies. The look at "would Nest or Next import from outside the app" (T19) is a quick check of what each build allows (Next's `transpilePackages` / `externalDir`, Nest's compiler `rootDir`), not a spike.
```

**@vzakharov (human)** — 2026-09-23T23:54:54Z

I'd say that the last one, "The type-overlap check", does not belong to "choices and alternatives" -- more like house style

---

<a id="t04"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:48 — unresolved

```diff
@@ -0,0 +1,117 @@
… 44 lines elided …
+
+1. **Bird's-eye view.** One mermaid diagram of every module and how they relate: the API's modules (`config`, `http`, `database`, `auth`, `documents`, `ingestion`, `chat`, `usage`, `ai`), the web app…
+2. **Choices and their alternatives**, the eight entries #2 lists, each with pros, cons, and the migration path where one applies. The look at "would Nest or Next import from outside the app" (T19) i…
+3. **How it works**, the eighteen entries #2 lists. The one on the conversation switch (T40) is traced through the code, and is reproduced in the app if the code leaves it unclear (`/preview` for the web app, the local stack for the API).
```

**@vzakharov (human)** — 2026-09-23T23:57:26Z

minus the embedding notice (was being silly too)

vova/ lint rules are house style (the `asking` example being an illustration of one of them)

also see how the sections should be reordered/structured -- e.g. having Turborepo in the end of it makes no sense. No need to include the specific order in the plan, but the implementing agent should be aware that reordering is welcome (same for the other sections)

---

<a id="t05"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:51 — unresolved

```diff
@@ -0,0 +1,117 @@
… 47 lines elided …
+3. **How it works**, the eighteen entries #2 lists. The one on the conversation switch (T40) is traced through the code, and is reproduced in the app if the code leaves it unclear (`/preview` for the…
+4. **House style and what the process produced**, the six entries, with these traces already settled:
+   - **`withSearchParam` came from a polish run.** `a6caddb` "polish: one helper for a path carrying a search parameter" folded four hand-spelled copies (`documentsHref`, `documentHref`, `chatHref`, …
+   - **The sparse delete copy did not.** It was written as it stands in the feature commit (`45aef6f`). The polish run over those files (`b7cad84`) tightened the `ConfirmDelete` docstring, not the copy. The entry attributes the copy to the feature commit and the house voice, and uses `b7cad84` as the example of polish working on comments rather than UI text.
```

**@vzakharov (human)** — 2026-09-23T23:59:22Z

then let's try and programmatically find (maybe via a subagent) the biggest tightening of a docstring during polish as an example

---

<a id="t06"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:52 — unresolved

```diff
@@ -0,0 +1,117 @@
… 48 lines elided …
+4. **House style and what the process produced**, the six entries, with these traces already settled:
+   - **`withSearchParam` came from a polish run.** `a6caddb` "polish: one helper for a path carrying a search parameter" folded four hand-spelled copies (`documentsHref`, `documentHref`, `chatHref`, …
+   - **The sparse delete copy did not.** It was written as it stands in the feature commit (`45aef6f`). The polish run over those files (`b7cad84`) tightened the `ConfirmDelete` docstring, not the co…
+   - **The `@media print` rules were not dropped by a polish run either.** `6dad133` "refactor(web): settle the design system for an app behind sign-in" stripped the print medium: the blocks, the print-hidden classes, and the comments naming the caller's `print.scss`. It left nothing saying "we print nothing". The entry still stands as a polar bear avoided, attributed to that refactor.
```

**@vzakharov (human)** — 2026-09-23T23:59:54Z

ok ditch that then

---

<a id="t07"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:66 — unresolved

```diff
@@ -0,0 +1,117 @@
… 62 lines elided …
+| S2  | **Tokens from a stopped or failed answer are never recorded.** `recordChat` runs after the stream loop (`answer.service.ts`), so an abort or a provider failure mid-answer throws past it. The …
+| S3  | **Lists stop at 1,000 rows without saying so.** `supabase/config.toml` sets `max_rows = 1000`, and no list pages: documents, conversations, a conversation's messages, the re-embed backlog.   …
+| S4  | **A stuck ingestion is never recovered.** A process that dies mid-ingest leaves the document `pending`, and nothing finds it again unless the reader re-embeds.                                …
+| S5  | **The prompt has no token budget.** History is the last 8 messages, answers have no length cap, and 6 chunks of ~800 tokens go on top. Nothing counts the total, so a small-context model (Ollama's default) silently loses the overflow.                                                                                                                                                         | **Keep.** A real app fits history and sources to the configured model's context.                                                                                                                       |
```

**@vzakharov (human)** — 2026-09-24T00:04:07Z

btw, reminded: how would a local Ollama technically work? Would it be a local server started under `localhost:<N>` and entered as base url? let's clarify in "how it works" too

---

<a id="t08"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:72 — unresolved

```diff
@@ -0,0 +1,117 @@
… 68 lines elided …
+| S8  | **Sign-up and sign-out settings are the local defaults.** Six-character passwords, email confirmation off, and `signOut({ scope: 'local' })`, which leaves the refresh token live on the server…
+| S9  | **No UI tests.** The web app's tests cover helper modules only. There are no component or browser tests, and the end-to-end suite never exercises Stop, which the README promises does not stor…
+| S10 | **The stream has no heartbeat, backpressure or resume.** Nothing is sent while condensing and retrieval run before the first token, which proxies with idle timeouts may cut. `write`'s return …
+| S11 | **No observability.** Logging is Nest's `Logger` on 5xx and provider warnings. There are no request ids, metrics or tracing, and the health check touches neither the database nor the provider.                                                                                                                                                                                                  | **Keep**, short: the absence of any deployment makes it deliberate here.                                                                                                                               |
```

**@vzakharov (human)** — 2026-09-24T00:05:39Z

Oh yeah, have a look (via shimmed gh) and describe the sophisticated logging system we've built around `safeAction`s in playgramai/playgramapp, and the `/log-review` skill based on that

---

<a id="t09"></a>

### `docs/plans/decision-doc.draft.do-not-implement.md`:117 — unresolved

```diff
@@ -0,0 +1,117 @@
… 100 lines elided …
+
+Each has a recommendation, and the plan is written with it in force, so silence means the recommendation stands.
+
+1. **The document's name.**
+   a. `docs/design-notes.md`, "Design notes: how the knowledge base works, and why" _(recommended: it covers the explanations as well as the decisions)_
+   b. `docs/decisions.md`, the working name
+   c. `docs/how-it-works.md`
+2. **How many children after this one.**
+   a. Four, as above: UI and bootstrap; errors, types and names; tooling and hygiene; the threshold _(recommended: each is one area a reviewer can hold in their head)_
+   b. Three: fold tooling and hygiene into errors, types and names. Fewer issues, but one PR spanning the API's code and the repo's tooling.
+3. **The sparse delete copy (T44) did not come from a polish run.**
+   a. Keep the entry, attributed to the feature commit and the house voice, and use `b7cad84` to show polish working on comments _(recommended)_
+   b. Drop the "from a polish run" framing and fold the copy into the component-size entry as house style
+4. **The sweep's candidates.** Keep the recommended ones as marked above, or strike any by number (S1…S12).
+5. **S2, the unrecorded tokens of a stopped answer.**
+   a. Fix it in child 3, beside the `recordChat` work already there _(recommended: it is a bug against the README's own claim, and the function is open anyway)_
+   b. List it as a tradeoff in the document and leave the code
```

**@vzakharov (human)** — 2026-09-24T00:07:04Z

all as recommended except for 3, which is commented on above

---

## Timeline (status, references, and other events)

- **2026-09-24T00:07:09Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/3#pullrequestreview-5297946991.
