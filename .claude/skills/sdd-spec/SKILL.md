---
name: sdd-spec
description: "Create or refine a feature spec (what and why: stories, acceptance criteria, requirements). First step of the SDD workflow; re-run with feedback to refine an existing spec."
argument-hint: "<feature description> | <feature id> <change>"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md` first. Then decide the mode: the argument describes a new
feature → **Create**; it names an existing feature, or there is an active feature and the
argument reads as feedback → **Refine**.

## Create

1. **Understand.** Read the description. Look at the repo only as much as needed not to
   contradict what exists — related specs in `specs/`, current behaviour, `docs/standards.md`
   rules that shape scope. Do not design the solution.
2. **Ask** per conventions (max 3). Typical worthy questions: scope boundary, who may do what,
   data that must or must not be kept. Never ask what a sensible default answers.
3. **Write** `specs/<NNN>-<slug>/spec.md` from `template.md` (next to this file):
   - Describe behaviour at the boundary the user or consumer sees — screens and actions for a
     UI, requests and responses for an API, commands and output for a CLI. No internals: no
     modules, libraries, schemas or algorithms.
   - Stories are prioritised (P1…). P1 alone must be a usable increment.
   - Every AC is Given/When/Then with an observable result — each one later becomes a test or
     a named check. Failure and edge cases are ACs too, not a separate list.
   - `FR-n` holds what belongs to no single story: rules, limits, permissions, quality targets
     with numbers.
   - Non-goals are explicit. Defaults you chose go in Assumptions.
4. **Self-check** (do not write a checklist file): every story has ACs; every AC is testable
   and unambiguous; no placeholder text left; nothing contradicts `docs/standards.md`.
5. **Report**: path, story/AC/FR counts, the assumptions worth a glance, next step
   `/sdd-plan`.

## Refine

1. Resolve the feature. Apply the change in place: keep IDs stable, add new ones at the end,
   retire instead of deleting. Bump `rev`, add a changelog line naming the IDs touched.
2. If the feature is `done` and behaviour changed, set `status: planned`.
3. Impact: if `plan.md` / `design.md` exist, list the slices and screens that cite changed
   IDs. Tell the user the next `/sdd-plan`, `/sdd-design` or `/sdd-implement` run will
   reconcile them — or that nothing downstream is affected.
