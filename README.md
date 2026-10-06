# React Native agent & spec boilerplate

A fork-and-go starting point for React Native apps developed with coding agents.

**This repository contains the agent/specification system only — there is no application
in it.** You fork it, create the app inside, then wire the two together. Keeping the app
out means the boilerplate never carries a stale React Native version.

## What you get

| Layer | Location | Holds |
|---|---|---|
| Engineering standards | `docs/standards.md` | Binding rules every feature must satisfy, plus verification commands and design targets. The only project-specific part of the workflow. |
| Agent routing | `AGENTS.md` | How an agent navigates this repo and loads context. Deliberately small — it is always in context. |
| Spec-driven workflow | `.claude/skills/sdd-*`, `.claude/sdd/` | `/sdd-spec` → `/sdd-plan` → `/sdd-design` → `/sdd-implement`, plus `/sdd-design-build-system`. Generic — no language, OS or project type baked in. |
| Package knowledge | `.claude/skills/sdk-*/` | Skills shipped by installed SDK packages, synced on `npm install` and versioned with each package. Generated — never edited by hand. |

Nothing is pinned to a dependency version. Agents derive the stack from `package.json`
and `tsconfig.json`.

## Bootstrap a new app

**1. Fork or clone, then create the application in place.**

```sh
npx @react-native-community/cli@latest init MyApp --directory . --skip-git-init
```

Any generator works — the agent system does not care how the app was created.

**2. Check `.gitignore` survived.**

The RN CLI writes its own `.gitignore`. If it overwrote this one, re-add the two blocks
marked `BOILERPLATE` (secrets, and generated agent skills). Losing them means committing
`.env` or generated skills.

**3. Wire the agent system into the new `package.json`.**

```sh
node scripts/bootstrap-agent-system.mjs
```

This adds the `sync:skills` and `postinstall` scripts. It is idempotent and refuses to
clobber an existing `postinstall`.

The `@chipmobilesdk` scope is the built-in default, so nothing else is needed. Pass extra
scopes only if the project also consumes skill-bearing packages from another org — those
get recorded in `agentSkills.scopes`:

```sh
node scripts/bootstrap-agent-system.mjs @other-org
```

**4. Adapt `docs/standards.md` to the project.**

It ships generic mobile standards. Review the rules, confirm the `## Verification` commands
against the new `package.json`, and note the capabilities bare React Native lacks but the
rules require (navigation, secure storage).

**5. Build the design system (optional, UI only).**

```
/sdd-design-build-system
```

Builds a Claude Design system from the theming source named in `docs/standards.md` and
records its link there, so every feature's design uses the same tokens. Re-run it after the
theme changes.

**6. Start the first feature.**

```
/sdd-spec <what to build>  →  /sdd-plan  →  /sdd-design (optional)  →  /sdd-implement
```

## Commands

```sh
node scripts/bootstrap-agent-system.mjs   # one-time wiring (step 3)
npm run sync:skills                      # re-sync SDK package skills
cat .claude/skills/sdk-manifest.json     # which skills, which versions
```

## Spec-driven workflow

| Command | Writes | Re-run to |
|---|---|---|
| `/sdd-spec <description>` | `specs/NNN-slug/spec.md` — stories, acceptance criteria, requirements | refine scope with feedback |
| `/sdd-plan` | `plan.md` — approach, changes, decisions, 2–7 verifiable slices | absorb spec/design changes |
| `/sdd-design` | Claude Design canvas + `design.md` screen map (UI only, optional) | apply canvas comments and edits |
| `/sdd-implement [SL-n \| fix]` | code; ticks slices; AC evidence in `plan.md` | continue, or fix and refine |
| `/sdd-design-build-system [source]` | Claude Design system; its link in `docs/standards.md` | re-sync after theme changes |

There is no task list file and no branch step. The plan holds milestones (slices); Claude
breaks each slice into tasks while implementing and keeps the plan current. Each doc
carries a `rev`, and later docs record the rev they were built from. A changed spec is
therefore detected downstream and reconciled in place, not regenerated. Shared rules:
`.claude/sdd/conventions.md`.

The design step needs a Claude Code session signed in to claude.ai, because canvases are
Claude Design artifacts. Without one, `/sdd-design` writes a text-only `design.md`. Skipping
design never blocks implementation.

### Reusing the workflow in another repository

Copy `.claude/skills/sdd-*/` and `.claude/sdd/`, then create `docs/standards.md` from
`.claude/sdd/standards-template.md` for that project (web app, API, library…). Delete its
`## Design` section if the project has no UI. Nothing else is project-specific.

## How package skills work

An SDK package ships `skills/sdk-<name>/SKILL.md` and lists `"skills"` in its
`package.json` `files` array. On install, `scripts/sync-sdk-skills.mjs` copies each skill
into `.claude/skills/`, stamps it with the **installed** version, and prunes skills whose
package was removed.

The point is context economy: only one description line per package stays loaded, and the
skill body loads when an agent actually invokes it. Skill bodies link into the installed
`README.md` rather than duplicating it, so they cannot drift from the package.

## Updating the boilerplate

Projects forked from here do not track this repository. To pull improvements, cherry-pick
`.claude/skills/sdd-*/`, `.claude/sdd/`, `AGENTS.md`, and `scripts/`. Never cherry-pick
`package.json` or `docs/standards.md`, which are project-specific.
