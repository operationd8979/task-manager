#!/usr/bin/env node
/**
 * Sync agent skills shipped by @chipmobilesdk/* packages into .claude/skills/.
 *
 * Why this exists: agent harnesses discover skills in .claude/skills/ only —
 * they do not scan node_modules. This script bridges that gap after npm install,
 * so an installed package's skill is available without vendoring its docs.
 *
 * Contract with packages:
 *   <package>/skills/<skill-name>/SKILL.md   (+ optional references/, scripts/)
 *   "skills" must be listed in the package's package.json "files" array.
 *
 * Guarantees:
 *   - Skill frontmatter is stamped with the INSTALLED package version, so a stale
 *     skill can never silently describe a different version than what is on disk.
 *   - Skills removed or renamed upstream are pruned from .claude/skills/.
 *   - Never fails the install: soft errors warn and exit 0.
 */

import {readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync} from 'node:fs';
import {join, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCOPE = '@chipmobilesdk';
const SKILL_PREFIX = 'sdk-';
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const MANIFEST = join(SKILLS_DIR, `${SKILL_PREFIX}manifest.json`);

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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function findScopedPackages() {
  const scopeDir = join(ROOT, 'node_modules', SCOPE);
  if (!existsSync(scopeDir)) {
    return [];
  }
  return readdirSync(scopeDir, {withFileTypes: true})
    .filter(e => e.isDirectory() || e.isSymbolicLink())
    .map(e => join(scopeDir, e.name))
    .filter(dir => existsSync(join(dir, 'package.json')));
}

function main() {
  const synced = [];
  const skipped = [];

  for (const pkgDir of findScopedPackages()) {
    const pkg = readJson(join(pkgDir, 'package.json'));
    if (!pkg) {
      continue;
    }
    const skillsRoot = join(pkgDir, 'skills');
    if (!existsSync(skillsRoot)) {
      skipped.push(`${pkg.name}@${pkg.version} (ships no skills/)`);
      continue;
    }

    for (const entry of readdirSync(skillsRoot, {withFileTypes: true})) {
      if (!entry.isDirectory()) {
        continue;
      }
      const srcSkill = join(skillsRoot, entry.name);
      const srcManifest = join(srcSkill, 'SKILL.md');
      if (!existsSync(srcManifest)) {
        skipped.push(`${pkg.name} → ${entry.name} (no SKILL.md)`);
        continue;
      }
      if (!entry.name.startsWith(SKILL_PREFIX)) {
        skipped.push(`${pkg.name} → ${entry.name} (name must start with "${SKILL_PREFIX}")`);
        continue;
      }

      const destSkill = join(SKILLS_DIR, entry.name);
      rmSync(destSkill, {recursive: true, force: true});
      copyDir(srcSkill, destSkill);

      const destManifest = join(destSkill, 'SKILL.md');
      writeFileSync(
        destManifest,
        stampVersion(readFileSync(destManifest, 'utf8'), pkg.name, pkg.version),
      );

      synced.push({skill: entry.name, package: pkg.name, version: pkg.version});
    }
  }

  // Prune skills from packages that are no longer installed.
  const keep = new Set(synced.map(s => s.skill));
  if (existsSync(SKILLS_DIR)) {
    for (const entry of readdirSync(SKILLS_DIR, {withFileTypes: true})) {
      if (entry.isDirectory() && entry.name.startsWith(SKILL_PREFIX) && !keep.has(entry.name)) {
        rmSync(join(SKILLS_DIR, entry.name), {recursive: true, force: true});
        skipped.push(`pruned ${entry.name} (package no longer installed)`);
      }
    }
  }

  mkdirSync(SKILLS_DIR, {recursive: true});
  writeFileSync(
    MANIFEST,
    JSON.stringify({generatedAt: new Date().toISOString(), scope: SCOPE, skills: synced}, null, 2) + '\n',
  );

  const label = relative(ROOT, SKILLS_DIR).replace(/\\/g, '/');
  if (synced.length === 0) {
    console.log(`[sdk-skills] no ${SCOPE} skills found; ${label} unchanged`);
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

try {
  main();
} catch (error) {
  console.warn(`[sdk-skills] sync skipped: ${error.message}`);
}
