# Type Overlap & Shared Bases

**Every member two named types both declare has exactly one home — a shared base type they
both intersect; and every _combination_ of bases two types both spell has a name of its own.
Enforced by `pnpm type-overlap`, in `vet`, at threshold 1 for members and 2 for combinations.**

_Adopted wholesale from `Playgramai/playgramapp`, where the detector was ratcheted 4→3→2→1 over
several batches before landing globally at 1. This repo starts at 1: it was clean at that floor on
adoption bar one pair, so there is nothing to phase in. The upstream doc
(`docs/decisions/type-overlap-and-shared-bases.md` there) carries the empirical record — the counts,
the fifty-five numbered lessons, and the FSD-specific placement rules this one drops._

---

## 1. Why even a single shared member gets its own base

`pnpm type-overlap` compares every pair of named type aliases in the repo and fails the run when the
two declare any member with identical text. Nothing is grandfathered: a run is either clean or names
the pair to fix. Three returns pay for that floor.

**It prevents drift.** Two declarations of one shape are two things to change, and TypeScript won't
catch a divergence, because each duplicate redeclared its own fields. The floor is the member-level
half of CLAUDE.md's "derive types from the source of truth" rule: that rule covers a shape tracking
_another declaration_, this one a shape tracking _nothing but a sibling's copy of itself_.

**It makes future refactoring mechanical.** A member with exactly one home is a seam. Branding
`localeCode` into `Branded<string, 'Locale'>` becomes one edit at the base rather than a sweep over
every spelling, and "which types carry a title?" becomes find-references rather than a grep that
misses `title?`, `title: string | null` and every inline literal.

**It surfaces bad data structures.** A reported group is frequently _not_ a missing base. It is:

- a **key lying about its meaning** — `file` for a path in a script and a `File` in the app;
  `owner` for a repo owner and a person; `onRefresh` for a data re-fetch and a `location.reload()`;
- a **stem drifting under two spellings** — `isActive`/`active`, `isLoading`/`loading`;
- an **optional with no reason to be optional**, forcing double-negative reads
  (`disabled: enabled === false`) on every reader;
- a **one-field type whose name is worse than the base's**.

The tool can't tell you which; it makes you look. The fix is a rename or a collapse rather than an
extraction often enough that a **rename pass** and an **optionality audit** are standing steps (§6).

### The coincidence objection

Single-member overlaps on `id: string` or `children: ReactNode` look like coincidence rather than
duplication, so the objection to a floor of 1 is that it flags virtually every pair. Upstream it
didn't: 248 groups at threshold 1, all cleared, none forcing an abstraction that reads as invented —
and category three above is only reachable at 1, every lying key and drifted stem there having
shared exactly one member. A base over a recurring primitive costs one intersection and buys the
seam. What it does not buy is coverage the detector's syntax can't see (§8).

### Why combinations start at 2

A second pass applies the same rule one level up: the _set of named constituents_ two types both
spell. `Titled & Described` written out twice is the same shape under two spellings, and the member
pass is blind to it by construction — it counts those constituents as inherited, which is the very
property that lets `& Base` clear a member finding.

**Its floor is 2, and that is not a rung to ratchet down.** One shared base is reuse working as
intended — it is the end state every member finding is fixed _into_, so flagging it would fail the
gate for obeying the gate. Two is the point at which a combination becomes a thing worth naming.

A pure combination alias (`type Summarized = Titled & Described`) is itself a participant, so a type
respelling the combination is flagged against it and the fix the finding names is "use the alias
that already exists" rather than "mint a second one".

## 2. The mechanism

`scripts/type-overlap-check.ts`, wired into `scripts/vet.sh`. Nothing runs on pull requests here
(see CLAUDE.md → Deployment), so the vet run is the only place the gate fires — which makes
`/finalize` the point at which a branch is actually held to it.

Two passes run over the same set of aliases, both pairwise, and the run fails when either has
findings.

**The member pass** counts only a type's _own_ members — the named constituents of an intersection
are inherited — which is exactly why `& Base` on both types makes a finding disappear. Two members
are "the same" when their normalized signature text (name, modifiers, type annotation,
whitespace-collapsed) is identical, so `title?` ≠ `title` and `path: string | undefined` ≠
`path?: string` — a pair that is materially different as a contract too (§3), not merely as text.

**The combination pass** takes the other half of each intersection: every constituent that is not an
object literal, so `Titled`, `Maybe<Foo>` and `Pick<X, 'y'>` all count. The two halves partition the
constituents, which is what keeps them from needing a carve-out to hold in sync. An alias with no
own members takes part in this pass alone.

Findings group by identical shared set, so one extraction clears a whole group, and a type sharing
_different_ sets with different partners needs a base for each.

**Both thresholds are floors** — 1 for members, 2 for combinations (§1). `TYPE_OVERLAP_MIN` and
`TYPE_OVERLAP_BASES_MIN` override them upward only, so a run can triage a looser gate but never
preview a stricter one.

**The scan covers the whole repo** minus dot-directories, dependencies, build output, `public/` and
`tmp/`. A skip-list rather than upstream's root allowlist, because the failure modes are not
symmetric: an allowlist silently un-scans the next source directory someone adds, where a skip-list
at worst scans one holding no type aliases.

**Only `type` aliases are scanned.** `@typescript-eslint/consistent-type-definitions` bans
`interface` repo-wide, and that ban is what makes the scope complete rather than a subset — without
it the gate is blind to every named shape someone happens to spell as an interface. The two land
together; neither is worth much alone.

## 3. Naming families

The sole home for the families. The table is the at-the-keyboard reference; the rules below hold what
a table can't. `Named`, `WithId`, `WithFilePath`, `Titled`, `Described` are the families in
miniature — the names to reach for first, wherever § 6 puts the base.

| Member kind         | Required                                                          | `?:`                                  | `\| undefined`, required key | `\| null`              | may be both         |
| ------------------- | ----------------------------------------------------------------- | ------------------------------------- | ---------------------------- | ---------------------- | ------------------- |
| descriptive scalar  | `Named`, `Titled`, `Labeled`, `Described`, `Keyed`, `Timestamped` | `Maybe<Participle>`                   | —                            | `Nullably<Participle>` | —                   |
| noun / value / node | `With<Noun>`                                                      | `WithOptional<Noun>`                  | `WithUndefinable<Noun>`      | `WithNullable<Noun>`   | `WithNilable<Noun>` |
| id pointer          | `<Entity>Ref`                                                     | `OptionalPostRef`                     | `UndefinablePostRef`         | `NullablePostRef`      | —                   |
| boolean flag        | `Whether<Flag>`                                                   | `Maybe<Flag>`                         | —                            | —                      | —                   |
| callback            | `-able` / `Handles<Event>` / `Can<Verb…>`                         | `Maybe<Able>` / `MaybeHandles<Event>` | —                            | —                      | —                   |

`With` is the single "carries a thing" prefix — never `Has`. Coin participles freely where one reads
well (`Keyed`, `Timestamped`, `Described`); short and intuitive beats grammatically strict.
`WithNilable<Noun>` covers the doubly-loose forms, both `?: T | null` and a required
`T | null | undefined`.

**Booleans have two axes and each gets its own word.** Whether the _value_ holds →
`Whether<Flag>`; whether the _key_ is present → `Maybe<Flag>`, the same sense `Maybe` carries for
participles. `<Flag>` is the key in PascalCase with a leading `is` dropped. `Whether…` names the
_question_ where `Archived` would assert the property, and "Whether X" is grammatical for any
predicate, so the rule needs no per-field tiebreaks (`WhetherCanEdit`, `WhetherAtLimit`).

**Callbacks are named for who acts on what** — the distinction the `on` prefix erases, which is why
spelling can't drive the rule. Three rules, no residual:

1. the owner acts on the type's own subject → `-able` (`onClose` → `Closable`; `?:` →
   `Maybe<Able>`). Mechanically an `on<Verb>` key whose verb takes no object beyond the subject;
2. the subject reports something happened → `Handles<Event>` (`onSaved` → `HandlesSaved`; `?:` →
   `MaybeHandles<Event>`). Mechanically an `on<Participle>` key, or an `on<Noun>` key carrying a
   payload;
3. the holder is handed a capability to act on something else → `Can<Verb…>` (`abort` →
   `CanAbort`). Mechanically a bare-verb key, or an `on<Verb><Object>` key whose object is not the
   subject.

**Reading is an action**, so a getter (`getScrollContainer`) is rule 3, not a thing carried — which
leaves `With<Noun>` meaning only what it always meant and never straddling the callbacks.

**`<Entity>Ref` is the id-pointer family**: a base that _addresses_ an entity rather than carrying
it, so its member is the id key — a `PostRef` is `{ postId: string }`, never a post. That is the
whole distinction from `With<Noun>`, and it is why a ref names the entity, not the key.

**A `Ref` carries its modifier in front** — `OptionalPostRef`, `NullablyTitledPostRef`, and
`Optional…` rather than `Maybe…` because `Maybe` reads well only before an adjective while `Ref` is
a noun. A ref carrying its modifier as a trailing noun (`PostTitleRef`) is the smell.

**A true type-collision on one key** takes distinct `With<Type><Noun>` names — `WithStringValue`
beside `WithNumericValue`, `WithStringStatus` beside a domain-enum status.

**Qualified vs bare key of one value type** — one value type reached under two key spellings:
`postType: PostType` (qualified — the type name camelCased in full) beside `type: PostType` (bare —
the leading qualifier supplied by the enclosing type). The qualified key keeps the plain
`With<Type>` name and the bare key takes `WithBare<Type>`: `WithPostType` and `WithBarePostType`.
Both names are built from the **value type**, never from the key, so `Bare` is the only thing
telling them apart.

That marker names a distinction, so it is only correct where one exists: mark the bare side, and
only when _both_ spellings are based. A based member has exactly one declarer, so the test is
whether each spelling has a base, not how many types declare it — a lone `{ type: WugType }` with no
`{ wugType: WugType }` anywhere is `WithWugType`.

_Authoring guidance for new code_: reach for the **qualified** key when the member travels — across
modules, into a payload — and the **bare** key when the enclosing type already names the domain.

**A key frozen by an external vocabulary** gets a type alias rather than a rename:
`StringFor<Meaning>`. Ids are the exception, having natural type names (`GitHubIssueId`). Note the
direction: the alias _splits_ a group rather than uniting one, so it is right only where the meanings
genuinely differ — never a way to make an awkward base name read better. Where the key is ours,
rename it instead.

**The exemption**: a member whose meaning isn't the state it names. `{ current: boolean }` on a
mutable ref cell is `AbortRef`, not `WhetherCurrent`, which would name the syntax.

**The disjointness dividend**: `Can…` is always a capability function and `Whether…` always a flag,
by construction (`canEdit: boolean` is `WhetherCanEdit`, never `CanEdit`). As prose they are
near-synonyms; as families they cannot be confused, which is what makes `CanLoadMore` safe beside
`WhetherHasMore` in one props type. `Maybe` likewise keeps one meaning throughout: this key may be
absent.

## 4. Variants are separate bases, never `Partial<Base>`

A key's `?:`, `| undefined` and `| null` forms are always separate, literal bases. Three
independent supports:

- `exactOptionalPropertyTypes` is **off** in `tsconfig.json`, so `path?: string` and
  `path: string | undefined` are materially different contracts: an optional key can be silently
  omitted, while a required-undefinable key forces the caller to pass it;
- `| null` is a wire/serialized shape, not a looser form of either;
- `Partial<Base>` is invisible to a purely syntactic detector, so a later re-inline of the member
  would slip past.

**Rejected**: `Partial<Base>`; a generic `Undefinable<T>` utility; and `Maybe…` on required booleans
(backwards — it pushes the `?:` variant into a clunky `WithOptional…`). Every base is a **literal**
object type for the same reason as the third bullet: a member derived through a mapped utility is
invisible, so a re-inline would slip past.

Collapsing a _drifted_ variant is a **tightening** — the compiler names every site — and never a
loosening. Loosening call sites to merge legitimately distinct signatures would be a contract change
smuggled inside a type-dedup change.

## 5. Distinctions that look alike and resolve differently

Each row is a pair that reads as the other one until you apply the test.

| Looks like                          | Actually is                                                                                      | The discriminating test                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| two shapes                          | one shape under two drifted spellings (`isActive`/`active`)                                      | Is either spelling pinned by an external vocabulary — a wire payload, a library prop? Converge on it; otherwise on the `is`-prefixed one. **Forwarding to a differently-named library prop is not a pin** — that's one boundary line (`loading={isLoading}`), not a shape flowing through the codebase. |
| a drifted stem                      | a **qualified sibling**: the same stem narrowed by a qualifier (`isLoading` vs `isLoadingOlder`) | Does the extra word narrow the _fact_ or only the _spelling_? A qualifier says more — a second flag, so keep both bases. A dropped or added `is` says nothing — drift, so converge per the row above.                                                                                                   |
| a name clash to settle once         | two legitimate needs (`type: PostType` vs `postType: PostType`)                                  | A bare key is inferred from its enclosing type; a qualified key is portable. Both stand, and `WithBare<Type>` discerns.                                                                                                                                                                                 |
| qualified siblings to collapse      | several facts, not one drifted name (`ogImage` / `image` / `avatarImage`)                        | Would collapsing require renaming keys at call sites to say nothing new? If so, keep all of them.                                                                                                                                                                                                       |
| a base needing an awkward name      | one key covering two unrelated **operations** (`onRefresh` = re-fetch vs `location.reload()`)    | Rename the member if the key is ours — that _dissolves_ the group instead of naming it. Trading a guarded signature for a key that tells the truth is the right trade.                                                                                                                                  |
| an honest base for a mis-named prop | a capability wearing an event's name (`onSettingsOpen`, wired straight to `onClick`)             | Rename the key. Otherwise the prop and its base disagree forever and only the base is right. Counterweight: genuine rule-1 `on*` spellings (`onClose`, `onRetry`) are correct — audit, don't plan a rename wave.                                                                                        |
| the same verb drifting              | the same verb from **opposite ends** (`close` vs `onClose`)                                      | `Closable` = "an owner closes this"; `CanClose` = "the holder closes something". Two bases, not drift.                                                                                                                                                                                                  |
| a heterogeneous key needing a split | one relationship over different subjects                                                         | `-able` **names the subject**, so it strains when one key covers two operations. `Can…`/`Handles…` are subject-agnostic.                                                                                                                                                                                |
| a meaningful optional               | drift                                                                                            | **Does a real production call site omit the key, or is its absence read as a third state?** Not "could this be optional". A `\|\| undefined` in a mapper is styling parity, not evidence; "could be optional but never is" is not evidence.                                                             |
| a missing base                      | a member already declared elsewhere                                                              | Grep the signature **before** naming anything — and read the candidate's _full member list_: pointing a type at a two-member concept type hands it a member it doesn't have.                                                                                                                            |
| a redundant alias                   | a real composite                                                                                 | A pure rename of a **single** base is redundant — delete it. A two-base intersection with its own meaning and consumers stands.                                                                                                                                                                         |

The optionality verdict varies sharply by family, so plan a callback or domain-typed sweep for
`Undefinable`/`Nilable` siblings rather than for a collapse wave: an absent callback usually means
_render no affordance_ — a third state by construction — where an absent boolean usually just means
`false`.

## 6. Where a base lives, and working a finding

**Home rule**: the topmost module that every declarer already imports and that semantically owns the
member. **Module-local is the default and needs no justification** — when both declarers sit in one
file, the base belongs in that file, and a "why it lives here" docstring clause on such a base gets
deleted. A base that is genuinely cross-cutting, or whose declarers share no natural upstream
module, belongs in the `src/shared/` segment that owns the concept — `Summarized`, the card copy
both home cards render, sits in `shared/ui` beside the `Card` they both import. There is no
repo-wide catalog module: a segment named for the types it holds rather than their purpose is
exactly what Steiger's `segments-by-purpose` rejects, and one drawer for every base makes the
import graph stop describing anything.

**Don't mint a file per base.** Group them. Upstream's module shapes — `*-mixins.ts`, `*-flags.ts`,
`*-refs.ts` — are the pattern to reach for once a segment's bases outgrow the module holding them.
Rename a module when its contents outgrow its name.

**Resolve homes after the optionality audit, not before.** A collapse changes which variant reaches
the floor, and can promote a signature the pre-collapse scan scored as a singleton.

The order of work on a finding:

1. **Scope from the tool, never from a table.** Any inventory older than the current `main` is wrong
   in both directions. Re-scan for **signatures**, not field names: one field row can hide a genuine
   type-collision (`file: File` beside `file: string`).
2. **Reuse pass before the naming pass.** Grep every signature for an existing declarer and read that
   candidate's full member list. The naming discussion for a base you then delete is pure waste.
3. **Rename pass.** Is the group a key lying about its meaning (§1)? A rename can dissolve a group
   _or_ create a third consumer for an existing base; the direction depends on whether the key
   **lies** about the meaning or merely **under-describes** it.
4. **Optionality audit** with §5's empirical test, expecting §5's per-family distribution.
5. **Re-scan after the audit** — steps 3–4 change the input to step 6.
6. **Resolve homes** per the home rule above.
7. **Extract**, and delete any alias that collapsed to a pure rename of one base.
8. **Sweep**: orphaned docstrings (§7), then `./scripts/vet.sh`.
9. **For a gate change, assert the failure mode as well as the success one.** A clean run proves the
   repo is deduped; it does not prove the gate still fires. That distinction is what
   `scripts/type-overlap-check.test.ts` exists for: it drives the real script over throwaway source
   trees and asserts both directions — the clean line verbatim, and, for each pass, the section, the
   group's member list and the fix bullet. Extend it in the same commit as the gate change, and check
   the new case actually fails against the unchanged script before you keep it.
   **An ad-hoc probe cannot live in `tmp/`**, which the scanner skips — nor anywhere else committed,
   since the repo's own run would then scan it. That is why the fixtures are written into the OS temp
   directory at runtime rather than checked in.

## 7. Docstrings on a base

**The rules live here, once.** A base carries no paragraph justifying its name: every base would
need one, and a rule restated in twenty places drifts in twenty places.

**A base's docstring carries only the domain fact its name and signature can't** — which modal
`openSettings` opens, what `onSaved` lets the caller refresh, why `onRetry`'s absence is a third
state, which sibling it is among several qualified siblings over one value type.

**What goes**: naming rationale, rule restatements and cross-references, consumer lists, placement
rationale, and anything restating the name (`CanLoadMore`'s "fetches the next page").

**Placement notes stay only when they name a concrete hazard** — a module that must import nothing,
or a composing hook that cycles back into it — and they get a size check: write the note as a
property of the code rather than as the argument that produced it.

**A comment about a member moves with the member** — onto its own line immediately before the mixin
inside the intersection. Trailing (`Named & // …`) doesn't survive prettier, which re-hugs it into
`Named & { // …` where it reads as a comment on the inline members. When a whole one-field type is
deleted, its comment moves to the parameter it described.

**Repointing orphans docstrings, so sweep per commit rather than once at the end.** Removing a member
leaves its JSDoc dangling before the closing `}` or stacked against the next member's; both compile
and both are invisible in review. Two regex sweeps catch every case — a comment immediately followed
by `};`, and a JSDoc immediately followed by another JSDoc.

## 8. Known gaps

The floor is not complete coverage.

- **`*.test.*` is skipped by design — the permanent gap.** Production re-inlines are impossible, so
  tests are the only place a deduped member can quietly come back. **A test that annotates a shape
  should compose the bases too, and nothing but review will tell you when it doesn't.** The exclusion
  is what lets a suite exist at all without lighting the gate up — this gate's own tests declare
  duplicate shapes on purpose.
- **Combinations match syntactically, so an alias and its expansion don't.** The combination pass
  compares constituent _text_, exactly as the member pass compares signature text. A type spelling
  `Summarized` and one spelling `Titled & Described` therefore share a combination without sharing a
  token, and the gate sees two unrelated sets. Resolving the alias graph would catch it and is a
  separate change; until then, reading a group's constituent lists is review's job. **And two types
  sharing exactly one base are never flagged** — deliberately, per §1 — so that silence is by design,
  not oversight.
- **Inline shapes are invisible at any threshold**, in four positions: a return type, a `const`
  annotation, a **generic's type argument**, and — the one that matters most — a **render-prop's
  argument type**, which is a contract between two files and drifts exactly like a named type. So
  grep the key in inline positions too (`{ key:`, `(args: {`, `<{ `), and when you find one, the
  contract belongs with the component that _declares_ the prop, not the one that implements it. The
  generic position is where route params land: `WithParams<{ slug: string }>` hides `slug` from the
  gate, so a route's segments get a named shape (`WithParams<WithOptionalCvSegments>`) even though
  nothing but the route reads it. Invisibility also cuts the other way, as a budget guard: an inline
  member whose rename would churn ~30 call sites for no type-level gain is legitimately left alone.
- **Derived forms are invisible** — `Pick<>`, `Omit<>` and mapped types. Where they conflict,
  **deriving from the source of truth outranks the detector's anchor**: a one-member type that is
  honestly a `Pick<SomeRow, 'field'>` stays one.
- **A member-position check has to parse.** A substring sweep over file text vindicates the very
  lines it exists to catch — a column definition `foo: boolean('foo')` contains `foo: boolean` as a
  substring — so reuse the detector's own `ts.isPropertySignature` walk instead.
- **Branding is deliberately deferred.** For a key spanning several id spaces, the default meaning
  stays a bare `string` and only the foreign meanings get an alias. Branding the default meaning is
  the endgame the seam exists for, not a step in a dedup.
