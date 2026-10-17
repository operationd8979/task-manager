#!/usr/bin/env node
/**
 * Refuses a build whose ad units, AdMob app id or signing do not match its
 * environment (specs/002-ads-and-remove-ads AC-7.4, FR-18, FR-24).
 *
 *   node scripts/check-release-config.mjs --env development|test|production [--format apk|aab]
 *
 * Run by scripts/build-android.ps1 before every release build. The rules live in
 * release-config-rules.cjs; this file only gathers their inputs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { checkReleaseConfig } = require('./release-config-rules.cjs');

const root = process.cwd();
const envFlag = process.argv.indexOf('--env');
const env = envFlag >= 0 ? process.argv[envFlag + 1] : undefined;
if (!env) {
	console.error(
		'usage: node scripts/check-release-config.mjs --env <development|test|production> [--format <apk|aab>]',
	);
	process.exit(2);
}
const formatFlag = process.argv.indexOf('--format');
const format = formatFlag >= 0 ? process.argv[formatFlag + 1] : 'apk';

const monetization = path.join(root, 'src', 'services', 'monetization');
const read = file => fs.readFileSync(file, 'utf8');

/** Same lookup order as android/app/build.gradle: Gradle properties, then env. */
function hasUploadKey() {
	if (process.env.TM_UPLOAD_STORE_FILE) {
		return true;
	}
	const gradleHome = process.env.GRADLE_USER_HOME || path.join(os.homedir(), '.gradle');
	return [path.join(gradleHome, 'gradle.properties'), path.join(root, 'android', 'gradle.properties')]
		.filter(file => fs.existsSync(file))
		.some(file => /^\s*TM_UPLOAD_STORE_FILE\s*=\s*\S+/m.test(read(file)));
}

const problems = checkReleaseConfig({
	env,
	format,
	privacyPolicySource: read(path.join(root, 'src', 'domain', 'privacyPolicy.ts')),
	envSources: {
		development: read(path.join(monetization, 'appEnv.ts')),
		test: read(path.join(monetization, 'appEnv.testtrack.ts')),
		production: read(path.join(monetization, 'appEnv.production.ts')),
	},
	testUnitsSource: read(path.join(monetization, 'environment.ts')),
	appJson: JSON.parse(read(path.join(root, 'app.json'))),
	hasUploadKey: hasUploadKey(),
});

if (problems.length > 0) {
	console.error(`release config check FAILED for env=${env} format=${format}:`);
	for (const problem of problems) {
		console.error(`  - ${problem}`);
	}
	process.exit(1);
}
console.log(`release config check passed for env=${env} format=${format}`);
