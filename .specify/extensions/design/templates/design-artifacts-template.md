# Design artifact structure

Required shape of the artifacts under `<feature>/design/`. `/speckit-design-import`
normalizes imported material into this structure; `/speckit-design-check` validates
against it. The file names come from `design-config.yml → artifacts.required`, so a
project that uses a different design vocabulary changes the config, not the skills.

**Two rules apply to every artifact:**

1. **Cite, never copy.** Requirement text lives in `spec.md`. Design artifacts reference
   `FR-###` / `US-#` / `SC-###`. An artifact that restates a requirement creates a second
   copy that will silently drift.
2. **Record conflicts, never resolve them silently.** Where the design departs from the
   spec or the constitution, the departure belongs in `decisions.md` with a
   recommendation — not applied quietly and not dropped.

---

## `design-system.md`

- Token input values (the small set everything else derives from) with the role of each.
- Semantic token table for **every** color scheme the product supports, with measured
  contrast ratios against the surface each token sits on, and a pass/fail per row.
- Where a token package is configured: the mapping from design token to package token,
  every value the package would produce that the design overrides, and every design
  token the package has no slot for, with the mechanism for supplying it.
- Non-color tokens: type scale, spacing scale, radius, elevation.
- Setup code sufficient to wire the tokens once, so no downstream screen invents values.

## `ia-screens-flows.md`

- Screen tree with navigation depth visible.
- IA principles, each with the reason it was chosen — the reason is what stops the next
  person from undoing it.
- Domain concepts as the interface must express them, and where the user's mental model
  diverges from the data model.
- Screen inventory: stable ID, name, presentation form, depth, entry point, primary
  action, required states, **requirements served**.
- Flows: step sequence, interaction count against the budget, and a note on any flow
  that exceeds it explaining why the extra step is deliberate.

## `wireframes.md`

- One wireframe per screen in scope, at a stated reference viewport.
- Minimum sizing per region, with the note that content determines final size.
- A caption per wireframe naming the single thing that wireframe gets right — this is
  what survives into implementation review.

## `ux-ui-spec.md`

- Element anatomy: for each attribute an element must convey, the carrier — shape, text,
  and colour as a *redundant* third channel, never the only one.
- Type scale and interaction metrics as a table of values, not prose.
- **State matrix**: one row per (level, state) pair, with appearance and exit action.
  Levels are typically screen, list item, and form.
- Component specs: one block per reusable component, listing its touch regions,
  accessibility labels, and the patterns explicitly rejected with reasons.
- Interaction notes: gestures, non-gesture equivalents for every gesture, motion budget,
  haptics, performance rules, and content/voice rules.

## `decisions.md`

Every entry uses the same shape, because the point of the file is to be decidable:

```
## D-## · [question in one line]

[Whether this conflicts with the spec/constitution, and where.]

| Option | Consequence |
|---|---|
| A — [name] (recommended) | [what it costs and buys] |
| B — [name] | [what it costs and buys] |

**Recommendation: [A]**, because [one sentence].
[If chosen, what else must change — spec amendment, task ordering, etc.]
```

Order entries by blast radius: decisions that change a user flow first, decisions that
change only appearance last. Flag which ones must be settled before planning and which
can wait for implementation.

## `brief.md`, `traceability.md`, `manifest.json`

Generated. See the brief and traceability templates; `manifest.json` is written by the
import skill and is the provenance record — source project, per-artifact hashes, and the
spec hash at import time, which is how staleness is detected later.
