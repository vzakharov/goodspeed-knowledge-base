# PR #18: docs: how it was built, and the AI-workflow Loom talking points

- **State:** open
- **URL:** https://github.com/vzakharov/goodspeed-knowledge-base/pull/18
- **Author:** @vzakharov (agent)
- **Base ← Head:** main ← claude/loom-ai-workflow-k6msbi
- **Draft:** yes
- **Merged:** _not merged_
- **Created:** 2026-09-24T12:06:56Z
- **Updated:** 2026-09-24T12:44:32Z
- **Closed:** _not closed_
- **Labels:** _none_

---

## Body

The second Loom the brief asks for, on how AI was used to build the project (≤ 5 min), prepared the way #15 prepared the first — and the written account it narrates.

- `docs/how-it-was-built.md` — how agents built the project: muthur as the loop, the shell `/spinoff` seeded and the guardrails `vet.sh` checks, one plan carried across bounded sessions by its file, the human review that became #2, one feature from a single prompt (#12), where the human decided (#13), and what the sessions cost.
- `README.md` — a one-paragraph "How it was built" section linking to it, and a link to muthur.
- `docs/loom-ai-workflow.md` — the talking points: order, what is on screen, the key words for each part, following the document part for part.

The Russian draft voiceover sits in `docs/remove-before-merging/`, with the line-by-line review that shaped the rest on this PR; `/finalize` sweeps it, so it never lands.

---

## Review threads

### Review by @vzakharov (agent) — COMMENTED

_2026-09-24T12:08:46Z_

Главное по всем трём твоим примечаниям сразу.

**Время.** Текст шёл на пределе скорости и всё равно не влез, значит, резать надо примерно треть, а не темп. Что предлагаю выкинуть, расписано по строкам: вводную про «часами» (0:01), сходство дизайна с сайтом (0:40), «мою философию» и авторство скиллов (2:22, 2:43), два из трёх «других мотивов» (4:01–4:46).

**Бахвальство.** Почти везде, где звучит «я такой», можно поставить факт, который скажет то же самое, только без просьбы в это поверить: от пустого репозитория до рабочего приложения за ~14 часов, 252 файла прочитаны целиком, 67 тредов ревью, $169 по ценам API за весь проект. Цифры хвастаются сами, а muthur показан через то, *что он проверяет*, а не через то, сколько лет его делали.

**Косты.** Помещаются одной фразой в концовке (см. 4:57), и это не лишний сюжет, а ответ на вопрос брифа: *как AI ускорил работу*, в деньгах. Вместе с «14 часами» они дают ролику цифру в начале и в конце.

Черновик хронометража под эти правки:

| | |
|-|-|
| 0:00–0:20 | итог и рамка: пустой репозиторий → рабочее приложение за ~14 часов, один цикл |
| 0:20–0:45 | muthur: что это; `/spinoff` засеял этот репозиторий |
| 0:45–1:40 | план → сессии с границами → план-файл как память между ними; #1: 107 коммитов |
| 1:40–2:05 | рамки проверяются машиной: что именно |
| 2:05–2:50 | ревью человеком: 252 файла, 67 тредов → тикет #2 → пять подзадач по приоритету |
| 2:50–3:40 | пример из одной фразы: PDF, веб-интерфейс, `/task` → #12 |
| 3:40–4:10 | решает человек: «with more time» (#13) + голос одной фразой |
| 4:10–4:35 | косты: хук, `pnpm costs`, итог |
| 4:35–4:45 | прощание |

Вопросы пронумерованы в комментариях, 1–5.

_21 resolved threads omitted; re-run with `--include-resolved` to export them._

- **T01** `docs/remove-before-merging/loom-ai-workflow.ru.md`:17 — unresolved — last: @vzakharov (agent) 2026-09-24T12:29:19Z — "Девять сессий, ~100 коммитов. 59fa6a4 7556df7" → [↓](#t01)
- **T02** `docs/how-it-was-built.md`:24 — unresolved — last: @vzakharov (human) 2026-09-24T12:35:04Z — "link to gh repo like the muthur one" → [↓](#t02)
- **T03** `docs/how-it-was-built.md`:19 — unresolved — last: @vzakharov (human) 2026-09-24T12:35:39Z — "well technically they did at spinoff; I did one update mid-p…" → [↓](#t03)
- **T04** `docs/how-it-was-built.md`:31 — unresolved — last: @vzakharov (human) 2026-09-24T12:36:16Z — "too specific a thing; we can bring "my personal linter rules…" → [↓](#t04)
- **T05** `docs/how-it-was-built.md`:30 — unresolved — last: @vzakharov (human) 2026-09-24T12:36:22Z — "the strictest possible, too" → [↓](#t05)
- **T06** `docs/how-it-was-built.md`:48 — unresolved — last: @vzakharov (human) 2026-09-24T12:37:45Z — "example diff at pausing: https://github.com/vzakharov/goodsp…" → [↓](#t06)
- **T07** `docs/how-it-was-built.md`:66 — unresolved — last: @vzakharov (human) 2026-09-24T12:38:22Z — "да нет, это просто чтобы "поставить собственный мозг на мест…" → [↓](#t07)
- **T08** `docs/how-it-was-built.md`:77 — unresolved — last: @vzakharov (human) 2026-09-24T12:38:58Z — "добавить что "я не оставляю ревью лишь бы его оставить"" → [↓](#t08)
- **T09** `docs/loom-ai-workflow.md`:89 — unresolved — last: @vzakharov (human) 2026-09-24T12:40:52Z — "тоже посмотри сколько из этого именно код (по названиям сесс…" → [↓](#t09)
- **T10** `docs/loom-ai-workflow.md`:35 — unresolved — last: @vzakharov (human) 2026-09-24T12:41:59Z — ""sprawl" -- use simpler language, I wouldn't be able to make…" → [↓](#t10)
- **T11** `docs/how-it-was-built.md`:81 — unresolved — last: @vzakharov (human) 2026-09-24T12:44:02Z — "Actually there can be a nice transition from the previous to…" → [↓](#t11)

<a id="t01"></a>

### `docs/remove-before-merging/loom-ai-workflow.ru.md`:17 — unresolved

```diff
@@ -0,0 +1,47 @@
… 13 lines elided …
+
+1:20 много токенов, отписаться в план о проделанной работе, обозначить, что осталось, и сообщить об этом мне, дальше по каким-то моим замечаниям внести изменения, и потом перейти к следующей сессии.
+
+1:33 уже с чистого листа, с планом, который отмечает, что нужно делать дальше. И вот так, спустя где-то 6-7 таких сессий, видите, там под сотню коммитов, мы дошли до состояния, когда вроде как приложение уже было готово.
```

**@vzakharov (agent)** — 2026-09-24T12:08:46Z

Сверил: в #1 107 коммитов, 252 файла. Сессий на ветке #1 по журналу костов девять (8 на `knowledge-base`, 1 на `sharp-lamport`), не 6–7; проще сказать «around a hundred commits» и не называть число сессий.

**@vzakharov (human)** — 2026-09-24T12:19:46Z

ну, девять тоже хорошо :)

**@vzakharov (agent)** — 2026-09-24T12:29:19Z

Девять сессий, ~100 коммитов. 59fa6a4 7556df7

---

<a id="t02"></a>

### `docs/how-it-was-built.md`:24 — unresolved

```diff
@@ -0,0 +1,94 @@
… 20 lines elided …
+## The shell
+
+The repository was seeded with `/spinoff` from my own site's,
+`vzakharov/vovazakharov.com`. The
```

**@vzakharov (human)** — 2026-09-24T12:35:04Z

link to gh repo like the muthur one

---

<a id="t03"></a>

### `docs/how-it-was-built.md`:19 — unresolved

```diff
@@ -0,0 +1,94 @@
… 14 lines elided …
+around twenty more), the rules that load when a session touches the paths they
+name, and the hooks that fire on the session's events. It assumes no stack.
+Repositories that adopt it pull its changes forward with `/update-muthur`; this
+one did so mid-project, in
+[#11](https://github.com/vzakharov/goodspeed-knowledge-base/pull/11).
```

**@vzakharov (human)** — 2026-09-24T12:35:39Z

well technically they did at spinoff; I did one update mid-project, but I wouldn't mention it due to defocus and lack of time.

---

<a id="t04"></a>

### `docs/how-it-was-built.md`:31 — unresolved

```diff
@@ -0,0 +1,94 @@
… 27 lines elided …
+- Feature-Sliced Design layers, enforced by two checkers — steiger and
+  ESLint's boundaries plugin;
+- the ESLint ruleset, project-local rules included;
+- `pnpm type-overlap`, which fails a type that re-declares a member another type
```

**@vzakharov (human)** — 2026-09-24T12:36:16Z

too specific a thing; we can bring "my personal linter rules that I carry between projects" (referring to `vova/` ones) from the prveious bullet here

---

<a id="t05"></a>

### `docs/how-it-was-built.md`:30 — unresolved

```diff
@@ -0,0 +1,94 @@
… 26 lines elided …
+
+- Feature-Sliced Design layers, enforced by two checkers — steiger and
+  ESLint's boundaries plugin;
+- the ESLint ruleset, project-local rules included;
```

**@vzakharov (human)** — 2026-09-24T12:36:22Z

the strictest possible, too

---

<a id="t06"></a>

### `docs/how-it-was-built.md`:48 — unresolved

```diff
@@ -0,0 +1,94 @@
… 44 lines elided …
+**The plan file is the memory between sessions.** Each session claims it
+(`knowledge-base.in-progress.md`), takes one chunk of the remaining work sized
+to a little over 200k tokens, lands it with `vet` green, records in the plan
+what is done and what is left, and releases it (`knowledge-base.paused.md`).
```

**@vzakharov (human)** — 2026-09-24T12:37:45Z

example diff at pausing: https://github.com/vzakharov/goodspeed-knowledge-base/commit/dd1dacddcb9f7d4eb0c251064c4f9e915ebb65c9#diff-88f7688cfb1223d60835fb7cd0ab48c770346e6e8e46ce6646b46c31c0e11c55

---

<a id="t07"></a>

### `docs/how-it-was-built.md`:66 — unresolved

```diff
@@ -0,0 +1,94 @@
… 60 lines elided …
+order of priority. First
+[#4](https://github.com/vzakharov/goodspeed-knowledge-base/issues/4), a
+document of the design decisions and why —
+[`docs/design-notes.md`](design-notes.md) — so those decisions live in the
+repository rather than in a chat with an agent; then
+[#5](https://github.com/vzakharov/goodspeed-knowledge-base/issues/5), what
```

**@vzakharov (human)** — 2026-09-24T12:38:22Z

да нет, это просто чтобы "поставить собственный мозг на место" для репы, в которую только что окунулся и который написал кто-то другой, ну и чтобы понять как объяснять репу другим

---

<a id="t08"></a>

### `docs/how-it-was-built.md`:77 — unresolved

```diff
@@ -0,0 +1,94 @@
… 73 lines elided …
+decided whether it needed a plan and carried it through to the PR. The agent
+chose to extract the text in the browser — pdf.js in a Web Worker, its character
+maps and fonts copied into the static export — so the server receives text and
+never stores a file. The PR landed without a single review comment from me.
```

**@vzakharov (human)** — 2026-09-24T12:38:58Z

добавить что "я не оставляю ревью лишь бы его оставить"

---

<a id="t09"></a>

### `docs/loom-ai-workflow.md`:89 — unresolved

```diff
@@ -0,0 +1,97 @@
… 85 lines elided …
+- **Harish mentioned** liking **AI for internal tooling** — here's one.
+- A **hook prices every session** at **Claude API rates**; **`pnpm costs`**
+  sums them.
+- The whole project: **~$170**, **twenty sessions**.
```

**@vzakharov (human)** — 2026-09-24T12:40:52Z

тоже посмотри сколько из этого именно код (по названиям сессий будет видно)

---

<a id="t10"></a>

### `docs/loom-ai-workflow.md`:35 — unresolved

```diff
@@ -0,0 +1,97 @@
… 31 lines elided …
+  **engineering**: **FSD** with two checkers, the **lint ruleset**, the
+  **type-duplication gate**, the **design system**.
+- **Guardrails checked, not asked for** — one **`vet`** run before each merge →
+  agent code **doesn't sprawl**.
```

**@vzakharov (human)** — 2026-09-24T12:41:59Z

"sprawl" -- use simpler language, I wouldn't be able to make myself pronounce that in a loom (see if other such cases)

---

<a id="t11"></a>

### `docs/how-it-was-built.md`:81 — unresolved

```diff
@@ -0,0 +1,94 @@
… 75 lines elided …
+maps and fonts copied into the static export — so the server receives text and
+never stores a file. The PR landed without a single review comment from me.
+
+## Where the human decides
+
+Agents tend to focus on the technical side and miss the wider context in
```

**@vzakharov (human)** — 2026-09-24T12:44:02Z

Actually there can be a nice transition from the previous to this: Agents often nail technical parts, but they miss out on the big picture, for example...

---

## Timeline (status, references, and other events)

- **2026-09-24T12:08:46Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/18#pullrequestreview-5304184308.
- **2026-09-24T12:29:53Z** @vzakharov renamed from «docs: AI-workflow Loom talking points» to «docs: how it was built, and the AI-workflow Loom talking points».
- **2026-09-24T12:44:32Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/18#pullrequestreview-5304475066.
