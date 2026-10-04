---
name: sdd-plan
description: "Create or refine the technical plan for a specified feature: approach, changes, decisions and verifiable slices that track progress. Run after /sdd-spec; re-run to absorb spec or design changes or feedback."
argument-hint: "[feature id] [feedback]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md`, then resolve the feature. Read its `spec.md`, its
`design.md` if present, and `docs/standards.md` in full — the plan must satisfy it.
No `plan.md` yet → **Create**; otherwise → **Refine**.

## Create

1. **Ground it in the repo — derive, never assume.**
   - Stack and versions from the manifests and config actually present.
   - Existing modules, patterns and tests to reuse; how the repo runs its checks.
   - A dependency that ships its own agent skill: invoke the skill, do not read its source.
   - For broad exploration use an Explore subagent and keep only its conclusions.
2. **Choose the approach.** Where two viable options differ in cost or risk, pick one and
   record `D-n` with the rejected alternative in one clause. Ask (max 3) only when the
   choice is the user's — product trade-offs, cost, external commitments.
3. **Write** `plan.md` from `template.md` (next to this file):
   - *Changes* lists files or modules to add or change, grouped by area, with one-line
     intent — enough for a fresh session to start. No code.
   - *Data & interfaces* only when entities, schemas, public APIs, events or storage change;
     then be exact: fields, types, errors.
   - *Standards* names only the rules this feature is at risk of breaking and how the plan
     meets them, plus any deviation with its justification. Never restate rules that are
     trivially met.
   - *Slices*: 2–7 vertical increments, each independently verifiable, ordered by dependency
     then priority. Each names the IDs it covers and a concrete check (a test to write, a
     command, a manual step with expected result). These are milestones, not tasks — the
     breakdown into tasks happens during implementation.
4. **Coverage check** before saving: every AC and FR is covered by at least one slice, and
   every slice covers at least one ID. Fix gaps, do not report them.
5. Set spec `status: planned`. **Report**: approach in ≤3 lines, decisions, slices, risks.
   Next: `/sdd-design` if the feature has UI and the user wants a design, else
   `/sdd-implement`.

## Refine

1. **Stale inputs** (`spec_rev` or `design_rev` behind): read the source changelogs since
   the recorded rev; update only the affected sections and slices. Untick a done slice whose
   covered IDs changed and note why under *Notes*. Update the recorded revs.
2. **Feedback**: apply it in place.
3. Re-run the coverage check. Bump `rev`, add a changelog line, report what moved.
