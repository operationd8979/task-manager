#!/usr/bin/env node
/**
 * Fails when a package with native code is present in node_modules but is not
 * declared in package.json.
 *
 * React Native's autolinking builds its module list from the project's declared
 * dependencies. A package that arrives only as an auto-installed peer is
 * present in JavaScript and ABSENT from the native binary — so the app builds,
 * launches, and then dies at the first call with
 * "TurboModuleRegistry.getEnforcing(...): 'X' could not be found".
 *
 * That failure looks like a native build problem and is actually a one-line
 * package.json omission, which is why it is worth a check rather than a note.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
]);

const modulesDir = path.join(root, 'node_modules');

/** Top-level package names, expanding one level of @scope directories. */
function listInstalled() {
  const out = [];
  for (const entry of fs.readdirSync(modulesDir, {withFileTypes: true})) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) {
      continue;
    }
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(modulesDir, entry.name);
      for (const scoped of fs.readdirSync(scopeDir, {withFileTypes: true})) {
        if (scoped.isDirectory()) {
          out.push(`${entry.name}/${scoped.name}`);
        }
      }
    } else {
      out.push(entry.name);
    }
  }
  return out;
}

const hasNative = name =>
  fs.existsSync(path.join(modulesDir, name, 'android')) ||
  fs.existsSync(path.join(modulesDir, name, 'ios'));

const missing = listInstalled()
  .filter(hasNative)
  .filter(name => !declared.has(name))
  .sort();

if (missing.length > 0) {
  console.error(
    'These packages ship native code but are not declared in package.json.\n' +
      'Autolinking will skip them and the app will crash at first use:\n',
  );
  for (const name of missing) {
    console.error(`  ${name}`);
  }
  console.error(`\nFix: npm install --save ${missing.join(' ')}\n`);
  process.exit(1);
}

console.log(`native dependency check: ${declared.size} declared, 0 missing`);
