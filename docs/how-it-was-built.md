# How it was built

Every line of code here was written by agents: Claude Code, run in its web
interface, through a loop of skills, rules and hooks that sets what each agent
may do and checks what it did. My part was the brief's reading, the calls at the
forks, and the review. By Toggl that came to about eight and a half hours of my
time, most of it on this submission's documents and videos; the app itself,
refinements included, took two to four of them.

## The loop: muthur

[vzakharov/muthur](https://github.com/vzakharov/muthur) (after the ship's
computer in _Alien_) is the agent infrastructure I keep for every repository I
work in: the skills a session runs (`/task`, `/plan`, `/go`, `/finalize` and
around twenty more), the rules that load when a session touches the paths they
name, and the hooks that fire on the session's events. It assumes no stack.

## The shell

The repository was seeded with `/spinoff` from my own site's,
[vzakharov/vovazakharov.com](https://github.com/vzakharov/vovazakharov.com). The
agent rules would have arrived from muthur anyway; what the spinoff added is the
site's engineering, so the first session already worked inside it:

- Feature-Sliced Design layers, enforced by two checkers — steiger and
  ESLint's boundaries plugin;
- the ESLint ruleset, the strictest there is;
- my own lint rules, which I carry from project to project;
- the Mantine design system and its colour tokens.

`./scripts/vet.sh` runs all of it, with the builds and every test suite, before
a branch is finalized. The guardrails are checked rather than asked for, which
is what keeps agent-written code within bounds.

## One plan, bounded sessions

From the brief, `/plan` wrote one plan. My usual process splits a plan into
many sub-tasks, each in its own PR; with the brief's deadline, this one ran as a
single PR, [#1](https://github.com/vzakharov/goodspeed-knowledge-base/pull/1).

**The plan file is the memory between sessions.** Each session claims it
(`knowledge-base.in-progress.md`), takes one chunk of the remaining work sized
to a little over 200k tokens, lands it with `vet` green, records in the plan
what is done and what is left, and releases it (`knowledge-base.paused.md`;
[a pause, for example](https://github.com/vzakharov/goodspeed-knowledge-base/commit/dd1dacddcb9f7d4eb0c251064c4f9e915ebb65c9#diff-88f7688cfb1223d60835fb7cd0ab48c770346e6e8e46ce6646b46c31c0e11c55)).
The next session starts from a clean context and reads the plan. The context
resets; the plan stays. In #1's history each handoff is a `pause` commit and
a `resume` commit, the second quoting my go-ahead. Nine sessions and 107 commits
later, the app was built and worked.

## The review

Every file gets a human read: I went through all 252 files of #1 and left 67
review threads. They were not fixed in #1, which was already past a hundred
commits: #1 landed as it was, and the review became
[#2](https://github.com/vzakharov/goodspeed-knowledge-base/issues/2), linking
every thread from the item it turned into and split into five sub-issues in
order of priority. First
[#4](https://github.com/vzakharov/goodspeed-knowledge-base/issues/4), a
document of the design decisions and why —
[`docs/design-notes.md`](design-notes.md): I had just dived into a repository
someone else wrote, and talking its decisions through with an agent and seeing
them written down is how I got my own head around it and learned how to explain
it to others; then
[#5](https://github.com/vzakharov/goodspeed-knowledge-base/issues/5), what
makes a reviewer's first run pleasant.

## From one sentence to a PR

File import is one of the brief's stretch goals, and
[#12](https://github.com/vzakharov/goodspeed-knowledge-base/pull/12) shows the
loop on a real feature. The session opened with the task in plain words; `/task`
decided whether it needed a plan and carried it through to the PR. The agent
chose to extract the text in the browser — pdf.js in a Web Worker, its character
maps and fonts copied into the static export — so the server receives text and
never stores a file. The PR landed without a single review comment from me,
and I don't leave comments for the sake of leaving them.

## Where the human decides

As #12 shows, agents often nail the technical parts. At the same time, they can
miss the big picture: the README's "What I would do with more time" first came
out as what
_the agent_ would do with more time;
[#13](https://github.com/vzakharov/goodspeed-knowledge-base/pull/13) rewrote it
as what I would.

## What it cost

A `Stop` hook prices every session at Claude API rates into `.claude/costs/`,
and `pnpm costs` sums the rows: about $170 at this writing, some $100 of it on
the app's code and the rest on documents, these walkthroughs and the loop's own
upkeep. This document and the talking points for both walkthroughs came out
of the same loop, in
[#15](https://github.com/vzakharov/goodspeed-knowledge-base/pull/15) and
[#18](https://github.com/vzakharov/goodspeed-knowledge-base/pull/18).
