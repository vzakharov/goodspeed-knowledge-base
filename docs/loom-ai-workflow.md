# Loom: how AI accelerated the work — talking points

The order of the second walkthrough and what each part must cover, as cues to
speak from. It narrates [How it was built](how-it-was-built.md), part for part.
Target about 4:30 of the brief's 5:00.

**Before recording**

- Tabs open in this order: muthur, vovazakharov.com, the app on
  `localhost:3000`, #1, the `pause` commit in #1, #2, the closed PR list, #12,
  #12's Claude Code session (translated, scrolled to the top), #13.
- `pnpm costs` run in a terminal, its total on screen.

## 0:00 — Intro

_On screen: vzakharov/muthur._

- Hi again — **how AI built this**.
- Agents wrote **every line**; my part — the **calls at the forks** and the
  **review**.
- By Toggl, **~8.5 hours** of my time, most on **docs and these videos**; the
  **app itself: 2–4 hours**.
- It runs on **muthur** (MU/TH/UR, _Alien_) — skills, rules, hooks for
  **Claude Code**, shared across **all my repos**, **no stack assumed**.

## 0:30 — The shell

_On screen: vovazakharov.com → the app beside it._

- **`/spinoff`** seeded this repo from **my site's**.
- **Not the agent rules** — those come from muthur anyway — the site's
  **engineering**: **FSD** with two checkers, the **strictest lint rules**,
  **my own lint rules** I carry from project to project, the **design system**.
- **Rules checked by a script, not just asked for** — one **`vet`** run before
  each merge → agents **stay in bounds**.

## 1:05 — One plan, sessions with limits

_On screen: #1 → the `pause` commit (dd1dacd), its plan diff._

- `/plan` from the brief. Usually **many PRs**; here **one**, for the
  **deadline**.
- **The plan file is the memory between sessions**:
  - a session **takes one chunk** (~**200k tokens**), lands it **green**,
    **writes to the plan** what's done and what's left, **releases** it;
  - the next **starts clean** and **reads the plan**.
- **Context resets, the plan stays.**
- **Nine sessions**, **~100 commits** → the app **built and working**.

## 1:55 — The review

_On screen: #1's files → #2._

- **Every file gets a human read**: all **252**, **67 threads**.
- Not fixed in #1 — already **100+ commits** → it **landed as is**, the review
  became **ticket #2**.
- **Split into five**, by **priority**: first a **document of the design
  decisions** — a repo **someone else wrote**, so it **gets my head around
  it** and teaches me **how to explain it** — then the **first-run polish**.

## 2:40 — From one sentence to a PR

_On screen: the closed PR list → #12 → its session, the top of it._

- **Ten PRs closed** so far; the one to show — **PDF import**, a **stretch
  goal**.
- The session **opens with plain words**; **`/task`** decides **plan or not**,
  carries it to the **PR**.
- Why the web → **the document from the first video**.
- The agent's call: **the PDF is read in the browser** — pdf.js, its fonts
  and maps **copied into the static export**.
- **Right first time**: **not one review comment** from me — and I **don't
  comment just to comment**.

## 3:35 — Where the human decides

_On screen: #13._

- Agents often **nail the technical parts** but **miss the big picture** — for
  example:
- "More time" came out as **what the agent would do** → rewritten as **what I
  would**.

## 3:55 — What it cost

_On screen: the `pnpm costs` output._

- **Harish mentioned** liking **AI for internal tooling** — here's one.
- A **hook prices every session** at **Claude API rates**; **`pnpm costs`**
  sums them.
- The whole project: **~$170**; **~$100** of it **the app's code**, the rest
  **docs, these videos**, the loop's **upkeep**.

## 4:20 — Outro

_On screen: the README's "How it was built"._

- The **whole account** → **linked from the README**.
- **These talking points** came out of **the same loop**.
- Thanks — **see you on the call**.
