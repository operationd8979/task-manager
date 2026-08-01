#!/usr/bin/env node
/**
 * Wire the agent system into an app created inside this boilerplate.
 *
 * This repository ships the agent/spec system only — no application. After you
 * create the app (e.g. `npx @react-native-community/cli init <Name> --directory .`),
 * the generated package.json knows nothing about the skill sync. Run this once:
 *
 *   node scripts/bootstrap-agent-system.mjs
 *
 * It adds, idempotently:
 *   - scripts.sync:skills   → node scripts/sync-sdk-skills.mjs
 *   - scripts.postinstall   → node scripts/sync-sdk-skills.mjs
 *
 * The @chipmobilesdk scope is the default in sync-sdk-skills.mjs, so nothing else is
 * needed. Pass extra scopes only if this project also consumes skill-bearing packages
 * from another org — they are recorded in agentSkills.scopes:
 *
 *   node scripts/bootstrap-agent-system.mjs @other-org
 *
 * It never overwrites an existing postinstall; it reports the conflict instead.
 */

import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = join(ROOT, 'package.json');
const SYNC_CMD = 'node scripts/sync-sdk-skills.mjs';
// Must match DEFAULT_SCOPES in sync-sdk-skills.mjs.
const DEFAULT_SCOPES = ['@chipmobilesdk'];

const scopesFromArgs = process.argv.slice(2).filter(a => a.startsWith('@'));

if (!existsSync(PKG_PATH)) {
  console.error('[bootstrap] No package.json found.');
  console.error('[bootstrap] Create the application first, then re-run this script.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
const changes = [];
const warnings = [];

pkg.scripts ??= {};

if (pkg.scripts['sync:skills'] !== SYNC_CMD) {
  pkg.scripts['sync:skills'] = SYNC_CMD;
  changes.push('scripts."sync:skills"');
}

if (!pkg.scripts.postinstall) {
  pkg.scripts.postinstall = SYNC_CMD;
  changes.push('scripts.postinstall');
} else if (!pkg.scripts.postinstall.includes('sync-sdk-skills')) {
  warnings.push(
    `postinstall already set to "${pkg.scripts.postinstall}" — left untouched.\n` +
      `             Append " && ${SYNC_CMD}" yourself, or skills will not sync on install.`,
  );
}

// The default scope lives in sync-sdk-skills.mjs, so package.json stays clean unless
// this project genuinely needs extra scopes.
const existingScopes = pkg.agentSkills?.scopes ?? DEFAULT_SCOPES;
const mergedScopes = [...new Set([...existingScopes, ...scopesFromArgs])];
if (scopesFromArgs.length > 0 && mergedScopes.length !== existingScopes.length) {
  pkg.agentSkills = {...pkg.agentSkills, scopes: mergedScopes};
  changes.push('agentSkills.scopes');
}

if (changes.length > 0) {
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`[bootstrap] package.json updated: ${changes.join(', ')}`);
} else {
  console.log('[bootstrap] package.json already wired — nothing to change');
}

const gitignore = join(ROOT, '.gitignore');
if (!existsSync(gitignore)) {
  warnings.push('.gitignore is missing — generated skills and node_modules would be committed.');
} else if (!readFileSync(gitignore, 'utf8').includes('.claude/skills/sdk-')) {
  warnings.push(
    '.gitignore does not ignore ".claude/skills/sdk-*/" — generated skills would be committed.',
  );
}

for (const warning of warnings) {
  console.warn(`[bootstrap] WARNING: ${warning}`);
}

console.log(
  mergedScopes.length > 0
    ? `[bootstrap] Done. Run "npm install" (or "npm run sync:skills") to pull skills from: ${mergedScopes.join(', ')}`
    : '[bootstrap] Done.',
);
