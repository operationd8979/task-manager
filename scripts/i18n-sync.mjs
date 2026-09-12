/**
 * Runs the `@chipmobilesdk/rn-i18n` extraction/synchronization CLI.
 *
 * The package ships its tooling as TypeScript and documents
 * `node --experimental-strip-types node_modules/.../cli.ts`. That command does
 * not work on Node 22.12: type stripping is refused for any file under
 * `node_modules`, permanently and by design
 * (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING). The restriction is about the
 * path, not the code, so this stages the tooling outside `node_modules` and
 * runs it from there.
 *
 * The staged copy lives in the OS temp directory, keyed by package version, so
 * a package upgrade re-stages rather than running last release's scanner. It is
 * derived, never edited, and safe to delete at any time.
 *
 * Arguments are forwarded verbatim and the child's exit code is this script's:
 * 0 success or warnings, 1 blocking findings, 2 invalid configuration.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// Resolved by path rather than by `require.resolve`: the package's `exports`
// map deliberately does not publish `./package.json`.
const packageRoot = path.join(
	process.cwd(),
	'node_modules',
	'@chipmobilesdk',
	'rn-i18n',
);
const packageJsonPath = path.join(packageRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
	console.error(`[i18n:sync] @chipmobilesdk/rn-i18n is not installed.`);
	process.exit(2);
}
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const source = path.join(packageRoot, 'src', 'tooling');
if (!fs.existsSync(source)) {
	console.error(`[i18n:sync] Tooling not found at ${source}.`);
	process.exit(2);
}

const staged = path.join(os.tmpdir(), `rn-i18n-tooling-${version}`);
// Re-copied every run rather than cached on existence: the copy is a handful of
// small files, and a half-written directory from an interrupted run would
// otherwise fail in a way that looks like a bug in the tooling.
fs.rmSync(staged, { recursive: true, force: true });
fs.cpSync(source, staged, { recursive: true });

const result = spawnSync(
	process.execPath,
	[
		'--experimental-strip-types',
		'--no-warnings',
		path.join(staged, 'cli.ts'),
		...process.argv.slice(2),
	],
	{ stdio: 'inherit', cwd: process.cwd() },
);

if (result.error) {
	console.error(`[i18n:sync] Failed to run the tooling: ${result.error.message}`);
	process.exit(2);
}
process.exit(result.status ?? 2);
