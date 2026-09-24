---
description: Adding, renaming or cross-referencing a skill — the checks that cover it, and names to avoid
paths:
  - .claude/skills/**
---

# Adding or renaming a skill

**The vet run covers the cross-references**: `scripts/vet.sh` calls `scripts/check-skill-catalog.sh`, so there is no separate step to remember — run the script directly only when you want the answer before the next vet. What it protects: the skills are densely cross-referenced, and an `@`-reference into `.claude/` naming a file that isn't there fails **silently** — the agent follows the surviving prose and skips the step they couldn't load. It also asserts that no skill is left as an unhydrated stub. Its catalog assertions skip here by design: the catalog describes the source's own tree and is never vendored.

**Don't name a skill with a word the loop already uses as an instruction token.** Skills trigger on description matching before their body loads, so a name that doubles as a go-ahead ("implement", "proceed", "ship it", "let's …" — `@.claude/skills/plan/SKILL.md` § "The approval gate" holds the list) fires on prose that meant the token, not the skill. Where the skill takes an argument, naming it after the argument — `/task`, `/pr` — puts it out of reach of that reading entirely.

**A change to a skill's `description:` is an edit to an always-loaded file**, since the skill listing carries it on every turn: stage the `SKILL.md` first, per `@.claude/rules/staging.md`. A body-only edit goes in place.
