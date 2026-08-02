---
name: "speckit-design-brief"
description: "Generate a self-contained UX/UI design brief from the feature spec, ready to paste into an external design tool. Use after /speckit-clarify and before designing."
argument-hint: "Optional emphasis for the brief (e.g. 'focus on the list row')"
compatibility: "Requires spec-kit project structure with .specify/ directory and the design extension"
metadata:
  author: "project-local"
  source: ".specify/extensions/design/commands/speckit.design.brief.md"
  extension: "design"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Turn the clarified specification into a **self-contained design brief** that a designer,
or an external design tool with no access to this repository, can act on without asking
follow-up questions — while keeping `spec.md` the single source of truth.

## Operating constraints

- **Write exactly two files**: `<design_dir>/brief.md` and `<design_dir>/manifest.json`.
  Never modify `spec.md`, the constitution, or any existing design artifact.
- **The brief is generated, not authored.** It carries a do-not-edit banner and is
  regenerated whenever the spec changes. It is the one place where restating requirement
  text is correct — because the design tool cannot read the repo — and every restated
  item must carry its source identifier.
- **Never invent requirements.** If the brief needs something the spec does not say,
  that is a gap: list it under "Needs clarification" at the end of the brief and tell the
  user to run `/speckit-clarify` rather than filling it in with a plausible guess.

## Execution steps

### 1. Resolve paths and configuration

Run from the repo root:

```
.specify/scripts/powershell/check-design-prerequisites.ps1 -Json -PathsOnly
```

Parse the JSON for `FEATURE_DIR`, `FEATURE_SPEC`, `DESIGN_DIR`, `DESIGN_BRIEF`,
`DESIGN_MANIFEST`, `DESIGN_CONFIG`.

Read `DESIGN_CONFIG` (`.specify/extensions/design/design-config.yml`). If it is absent,
fall back to `config-template.yml` defaults in the same directory and say so once in the
completion report. Take from it: `source.provider`, `artifacts.directory`,
`design_system.package`, `traceability.*` prefixes.

If `SPEC_CHANGED_SINCE_BRIEF` would apply — i.e. a `brief.md` already exists — state that
you are regenerating it and continue; regeneration is the intended path, not an error.

### 2. Load the specification

Read `FEATURE_SPEC`. Extract, and nothing more:

- Overview / product context
- User scenarios and stories, with their identifiers
- Functional and non-functional requirements, with their identifiers
- Key entities — the user-perceivable meaning, not the field list
- Success criteria that constrain the interface (interaction counts, response budgets,
  frame rates, accessibility targets)
- Edge cases with an interface consequence
- Clarifications and Assumptions — these are settled decisions
- Out of scope

### 3. Load the binding constraints

Read `.specify/memory/constitution.md`. Extract only principles a designer can act on —
navigation depth, interaction budget, state coverage, theming, accessibility,
performance. Skip principles about code structure, typing, and testing; they do not
belong in a design brief and dilute the ones that do.

### 4. Load the design system vocabulary

If `design_system.package` is set in the config:

1. Check for a matching agent skill (typically `.claude/skills/sdk-*`). If one exists,
   **invoke it** rather than reading package source.
2. State in section 8 of the brief the package's real token vocabulary: color role names,
   typography steps, spacing scale, radius scale.
3. Where the package's own defaults are known to disagree with what a design would
   naturally assume, say so — the designer needs to know which values are free and which
   are already fixed.

If the package is unset, section 8 instead instructs the design to define and document
its own token set.

### 5. Compose the brief

Resolve the template `design-brief-template` through the standard template stack
(`.specify/templates/overrides/` → presets → `.specify/extensions/design/templates/` →
`.specify/templates/`) and fill every section.

Rules while filling:

- **Cite every restated item.** `— FR-012`, `— Principle V`, `— Clarifications 2026-08-01`.
- **Screens are derived, not invented.** Every screen in section 3 traces to at least one
  requirement or story. If the requirements imply no screen for something, do not add one.
- **Section 4 must name the hardest combination**: the set of attributes that can appear
  simultaneously on a single element. Identify it from the requirements rather than
  leaving the designer to discover it.
- **Sections 6 and 7 are what make the brief cheap.** A brief without settled decisions
  and out-of-scope items produces work that has to be thrown away.
- Write section 9's citation and conflict requirements verbatim from the template — they
  are what makes `/speckit-design-import` able to trace anything.

If the spec leaves something genuinely undetermined that the designer must know, add a
final section `## Needs clarification` listing each gap as a question. Do not answer them.

### 6. Write the manifest

Write `DESIGN_MANIFEST` as JSON, creating it or updating in place while preserving any
keys written by a previous import:

```json
{
  "schema_version": "1.0",
  "status": "brief",
  "feature_dir": "<relative path>",
  "source": { "provider": "<provider>", "project_id": "", "project_url": "" },
  "spec_hash_at_brief": "<SPEC_HASH from step 1>",
  "brief_generated_at": "<ISO 8601>",
  "artifacts": {}
}
```

`status` moves `brief` → `imported` → `verified` across the three commands. Never lower
an existing status: if a manifest already reads `imported` or `verified`, regenerating the
brief resets it to `brief`, because the design is now known to predate the current spec.

### 7. Report

Report: brief path, screen count, requirement count cited, any "Needs clarification"
entries, and the next command. If gaps were found, recommend `/speckit-clarify` before
designing rather than after.

## Done when

- [ ] `brief.md` written, every section filled, every restated item carries a source ID
- [ ] Every screen in the brief traces to at least one requirement or story
- [ ] `manifest.json` written with `status: brief` and the current spec hash
- [ ] Gaps, if any, reported as questions rather than filled in
- [ ] User told what to paste where, and which command to run on return
