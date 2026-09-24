# PR #18: docs: how it was built, and the AI-workflow Loom talking points

- **State:** open
- **URL:** https://github.com/vzakharov/goodspeed-knowledge-base/pull/18
- **Author:** @vzakharov (agent)
- **Base ← Head:** main ← claude/loom-ai-workflow-k6msbi
- **Draft:** yes
- **Merged:** _not merged_
- **Created:** 2026-09-24T12:06:56Z
- **Updated:** 2026-09-24T12:50:01Z
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

_31 resolved threads omitted; re-run with `--include-resolved` to export them._

- **T01** `docs/remove-before-merging/loom-ai-workflow.ru.md`:17 — unresolved — last: @vzakharov (agent) 2026-09-24T12:29:19Z — "Девять сессий, ~100 коммитов. 59fa6a4 7556df7" → [↓](#t01)
- **T02** `docs/how-it-was-built.md`:62 — unresolved — last: @vzakharov (human) 2026-09-24T12:49:11Z — "учитвая что "writing its decisions down" делал тоже не лично…" → [↓](#t02)
- **T03** `docs/how-it-was-built.md`:80 — unresolved — last: @vzakharov (human) 2026-09-24T12:49:37Z — ""As ... shows, agents often... At the same time, they..."" → [↓](#t03)

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

### `docs/how-it-was-built.md`:62 — unresolved

```diff
@@ -57,12 +54,13 @@ Every file gets a human read: I went through all 252 files of #1 and left 67
… 8 lines elided …
-[`docs/design-notes.md`](design-notes.md) — so those decisions live in the
-repository rather than in a chat with an agent; then
+[`docs/design-notes.md`](design-notes.md): I had just dived into a repository
+someone else wrote, and writing its decisions down is how I got my own head
```

**@vzakharov (human)** — 2026-09-24T12:49:11Z

учитвая что "writing its decisions down" делал тоже не лично я :), тут нужно как-то скорее обернуть в discussing and seeing them written down

---

<a id="t03"></a>

### `docs/how-it-was-built.md`:80 — unresolved

```diff
@@ -74,21 +72,23 @@ loop on a real feature. The session opened with the task in plain words; `/task`
… 8 lines elided …
 
-Agents tend to focus on the technical side and miss the wider context in
-places. The README's "What I would do with more time" first came out as what
+Agents often nail the technical parts and miss the big picture. For example,
```

**@vzakharov (human)** — 2026-09-24T12:49:37Z

"As ... shows, agents often... At the same time, they..."

---

## Timeline (status, references, and other events)

- **2026-09-24T12:08:46Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/18#pullrequestreview-5304184308.
- **2026-09-24T12:29:53Z** @vzakharov renamed from «docs: AI-workflow Loom talking points» to «docs: how it was built, and the AI-workflow Loom talking points».
- **2026-09-24T12:44:32Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/18#pullrequestreview-5304475066.
- **2026-09-24T12:50:00Z** @vzakharov reviewed (COMMENTED): https://github.com/vzakharov/goodspeed-knowledge-base/pull/18#pullrequestreview-5304628031.
