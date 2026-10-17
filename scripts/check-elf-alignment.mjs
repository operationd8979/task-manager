#!/usr/bin/env node
/**
 * Fails when a 64-bit native library in an APK or AAB is not aligned for
 * 16 KB memory pages (specs/002-ads-and-remove-ads plan D-27).
 *
 *   node scripts/check-elf-alignment.mjs <path to .apk or .aab>
 *
 * Run by scripts/build-android.ps1 after every AAB. The parsing lives in
 * elf-alignment.cjs; this file only reads the archive and reports.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PAGE_16K, checkArchive } = require('./elf-alignment.cjs');

const archivePath = process.argv[2];
if (!archivePath || !fs.existsSync(archivePath)) {
	console.error('usage: node scripts/check-elf-alignment.mjs <path to .apk or .aab>');
	process.exit(2);
}

const { libraries, unaligned } = checkArchive(fs.readFileSync(archivePath));
for (const library of libraries) {
	const verdict = library.aligned ? 'ALIGNED  ' : 'UNALIGNED';
	console.log(`${verdict} ${library.minAlignment.toString().padStart(6)}  ${library.name}`);
}

if (unaligned.length > 0) {
	console.error(
		`16 KB check FAILED: ${unaligned.length} of ${libraries.length} 64-bit libraries ` +
			`have a load segment aligned below ${PAGE_16K} bytes.`,
	);
	process.exit(1);
}
console.log(`16 KB check passed: ${libraries.length} 64-bit libraries.`);
