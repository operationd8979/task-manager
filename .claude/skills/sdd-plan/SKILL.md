---
name: sdd-plan
description: "Create or refine the technical plan for a specified feature: approach, changes, decisions and verifiable slices that track progress. Run after /sdd-spec and the optional /sdd-clarify and /sdd-design; re-run to absorb spec or design changes or feedback."
argument-hint: "[feature id] [feedback]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md`, then resolve the feature. Read its `spec.md`, its
`design.md` if present, and `docs/standards.md` in full — the plan must satisfy it.
`design.md` is stale against the spec (its `spec_rev` behind) → say so; where the two
disagree the spec wins, and suggest `/sdd-design` to catch the design up.
No `plan.md` yet → **Create**; otherwise → **Refine**.

## Create

1. **Ground it in the repo — derive, never assume.**
   - Stack and versions from the manifests and config actually present.
   - Existing modules, patterns and tests to reuse; how the repo runs its checks.
   - A dependency that ships its own agent skill: invoke the skill, do not read its source.
   - For broad exploration use an Explore subagent and keep only its conclusions.
   - `design.md` present → its screens, flows, *For the plan* notes and decisions are
     inputs. Fetch artboards only where a detail changes the plan.
2. **Choose the approach.** Where two viable options differ in cost or risk, pick one and
   record `D-n` with the rejected alternative in one clause. Ask (max 3) only when the
   choice is the user's — product trade-offs, cost, external commitments. A technical
   reason to depart from a design decision → record a plan `D-n` that cites it
   (`design D-n`) and flag it in the report; the user decides whether the design changes.
3. **Write** `plan.md` from `template.md` (next to this file):
   - *Changes* lists files or modules to add or change, grouped by area, with one-line
     intent — enough for a fresh session to start. No code.
   - *Data & interfaces* only when entities, schemas, public APIs, events or storage change;
     then be exact: fields, types, errors.
   - *Standards* names only the rules this feature is at risk of breaking and how the plan
     meets them, plus any deviation with its justification. Never restate rules that are
     trivially met.
   - *Slices*: 2–7 vertical increments, each independently verifiable, ordered by dependency
     then priority. Each names the IDs it covers (UI slices include the `SCR-n` they build)
     and a concrete check (a test to write, a command, a manual step with expected result).
     These are milestones, not tasks — the breakdown into tasks happens during
     implementation.
   - Record `design_rev` as the design's `rev`, or `none` without a design.
4. **Coverage check** before saving: every AC and FR — and, with a design, every `SCR-n` —
   is covered by at least one slice, and every slice covers at least one ID. Fix gaps, do
   not report them.
5. Set spec `status: planned`. **Report**: approach in ≤3 lines, decisions, slices, risks,
   departures from the design. Next: `/sdd-implement`. A UI feature planned without a
   design can still get one with `/sdd-design`; the plan then reconciles to it.

## Refine

1. **Stale inputs** (`spec_rev` or `design_rev` behind, or `design_rev: none` while a
   `design.md` now exists): read the source changelogs since the recorded rev — for a new
   design, the whole design — and update only the affected sections and slices. Untick a
   done slice whose covered IDs or screens changed and note why under *Notes*. Update the
   recorded revs.
2. **Feedback**: apply it in place.
3. Re-run the coverage check. Bump `rev`, add a changelog line, report what moved.
