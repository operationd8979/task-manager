#!/usr/bin/env node
/**
 * Sync agent skills shipped by installed npm packages into .claude/skills/.
 *
 * Why this exists: agent harnesses discover skills in .claude/skills/ only —
 * they do not scan node_modules. This script bridges that gap after npm install,
 * so an installed package's skill is available without vendoring its docs.
 *
 * Scope: defaults to @chipmobilesdk, so a fork works with no configuration. Override
 * only if a project consumes skill-bearing packages from another org:
 *   {
 *     "agentSkills": { "scopes": ["@chipmobilesdk", "@other-org"] }
 *   }
 * An explicit empty list disables the sync.
 *
 * Contract with packages:
 *   <package>/skills/sdk-<name>/SKILL.md   (+ optional references/)
 *   "skills" must be listed in the package's package.json "files" array.
 *
 * Guarantees:
 *   - Skill frontmatter is stamped with the INSTALLED package version, so a stale
 *     skill can never silently describe a different version than what is on disk.
 *   - Skills removed or renamed upstream are pruned from .claude/skills/.
 *   - Never fails the install: soft errors warn and exit 0.
 */

import {readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync} from 'node:fs';
import {join, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SCOPES = ['@chipmobilesdk'];
const SKILL_PREFIX = 'sdk-';
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const MANIFEST = join(SKILLS_DIR, `${SKILL_PREFIX}manifest.json`);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Recursively copy a directory. */
function copyDir(src, dest) {
  mkdirSync(dest, {recursive: true});
  for (const entry of readdirSync(src, {withFileTypes: true})) {
    const from = join(src, entry.name);
    const to = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else if (entry.isFile()) {
      writeFileSync(to, readFileSync(from));
    }
  }
}

/**
 * Stamp the installed package version into the skill's YAML frontmatter so the
 * agent always sees the version it is actually running against.
 */
function stampVersion(markdown, packageName, version) {
  if (!markdown.startsWith('---')) {
    return markdown;
  }
  const end = markdown.indexOf('\n---', 3);
  if (end === -1) {
    return markdown;
  }
  let front = markdown.slice(0, end);
  const body = markdown.slice(end);

  const stamped = `  package: "${packageName}"\n  packageVersion: "${version}"`;
  const hasPackageLine = /^ {2}package:.*$/m.test(front);
  const hasVersionLine = /^ {2}packageVersion:.*$/m.test(front);

  if (hasPackageLine && hasVersionLine) {
    front = front
      .replace(/^ {2}package:.*$/m, `  package: "${packageName}"`)
      .replace(/^ {2}packageVersion:.*$/m, `  packageVersion: "${version}"`);
  } else if (/^metadata:\s*$/m.test(front)) {
    front = front.replace(/^metadata:\s*$/m, `metadata:\n${stamped}`);
  } else {
    front = `${front}\nmetadata:\n${stamped}`;
  }
  return front + body;
}

/** Scopes to scan: DEFAULT_SCOPES unless package.json overrides via "agentSkills.scopes". */
function configuredScopes() {
  const pkg = readJson(join(ROOT, 'package.json'));
  if (!pkg) {
    return {scopes: [], reason: 'no package.json yet — create the app first (see README)'};
  }

  const override = pkg.agentSkills?.scopes;
  if (override === undefined) {
    return {scopes: DEFAULT_SCOPES, reason: null};
  }
  if (!Array.isArray(override)) {
    console.warn('[sdk-skills] "agentSkills.scopes" must be an array; using defaults');
    return {scopes: DEFAULT_SCOPES, reason: null};
  }
  if (override.length === 0) {
    return {scopes: [], reason: '"agentSkills.scopes" is empty — sync disabled for this project'};
  }

  const valid = override.filter(s => typeof s === 'string' && s.startsWith('@'));
  if (valid.length !== override.length) {
    console.warn('[sdk-skills] ignoring non-scope entries in agentSkills.scopes (must start with "@")');
  }
  return {scopes: valid, reason: null};
}

function findPackagesInScope(scope) {
  const scopeDir = join(ROOT, 'node_modules', scope);
  if (!existsSync(scopeDir)) {
    return [];
  }
  return readdirSync(scopeDir, {withFileTypes: true})
    .filter(e => e.isDirectory() || e.isSymbolicLink())
    .map(e => join(scopeDir, e.name))
    .filter(dir => existsSync(join(dir, 'package.json')));
}

/** Why this skill directory cannot be synced, or null if it is usable. */
function rejectReason(srcSkill, name, alreadyClaimed) {
  if (!existsSync(join(srcSkill, 'SKILL.md'))) {
    return 'no SKILL.md';
  }
  if (!name.startsWith(SKILL_PREFIX)) {
    return `name must start with "${SKILL_PREFIX}"`;
  }
  if (alreadyClaimed) {
    return `name already claimed by ${alreadyClaimed.package}`;
  }
  return null;
}

/** Copy one skill into .claude/skills/ and stamp it with the installed version. */
function installSkill(srcSkill, name, pkg) {
  const destSkill = join(SKILLS_DIR, name);
  rmSync(destSkill, {recursive: true, force: true});
  copyDir(srcSkill, destSkill);

  const destManifest = join(destSkill, 'SKILL.md');
  writeFileSync(
    destManifest,
    stampVersion(readFileSync(destManifest, 'utf8'), pkg.name, pkg.version),
  );
  return {skill: name, package: pkg.name, version: pkg.version};
}

/** Sync every skill shipped by one installed package. */
function syncPackage(pkgDir, synced, skipped) {
  const pkg = readJson(join(pkgDir, 'package.json'));
  const skillsRoot = join(pkgDir, 'skills');
  if (!pkg || !existsSync(skillsRoot)) {
    return;
  }

  for (const entry of readdirSync(skillsRoot, {withFileTypes: true})) {
    if (!entry.isDirectory()) {
      continue;
    }
    const srcSkill = join(skillsRoot, entry.name);
    const reason = rejectReason(srcSkill, entry.name, synced.find(s => s.skill === entry.name));
    if (reason) {
      skipped.push(`${pkg.name} → ${entry.name} (${reason})`);
    } else {
      synced.push(installSkill(srcSkill, entry.name, pkg));
    }
  }
}

/** Remove synced skills whose package is no longer installed. */
function pruneStale(keep, skipped) {
  if (!existsSync(SKILLS_DIR)) {
    return;
  }
  for (const entry of readdirSync(SKILLS_DIR, {withFileTypes: true})) {
    if (entry.isDirectory() && entry.name.startsWith(SKILL_PREFIX) && !keep.has(entry.name)) {
      rmSync(join(SKILLS_DIR, entry.name), {recursive: true, force: true});
      skipped.push(`pruned ${entry.name} (package no longer installed)`);
    }
  }
}

function report(scopes, synced, skipped) {
  const label = relative(ROOT, SKILLS_DIR).replace(/\\/g, '/');
  if (synced.length === 0) {
    console.log(`[sdk-skills] no skills found in ${scopes.join(', ')}; ${label} unchanged`);
  } else {
    console.log(`[sdk-skills] synced ${synced.length} skill(s) into ${label}:`);
    for (const s of synced) {
      console.log(`  ${s.skill}  ←  ${s.package}@${s.version}`);
    }
  }
  for (const note of skipped) {
    console.log(`[sdk-skills] skip: ${note}`);
  }
}

function main() {
  const {scopes, reason} = configuredScopes();
  if (scopes.length === 0) {
    console.log(`[sdk-skills] skipped: ${reason}`);
    return;
  }

  const synced = [];
  const skipped = [];
  for (const scope of scopes) {
    for (const pkgDir of findPackagesInScope(scope)) {
      syncPackage(pkgDir, synced, skipped);
    }
  }

  pruneStale(new Set(synced.map(s => s.skill)), skipped);

  mkdirSync(SKILLS_DIR, {recursive: true});
  writeFileSync(
    MANIFEST,
    JSON.stringify({generatedAt: new Date().toISOString(), scopes, skills: synced}, null, 2) + '\n',
  );
  report(scopes, synced, skipped);
}

try {
  main();
} catch (error) {
  console.warn(`[sdk-skills] sync skipped: ${error.message}`);
}
