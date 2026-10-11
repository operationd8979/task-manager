---
name: sdd-clarify
description: "Optional step after /sdd-spec: find the spec's ambiguities that would change the design, plan or tests, ask up to 5 targeted questions, and write each answer straight into the spec. Skip it freely — later steps do not require it."
argument-hint: "[feature id] [area to focus on]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md`, resolve the feature, then read its `spec.md` and
`docs/standards.md`. Read `design.md` / `plan.md` only if they exist, to know what an
answer would disturb. A focus area in the argument narrows the scan; it does not lift the
question limit.

## 1. Scan

Read the spec against this checklist. A gap counts only if a reasonable reader could build
two different things from it:

- **Scope**: what is in and out; where one story ends and the next begins.
- **Actors & permissions**: who may do what; what an unauthorised attempt sees.
- **Data**: what is stored, for how long, and what survives delete, reinstall or sign-out.
- **States & transitions**: lifecycle of the main entities; what happens mid-transition.
- **Failure & edge cases**: offline, empty, limits, concurrency, partial success.
- **Interaction**: entry points, ordering, what interrupts what, confirmation vs undo.
- **Quality targets**: performance, accessibility, security and privacy claims with no
  number or no way to test them.
- **External dependencies**: third-party behaviour the spec assumes; regional or
  platform differences.
- **Consistency**: terms used two ways; ACs or FRs that contradict each other.
- **Assumptions**: defaults the spec chose that a user might reasonably veto. Skip any
  already marked as chosen or confirmed by the user.

## 2. Pick the questions

- Rank gaps by impact × uncertainty: an answer that changes scope, data, a screen, the
  architecture or a test beats a wording nit.
- Keep at most **5**. A gap with a safe default is not a question — record the default
  under `Assumptions` instead.
- Each question is multiple choice (2–4 options, recommended first, each with its
  consequence in one line) or a short answer. The user can always answer "Other".
- Nothing worth asking → say so in one line, change nothing, and go to the report.

## 3. Ask and integrate

Ask through AskUserQuestion: at most 4 questions per call, highest impact first, so 5
questions take two calls. After each call, before asking more:

1. **Write the answer into the normative text**: the story, AC, FR, non-goal or
   assumption it decides. Add new IDs at the end; replace contradicted wording. When an
   answer confirms an assumption, mark it `(confirmed YYYY-MM-DD)` or promote it to an FR
   or AC. The spec stays the single source of truth.
2. **Log it** under `## Clarifications` (create it just above `## Changelog`), one line per
   question: `- YYYY-MM-DD Q: <question> → A: <answer> (<IDs touched>)`.

An answer that opens a bigger gap becomes the next question if one is left; otherwise
list it as outstanding.

## 4. Close

- Self-check as `/sdd-spec` does: every AC testable, no contradiction left, nothing
  contradicts `docs/standards.md`.
- Bump the spec's `rev` once for the run, with a changelog line naming the IDs touched.
  A `done` feature whose behaviour changed goes back to `planned`.
- `design.md` / `plan.md` exist → list the screens and slices that cite touched IDs; the
  next `/sdd-design`, `/sdd-plan` or `/sdd-implement` reconciles them.

## 5. Report

- Questions asked and answered, with the IDs each one changed.
- Coverage, one line per checklist area: clear · resolved · deferred (low impact) ·
  outstanding (needs an answer, over the limit).
- Next step: `/sdd-clarify` again if anything is outstanding; else `/sdd-design` when the
  feature has UI and a design is wanted; else `/sdd-plan`.
