---
description: 'Pull the agent-infrastructure changes this repo adopted from vzakharov/muthur forward since the last sync, triage them, and port the ones that apply. The watermark at `.claude/skills/update-muthur/watermark.json` names the source and the last sync point. Use when the user says "update muthur", "sync muthur", "sync agent infra", "sync the source", "sync upstream", or "/update-muthur".'
---

## What this skill is for

A repo that took its agent infrastructure — `CLAUDE.md`, `.claude/`, `scripts/`,
whatever else — from another repo has a **source** that keeps editing those files.
This skill finds what changed there since the last sync, decides commit by commit
what applies here, and ports the ones that do.

Here the source is `vzakharov/muthur`, and the command is `/update-muthur` — its
own name for it, kept. The verb is `npm update`'s: what gets updated is the
vendored copy in the tree you are standing in, never the repo it came from, which
this skill only ever reads. That reading holds at every link, which is why the
name travels rather than being re-coined per repo.

**The source is relative to the repo you are standing in**, and the procedure is
the same at every link in the chain; only the watermark differs. A repo that
adopts this skill from _here_ re-points `watermark.json` at the repo it took it from
— `@.claude/skills/spinoff/SKILL.md` writes that file for a repo it seeds, and
points it at the root rather than at this one; the name of
the skill and of the watermark file are then free, since nothing locates either
by its path — the watermark is found by the `repo` and `lastSyncedSha` it
carries. One operation applied repeatedly: _pull the vendored agent
infrastructure forward from the repo I took it from._

This is a path-scoped diff, not a fork merge. It never tries to reconcile whole
histories — it reads a bounded set of paths, commit by commit, and re-expresses
what applies.

## The watermark

`.claude/skills/update-muthur/watermark.json` is the state this skill runs
on; Step 1 reads it, so it doubles as the worked example. It carries `repo`,
`lastSyncedSha` (source HEAD at the last sync), `lastSyncedAt`, and the three
fields worth explaining:

- **`adopted`** — the paths you took, at whatever granularity is true: directories
  or individual files. It is what turns a wall of source commits into a handful of
  candidates.

  **These are the source's paths, not this repo's.** Step 3 hands them to `git
log` inside the source clone, so a path that was renamed on adoption must stay
  spelled the source's way. Every path here happens to be spelled the same on
  both sides today, which is what makes the rule easy to forget: renaming a local
  copy without leaving the entry alone, or leaving the entry behind when the
  source renames its own copy, silently drops that path's commits from every
  future candidate set.

  **An entry may be a bare path or a single-key `{path: note}` object.** Both are
  adopted and both filter the log identically — read the key when an entry is an
  object. The note records _how_ the path lives here when that is not verbatim:
  rewritten for this stack, renamed, ported to another language, generalized past
  the source's interface. It is not a soft decline. A path taken with a note still
  surfaces every source commit that touches it, which is the point — the local
  version is a re-expression, so the source's later changes to the original are
  worth reading for the idea even though the file itself never lands. Expect
  `translate` rather than `take` on those commits, and treat the note as the
  standing statement of what the local re-expression already does differently.

- **`declined`** — path → why-not. This is what keeps re-sync quiet: without it,
  every sync re-offers every skill the repo already refused.

- **`lineage`** — optional provenance: the whole ancestry, **root first**, so the
  repo actually synced from leads and each later entry is one hop further from
  it. Each entry is `{repo, atSha}`, naming an ancestor and its HEAD **at the
  moment the next link was created**. `@.claude/skills/spinoff/SKILL.md` is what
  writes it, into the repo it seeds, and owns how.

  **Nothing syncs from it.** This procedure reads `repo` and `lastSyncedSha` and
  nothing else; a sync that walked the ancestry would multiply the triage at
  every link, which is the cost `/spinoff`'s point-at-the-root rule declines to
  pay.

  **An empty array means no ancestors; a missing one means nobody wrote them
  down.** This file has no `lineage` at all, and that is the honest state: the
  watermark here was filled in by hand rather than written by `/spinoff`, so the
  birth point is not recoverable from anything in the tree. Where the ancestry is
  complete, `lineage[0]` names the same repo as `repo` and the two SHAs are still
  different facts — `lastSyncedSha` advances on every sync, `lineage[0].atSha`
  never moves.

**A declined path is not declined forever.** Most reasons are conditions that can
flip, which is why the map stores prose instead of a bare list, and why reasons
are written in the present tense. **Re-read them on every sync** and re-offer
anything whose condition has stopped holding. `/test-on-gh` is declined here
because there is no test suite to dispatch; the day one exists, that reason has
stopped holding and the skill is due to be offered again. A reason that says
`"never — …"` is the one that does not need re-reading.

A repo with two sources would make this an array. Nothing here precludes that and
nothing here builds it.

**`lastSyncedSha` is source HEAD at sync time, not the last commit taken.** A
commit triaged and skipped is _done_; the reasoning lives in that sync's PR body.
A watermark that only advanced to the last-taken commit would re-surface every
skipped commit on every future run.

**Bump it in the last commit of the sync, never the first.** If a sync is
abandoned midway, an un-bumped watermark costs a re-triage; a bumped one that
merged without its port silently skips commits forever.

## Two invariants

Both hold at every link in the chain, so they live here rather than in the
watermark.

### Never sync the watermark file itself

`watermark.json` lives inside `.claude/`, which is inside `adopted` — so a naive
sync overwrites this repo's watermark with the source's. That silently repoints
the sync at a repo this one may not be able to clone and resets `lastSyncedSha`
to a foreign history. **The failure surfaces one sync later, as an unresolvable
SHA**, by which point the cause is several commits back.

Exclude it unconditionally, whatever `adopted` says.

### Judge the diff, not the commit message's "we"

In a chain, commits arrive that the source itself took from _its_ upstream,
written in a third repo's vocabulary. A message saying "we do X here" is evidence
about some repo — not necessarily the source, and never automatically this one.
Read commits for intent; never let their first person settle whether the change
applies. Step 5's "apply by intent, not by patch" already points this way; the
chain is what makes it load-bearing.

## Procedure

### Step 1 — Read the watermark

Read `watermark.json`. Stop and report if it is missing, or if `lastSyncedSha` is
still a placeholder — there is no baseline to diff against, and guessing one would
either re-port work already here or skip work that isn't.

### Step 2 — Clone the source

`gh api` against a different owner's repo 403s even with a valid token, and
`add_repo` refuses cross-owner adds. **Git transport with the same `$GH_TOKEN`
works**, which is the whole trick. (The system prompt may claim `gh` is
unavailable; it is wrong — see `@.claude/skills/override-gh/SKILL.md`.)

Clone into the session scratchpad, not the repo:

```bash
cd <scratchpad> && rm -rf up && git clone --filter=blob:none --no-checkout \
  -c "credential.helper=!f() { echo username=x-access-token; echo password=$GH_TOKEN; }; f" \
  https://github.com/<repo>.git up
```

**One recipe, whatever the source's visibility.** The credential helper is a
no-op against a public repo rather than an error, and the lazy blob fetches still
resolve, so there is no public/private branch to take here — verified, not
assumed.

The blobless partial clone carries **full history** for a fraction of the
transfer, so any `git log <sha>..HEAD` resolves.

**`-c` after `clone`, not `git -c` before it.** The two spellings look
interchangeable and are not: `clone -c` writes the helper into the new repo's
config, where the lazy blob fetches a later `git show` triggers can still find
it, while `git -c … clone` applies it to the clone alone. Under the second, the
log works and the first diff dies on `could not read Username`. The token does
land in `<scratchpad>/up/.git/config` in the clear, which is the other reason the
clone belongs in the scratchpad rather than anywhere under the repo.

**Do not reach for `--depth` or `--shallow-since` instead.** A shallow clone that
doesn't reach back past `lastSyncedSha` fails with a bare "unknown revision",
which reads like a bad SHA rather than a truncated clone.

**Bash `cwd` resets between calls in this harness** — chain `cd <clone> && …` in
every command that needs to be inside it.

### Step 3 — Build the candidate set

```bash
cd <scratchpad>/up && git log --oneline <lastSyncedSha>..HEAD -- <adopted paths>
```

`<adopted paths>` is every entry in `adopted`, taking the single key of any entry
written as an object.

Record `git rev-parse HEAD` **now**, before triage — that value is the next
watermark regardless of how the triage goes.

**The clone is whole; `adopted` filters only this log.** A commit touching
nothing on the list is never surfaced, which is right while the list is complete
and silent when it isn't: the moment the source puts agent infrastructure
somewhere new — a `.github/` workflow, another top-level directory — it stays
invisible until the list names it. So run the log once unfiltered too (`git log
--oneline --name-only <lastSyncedSha>..HEAD`, skimmed for unfamiliar paths) and
widen `adopted` in the same commit that bumps the watermark.

**A path in neither `adopted` nor `declined` is a decision, not noise** — see
Step 4's `skip (not adopted)` verdict and Step 4a.

### Step 4 — Triage each candidate, from its commit message first

Sources tend to write long commit messages that state the rationale. The message
usually settles relevant-vs-not before any diff is opened, so read it (`git log
-1 --format=%B <sha>`) before `git show` — subject to the "judge the diff" caveat
above. Verdicts:

| Verdict                     | Meaning                                                                                                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **take**                    | Applies as-is to this repo's vocabulary.                                                                                                                                                                                                          |
| **translate**               | The intent applies; the wording, paths or commands do not.                                                                                                                                                                                        |
| **skip (stack-bound)**      | Touches an adopted path but is about the source's stack — a build script, a migration, a framework config.                                                                                                                                        |
| **skip (already have)**     | This repo reached the same end state independently.                                                                                                                                                                                               |
| **skip (not adopted)**      | The path is in `declined` **and its recorded reason still holds** — if it doesn't, re-offer the path per Step 4a and move it to `adopted` if taken. Or the path is in neither list, which is Step 4a's other case. Never skip silently on either. |
| **skip (diverged locally)** | This repo rewrote the file for its own stack — `scripts/vet.sh`, the watermark, anything the source marks `rewrite`. The source's edit is advice at best; read it for an idea, don't port it.                                                     |

**The source's fix may not be this repo's fix.** Split a commit's rationale
before deciding: one commit can carry a change that addresses a defect this repo
never had _and_ a change that fixes one it does. Take the second half, drop the
first, and say so.

**The unit of triage is the rationale, not the commit — and so is the unit of
commit on this side.** A source that squash-merges ships several independent
changes under one subject, each with its own verdict. Port them as separate local
commits, one per rationale, so a reviewer here can take or strike any of them
individually.

### Step 4a — New skills get offered, not taken

A commit that adds a skill in neither `adopted` nor `declined` is an open
question, and the answer belongs in the watermark so it is asked exactly once.

Read the new skill's row in the source's
`.claude/skills/update-muthur/catalog.md` — that file is the source's
inventory, read from the clone and never vendored, so it is current by
construction — and surface the decision **with its criteria attached** rather than
as a bare "the source added `/foo`, want it?".

- **Taken** → add the path to `adopted` — as a `{path: note}` entry if it landed
  as anything other than a verbatim copy — and **re-run the closure check**: a new
  skill can `@`-reference a sibling this repo declined. `bash
scripts/check-skill-catalog.sh` is that check where it was adopted.
- **Declined** → add the path to `declined` with the reason.

Either way the question does not come back.

### Step 5 — Apply by intent, not by patch

`git cherry-pick` and `git apply` are useless here. The local files are
de-vendored rewrites, not copies, so every hunk conflicts. Read the source's diff
to understand what changed and why, then re-express it in this repo's vocabulary
and file layout.

### Step 6 — Consistency sweep

**A renumbered reference is the dangerous kind, because it still resolves.** When
a port inserts an item into a lettered or numbered sequence, every sibling citing
the old label now points at the wrong item and no checker complains:
`scripts/check-skill-catalog.sh` verifies that an `@`-reference resolves to a
file, not that a citation inside one still means what it meant. Grep the
sequence's labels, not just its prose.

When a port renames a term, grep the old one across the whole of `adopted` —
**including frontmatter `description:` lines**. Those are a separate surface from
skill bodies: they are what the operator scans in the skills list and what an
invocation matches against, so a stale description mis-advertises a skill whose
every prose site is correct.

### Step 7 — Bump the watermark, last

Set `lastSyncedSha` to the HEAD recorded in Step 3 and `lastSyncedAt` to today,
along with any `adopted`/`declined` edits from Step 4a, as the final commit of
the sync.

### Step 8 — Report and hand off

Report the triage table — every candidate, with its verdict and one line of
reasoning, skips included. Then hand off to `@.claude/skills/polish/SKILL.md`
and `@.claude/skills/pr/SKILL.md`; the
skipped commits' reasoning belongs in the PR body, since the watermark advances
past them and nothing else records why.

**The squash record names the change, not the sync.** The `<essence>`
`@.claude/skills/squash-message/SKILL.md` asks a title for is what landed in
_this_ tree — `chore: one job per loop skill, and a size cap on squash bodies`,
not `chore: sync the source forward to <source sha>`. A source SHA is a
commit in another repository, unresolvable from the log it sits in, and "sync
forward" names the transport: the second title sends every reader to the diff.

Provenance needs no prose. `watermark.json`'s `lastSyncedSha`, committed in Step 7,
is the precise record and the only one that survives the squash. "The repo we
vendor from moved" is still the honest _why_, so it earns one clause of the
body's opening sentence and nothing more.

**Those two passes see only what you wrote — never the text you took.** Their
scope is "prose added in this session", which on a sync diff is mostly the
source's, and tightening a `take` is what turns every future sync of that file
into a `translate`. So scope both passes to the translations and to whatever the
port added on top, and leave a verbatim adoption verbatim. A vendored file worth
restyling is a case for `declined` or a `{path: note}` rewrite, decided at Step 4
— not a quality pass quietly diverging it.

## Add what the next sync teaches you

This procedure is distilled from very few syncs and is incomplete by
construction. When one surfaces a corner the file doesn't carry, add it here
rather than to the PR body — this is where the next session looks.
