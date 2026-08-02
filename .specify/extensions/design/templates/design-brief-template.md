# UX/UI Design Brief — [FEATURE NAME]

> **GENERATED FILE — do not hand-edit.** Produced by `/speckit-design-brief` from
> `spec.md` at commit-time hash `[SPEC_HASH_SHORT]`. Re-run the command after any
> spec change; edits made here are lost and, worse, silently diverge from the
> requirements they claim to represent.
>
> **Purpose**: this is the payload to paste into the external design tool. That tool
> cannot read this repository, so the brief restates what a designer needs. Every
> restated item carries its source identifier — the spec remains the only authority.

**Feature**: [FEATURE_DIR]
**Spec**: [link to spec.md]
**Design provider**: [provider from design-config.yml]
**Generated**: [ISO DATE]

---

## 1. Product context

[2–4 sentences: what the product is, who uses it, in what circumstances. Derived from
the spec's overview and user scenarios. No requirement text — context only.]

**Platform and constraints that shape the interface**: [platform targets, offline/online,
locale, performance target device, data volume ceiling — each with its source ID.]

## 2. Domain concepts the interface must express

[One row per Key Entity from spec.md. Say what the user perceives, not the data schema.]

| Concept | What the user sees | Source |
|---|---|---|
| [name] | [perception-level description] | Key Entities |

[Call out explicitly any concept where the user's mental model and the data model
diverge — that gap is where interface design usually fails.]

## 3. Screens in scope

[Derive from the spec's user stories and functional requirements. Do not invent screens
the requirements do not imply. Cite the requirement IDs each screen serves.]

| # | Screen | Purpose | Serves |
|---|---|---|---|
| 1 | [name] | [one line] | FR-###, US-# |

## 4. States that must have a design

[Loading, populated, empty, error+retry, permission-denied, saving, validation failure —
whatever the spec and constitution require. This section exists because missing states
are the single most common defect class in shipped screens.]

**Per screen**: [list]
**Per list item / record**: [attributes that can co-occur on one row — this combination
is usually the hardest single problem in the feature]

## 5. Binding constraints — violations are defects, not feedback

[Extracted from `.specify/memory/constitution.md` and the spec's non-functional
requirements. Only constraints a designer can actually act on. Each carries its source.]

- [constraint] — *[Principle N / FR-###]*

## 6. Decisions already made — do not propose alternatives

[From the spec's Clarifications and Assumptions sections. Listing these prevents the
design tool from re-opening settled questions and returning work that cannot be used.]

- **[topic]**: [decision] — *[Clarifications session / Assumption]*

## 7. Out of scope — do not propose

[From the spec's Out of Scope section, condensed.]

## 8. Design system

[If `design_system.package` is configured: name the package and list its real token
vocabulary — color roles, typography steps, spacing scale, radius scale — so the design
comes back expressible in the tokens the app actually has. If unset: state that the
design defines its own token set and must document it.]

## 9. What to produce

Return artifacts matching this structure so they can be imported without rework:

| Artifact | Must contain |
|---|---|
| Design system | Token input values, semantic token table for **every** color scheme, contrast verification, mapping to the token package if one is configured |
| IA, screens, flows | Screen tree, screen inventory with stable IDs, flows with interaction-count budget |
| Wireframes | One per screen in scope, with minimum sizing |
| UX/UI spec | Element anatomy, type scale, state matrix, component specs, interaction notes |
| Open decisions | Every choice made on the designer's own initiative, and every point where this brief conflicts with itself — with a recommendation for each |

**Citation requirement**: every screen and flow must cite the requirement IDs it serves.
Artifacts that restate requirements without citing them cannot be traced and will be
rejected at import.

**Conflict requirement**: if a constraint in section 5 or a decision in section 6 makes
the interface worse, say so in "Open decisions" with the trade-off. Do not silently
design around it — the conflict is signal that the specification needs a change.

---

## Instructions for the human

1. Paste sections 1–9 into [provider].
2. Design and iterate there.
3. Return here and run `/speckit-design-import` — artifacts are pulled back
   automatically for supported providers; no copy-paste, no manual export.
