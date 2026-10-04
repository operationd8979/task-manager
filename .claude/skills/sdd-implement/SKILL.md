---
name: sdd-implement
description: "Implement a planned feature slice by slice, keeping the plan current, verifying each slice, and finishing with acceptance-criterion evidence. Also handles follow-up fixes and refinements of an implemented feature."
argument-hint: "[feature id] [SL-n | change or fix to make]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md`, resolve the feature, then read `plan.md` (your working
document), `spec.md`, `design.md` if present, and `docs/standards.md`.

## Preflight

1. No `plan.md` → stop and suggest `/sdd-plan`.
2. Plan stale (`spec_rev` or `design_rev` behind) → reconcile the plan first, using the
   `/sdd-plan` refine rules. Tell the user what moved in 1–3 lines. Ask only if scope changes.
3. Scope of this run:
   - `SL-n` → that slice.
   - A described change or fix → handle it inside the spec. If it changes behaviour, update
     the spec first (with the user's OK) and then the plan.
   - Nothing → every unticked slice, in order.
4. Set spec `status: building`.

## Per slice

1. **Break it down** with the task list tool and keep that list current as you learn — it is
   the fine-grained plan; `plan.md` keeps only milestones.
2. **Load just in time**:
   - the files named under *Changes* and the ACs this slice covers;
   - for UI, the screen's artboards from the canvas (Artifact `read` with `path`);
   - a library's agent skill when you touch that library.
   Artboards are a reference, not code to copy. Rebuild them in the project's UI technology
   with its tokens, and never hard-code a value a token provides.
3. **Build** following `docs/standards.md` and the repo's existing patterns. Where the
   project has tests, cover the slice's ACs — test first when the AC is precise.
4. **Verify**: the slice's own check plus the fast checks from `docs/standards.md`
   (`## Verification`) or the repo. Fix until green. A red slice is never ticked.
5. **Update `plan.md`**: tick the slice. If reality diverged — new file, split or reordered
   slice, different approach — edit the plan in place and add one line under *Notes*. Bump
   the plan's `rev` only when the approach changed.

Continue to the next slice unless blocked. Stop and ask when:
- a requirement proves wrong or impossible;
- the scope would grow;
- a step is destructive or irreversible;
- a decision belongs to the user.

## Finish (all slices ticked)

1. Run the full checks. All must pass, or report the failures verbatim — never paraphrase a
   red result as done.
2. **AC evidence**: under *Verification → Evidence* in `plan.md`, one line per AC naming the
   test or the check performed and its result. An AC without evidence means the feature is
   not done — say which.
3. **Standards review** of the whole diff against `docs/standards.md` — fix violations, list
   judgment calls.
4. Only when 1–3 hold, set spec `status: done`.
5. **Report**: files changed, the evidence summary, deviations from plan, follow-ups.
   Do not commit unless the user asks.
