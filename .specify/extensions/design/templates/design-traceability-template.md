# Traceability — requirements ↔ design

> **GENERATED FILE — do not hand-edit.** Produced by `/speckit-design-import` and
> re-verified by `/speckit-design-check`. It exists so the design phase can be audited
> without reading every artifact, and so a requirement added later is visibly uncovered.

**Spec**: [link to spec.md] · **Spec hash at import**: `[SPEC_HASH_SHORT]`
**Generated**: [ISO DATE]

## 1. Requirement coverage

One row per requirement identifier in the spec. `—` in the design column means the
requirement has no interface surface; that is a legitimate answer for storage,
scheduling, and logging requirements, but it must be stated rather than left blank.

| Requirement | Screen(s) | Flow(s) | Artifact section | Notes |
|---|---|---|---|---|
| FR-### | S-## | F-# | [artifact#section] | |

## 2. Screen coverage

One row per screen the design introduces. A screen serving no requirement is scope
creep and must be justified here or removed.

| Screen | Name | Level | Serves | Wireframe | States designed |
|---|---|---|---|---|---|
| S-## | | | FR-###, US-# | [link] | |

## 3. Flow coverage

| Flow | Name | Serves | Interaction count | Within budget? |
|---|---|---|---|---|
| F-# | | US-# | | |

## 4. Uncovered

**Requirements with no design surface and no stated reason**: [list or "none"]
**Screens serving no requirement**: [list or "none"]
**User stories with no flow**: [list or "none"]

## 5. Conflicts between spec and design

Recorded, not resolved. Each conflict must resolve into either a spec amendment or a
design change before planning. See `open-decisions.md` for the recommendation on each.

| ID | Spec says | Design does | Impact | Decision ref |
|---|---|---|---|---|
| C-# | FR-### | | flow / visual / both | D-## |
