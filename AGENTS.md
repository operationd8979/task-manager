<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
<!-- SPECKIT END -->

# Project context

A React Native application. **Derive the stack from `package.json` and `tsconfig.json`
rather than assuming versions** — nothing in this file is version-pinned, deliberately,
so it stays correct as the app upgrades.

If those files do not exist yet, this repository is still the un-initialised boilerplate:
the agent/spec system is present but the application has not been created. See `README.md`
for the bootstrap steps before planning any feature.

Binding engineering rules live in `.specify/memory/constitution.md`; read it before
planning a feature, not before every edit.

# SDK packages (@chipmobilesdk/*)

This app consumes first-party SDK packages that **ship their own agent skill**,
versioned with the package. After `npm install`, `scripts/sync-sdk-skills.mjs` copies
them into `.claude/skills/sdk-*/` and stamps the installed version into each one.

`@chipmobilesdk` is the default scope and needs no configuration. A project that also
consumes skill-bearing packages from another org overrides this in `package.json` under
`agentSkills.scopes`; check there before assuming the default applies.

## Rules

1. **Do not read package source in `node_modules` to learn an API.** Invoke the
   package's skill instead — it is the maintained entry point and it matches the
   installed version.
2. **Load on demand, never in bulk.** The skill list already carries one description
   line per package; that is all that belongs in context by default. Pull the full
   skill body only when actually working with that package.
3. **Never edit files under `.claude/skills/sdk-*/`.** They are generated and are
   overwritten on every install. Fix the source in the package repo, publish, reinstall.
4. **Trust the stamped version.** Each synced `SKILL.md` carries
   `metadata.packageVersion`. If it disagrees with `node_modules/<pkg>/package.json`,
   re-run `npm run sync:skills` before relying on the content.
5. **Deep detail lives in the installed README.** A skill body links to sections of
   `node_modules/@chipmobilesdk/<pkg>/README.md`. Read that section, not the whole file.

## Progressive disclosure

| Layer | Cost | Loaded |
|---|---|---|
| This file | ~40 lines | always |
| Skill `description` (frontmatter) | 1 line per package | always |
| Skill body (`SKILL.md`) | ~60 lines | on invoke |
| `references/*.md` in the skill | varies | only if the body says to |
| Installed `README.md` | up to 700 lines | only the section a skill points to |

Adding a package therefore costs one line of always-on context, not a document.

## Commands

- `node scripts/bootstrap-agent-system.mjs` — one-time wiring after the app is created
- `npm run sync:skills` — re-sync SDK skills (also runs automatically on `postinstall`)
- `cat .claude/skills/sdk-manifest.json` — which skills are installed, at which versions
