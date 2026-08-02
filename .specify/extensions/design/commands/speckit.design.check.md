---
name: "speckit-design-check"
description: "Read-only consistency gate across spec, design artifacts, and constitution before technical planning. Use before /speckit-plan, and re-run after resolving findings."
argument-hint: "Optional focus areas for the check"
compatibility: "Requires spec-kit project structure with .specify/ directory and the design extension"
metadata:
  author: "project-local"
  source: ".specify/extensions/design/commands/speckit.design.check.md"
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

Decide one question: **is the design ready to be planned against?** Report what blocks
that, ranked, with the specific fix for each.

This is the design-phase counterpart to `/speckit-analyze`, which runs later and requires
`tasks.md`. Running that command here is not possible and not a substitute.

## Operating constraints

- **Strictly read-only.** Modify nothing. Offer remediation; apply it only if the user
  asks in a subsequent turn.
- **Constitution is non-negotiable** within this scope. A conflict with a MUST principle
  is CRITICAL and is resolved by changing the spec or the design, never by reinterpreting
  the principle. Changing a principle is a separate, explicit act.
- **Report absence accurately.** If a section is missing, say it is missing. Never infer
  that an undocumented state was probably designed.
- **Idempotent.** Re-running without changes produces the same finding IDs and counts.

## Execution steps

### 1. Load state

Run from the repo root:

```
.specify/scripts/powershell/check-design-prerequisites.ps1 -Json -RequireArtifacts
```

If it exits non-zero, report the missing prerequisite and stop — the fix is
`/speckit-design-brief` then `/speckit-design-import`, not a partial check.

Parse `SPEC_HASH`, `DESIGN_STATUS`, `SPEC_CHANGED_SINCE_IMPORT`, `ARTIFACTS_PRESENT`,
`ARTIFACTS_MODIFIED`, `ARTIFACTS_MISSING`, `TRACEABILITY_EXISTS`.

Read `design-config.yml` for `artifacts.required`, `validation.strictness`,
`validation.gates`, `traceability.*`, `design_system.package`.

### 2. Load artifacts progressively

Load only what each pass needs. From `spec.md`, take identifiers and their one-line
statements — not full text. From the design artifacts, take the traceability matrix, the
state matrix, the screen inventory, and the token tables. From the constitution, take the
MUST statements matching `validation.gates`.

### 3. Detection passes

Run every pass. Each finding records: category, severity, location, what is wrong, and
the concrete fix.

**A. Staleness** — `SPEC_CHANGED_SINCE_IMPORT` is `true`; `ARTIFACTS_MODIFIED` non-empty
(imported artifact hand-edited, so the manifest no longer describes it);
`ARTIFACTS_MISSING` non-empty; `DESIGN_STATUS` is not `imported` or `verified`.
Staleness is CRITICAL: planning against a design that answers an older spec produces
tasks for requirements that changed.

**B. Structural completeness** — every file in `artifacts.required` present; each
containing the sections the artifact template requires; `traceability.md` present.

**C. Requirement coverage** — every requirement identifier in `spec.md` appears in the
traceability matrix, with either a design surface or a stated reason for having none.
Every success criterion that constrains the interface (interaction counts, response
budgets, frame rates, accessibility targets) is reflected in a metric the design commits
to. A requirement silently absent from the matrix is CRITICAL; a requirement present with
`—` and a reason is fine.

**D. Reverse coverage** — every screen and flow serves at least one requirement. Screens
serving nothing are scope creep: they become tasks nobody asked for.

**E. State coverage** — for each screen, the states the spec and constitution demand each
have a designed appearance and an exit action. Check the async set explicitly: loading,
populated, empty, error with retry, and confirmation after a successful mutation. Missing
error-with-retry and missing empty are the two that reliably reach production.

**F. Constitution gates** — one pass per entry in `validation.gates`. For each, find the
evidence in the artifacts, and record its absence when there is none:

| Gate | Evidence to find |
|---|---|
| `both_color_schemes_complete` | A token table per color scheme, with values, not a note saying dark mode is derived |
| `no_state_conveyed_by_color_alone` | Element anatomy showing a shape or text carrier for every attribute |
| `minimum_touch_target` | A stated minimum, and per-component touch regions that meet it |
| `text_scaling_tolerated` | A stated scaling ceiling and layout behaviour at that ceiling |
| `navigation_depth_limit` | A screen tree whose depth is countable and within the limit |
| `primary_action_visible_without_scroll` | Primary action pinned in the wireframe of every screen that has one |
| `all_async_states_designed` | Pass E's result |

Contrast claims are verifiable: where the design states a ratio, verify a sample of them
rather than trusting the table. A wrong contrast number that passes review becomes an
accessibility defect that ships.

**G. Token expressibility** — when `design_system.package` is configured: every design
token maps to a package token, is an explicit override of one, or has a documented
mechanism for tokens the package cannot hold. A design token with no home is HIGH: it
becomes a hardcoded value in a component during implementation.

**H. Unresolved decisions** — every `D-##` in `open-decisions.md` is either resolved, or
explicitly deferred with the deferral recorded. Decisions that change a user flow and are
still open are CRITICAL — planning cannot order tasks around an undecided flow. Decisions
that change only appearance are MEDIUM and may be deferred to implementation.

**I. Duplication** — requirement text copied into a design artifact instead of cited.
Report the location and the identifier it should cite.

### 4. Severity

- **CRITICAL** — constitution MUST violated; requirement with no design surface and no
  stated reason; stale design; unresolved decision that changes a flow.
- **HIGH** — conflicting spec and design with no recorded decision; unmapped screen;
  missing state with user-visible consequence; design token with no home.
- **MEDIUM** — terminology drift between spec and design; missing non-blocking state;
  unresolved appearance-only decision.
- **LOW** — wording, ordering, formatting.

### 5. Report

```
## Design Readiness Report

**Verdict**: READY / BLOCKED — <n> critical, <n> high

| ID | Category | Severity | Location | Finding | Fix |
|----|----------|----------|----------|---------|-----|

**Coverage**
| Metric | Value |
|---|---|
| Requirements with a design surface | n/m (p%) |
| Requirements explicitly out of interface scope | n |
| Screens serving no requirement | n |
| Screens with a complete state set | n/m |
| Constitution gates passed | n/m |
| Open decisions blocking planning | n |

**Constitution gate results** — one line per gate, pass/fail with the evidence or its absence.

**Next actions** — ranked, each naming the file to change and the command to run.
```

Apply `validation.strictness`: `lenient` never blocks; `standard` blocks on CRITICAL;
`strict` blocks on CRITICAL or HIGH. State which mode produced the verdict.

Cap the findings table at 50 rows and summarize any overflow by category.

### 6. Offer remediation

Ask whether to draft concrete fixes for the top findings. Do not apply them in this run.
Where the fix is a spec amendment, say so plainly — the design phase surfaces the need,
the user decides.

### 7. On a clean result

When the verdict is READY, tell the user they may run `/speckit-plan`, and note that
`manifest.json` status can be advanced to `verified` on request — that write is the one
exception to read-only, and only with explicit consent.

## Done when

- [ ] Every detection pass A–I run, including the ones with no findings
- [ ] Verdict stated with the strictness mode that produced it
- [ ] Coverage table and per-gate results reported
- [ ] Next actions ranked, each naming a file and a command
- [ ] Nothing modified
