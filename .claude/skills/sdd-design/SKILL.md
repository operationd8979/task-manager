---
name: sdd-design
description: "Optional UI design step: draws the feature's screens and states on a Claude Design canvas using the project's design system, iterates on canvas comments and edits, and records a screen map for implementation. Skip it freely — /sdd-implement does not require it."
argument-hint: "[feature id] [feedback | claude.ai canvas URL to import]"
---

## Input

```text
$ARGUMENTS
```

Read `.claude/sdd/conventions.md`, resolve the feature, and read its `spec.md`, `plan.md` if
present (screens and components it already implies), and the `## Design` section of
`docs/standards.md` (targets, theming source, design system, required states).

The feature has no user interface → say so and stop. Mode: no `design.md` → **Create** (or
**Import** if the argument is a claude.ai canvas link); `design.md` exists → **Revise**.

## Design system — never hard-coded here

1. `## Design` records a design system link → use that one.
2. None recorded but a theming source is named → use its exact token values as the canvas's
   look (learn them through the library's agent skill if it has one, else from the source).
   Recommend `/sdd-design-build-system` once, so every feature's canvas shares one system.
3. Neither → let the Design type choose as its own instructions say, and report that the
   look is provisional.

## Create

1. **Screen inventory first.** Derive screens from the stories (and the plan if present).
   Each `SCR-n` serves at least one US/AC; draw no screen nobody asked for.
2. **Canvas.** Call the Artifact tool with `action: "quickstart"` and `intent: "design"`.
   Create the canvas from the Design type it returns, titled `<NNN> <Feature name>`, and
   follow the type's instructions for the file format — they are authoritative. One canvas
   per feature: later runs revise it, never create a second.
3. **What to draw.**
   - One artboard per screen at the target size from `## Design`.
   - Plus the states that the ACs or the standards' required states call for — error, empty
     and loading when the screen has them. Lay out one row per screen.
   - Appearance modes from Targets: prefer design-system tokens so the canvas's theme switch
     covers them. Draw separate variants only where tokens cannot.
   - Use real copy from the spec; unknown data becomes `[PLACEHOLDER]`, never lorem ipsum.
   - Don't render or screenshot to check your work unless the user asks.
4. **Record** `design.md` from `template.md` (next to this file). Name each screen's
   artboard files so implementation can fetch them.
5. **Conflicts** with the spec or standards: never edit the spec. Record them as `D-n` with a
   recommendation and surface them in the report — the user decides through `/sdd-spec`.
6. **Report**: canvas link, screens × states drawn, stories with no screen, conflicts.
   Invite comments or direct edits on the canvas, then a re-run of `/sdd-design`.

## Import

The argument is a canvas link the user made → read its `project/canvas.json` and artboards.
Map artboards to `SCR-n` and the US/AC they serve; mark anything unmappable `?` rather than
guessing. Write `design.md` and report gaps in both directions.

## Revise

1. Gather the changes:
   - the argument;
   - open comment threads on the canvas (ArtifactComments tool — load it if it is deferred);
   - artboards the user edited directly — re-read them, never overwrite their edits;
   - spec changes since `spec_rev`.
2. Revise the canvas per the Design type's revising rules, changing only what was asked.
   Reply on each comment thread you resolved.
3. Update `design.md`: screens, `spec_rev`, `rev`, changelog. If `plan.md` exists, its
   `design_rev` is now stale — the next `/sdd-plan` or `/sdd-implement` reconciles it.

## Without the Artifact tool

The session is not signed in to claude.ai, or the tool is unavailable → write `design.md`
with a text description per screen: layout regions, primary action, states. Say that no
canvas was made.
