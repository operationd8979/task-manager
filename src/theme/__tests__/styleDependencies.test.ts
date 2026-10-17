/**
 * Guards the bug that motivated specs/003: the Unistyles Babel plugin decides
 * STATICALLY which styles recompute on a theme or variant change. A factory
 * that aliases or casts its parameter (`const theme = appTheme(raw)`) hides
 * every dependency, and its styles silently stop following light/dark — no
 * type error, no test failure, only a half-dark screen on a device.
 *
 * So every stylesheet in `src` is compiled with the project's own Babel config
 * and each entry that reads the theme must come out with the theme dependency
 * recorded, and each entry with `variants` with the variants dependency.
 */
import { execFileSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { parseSync, traverse, types as t } from '@babel/core';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(PROJECT_ROOT, 'src');

/** Unistyles' dependency ids in `uni__dependencies` (UnistyleDependency). */
const THEME_DEPENDENCY = 0;
const VARIANTS_DEPENDENCY = 4;

function sourceFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === '__tests__' ? [] : sourceFiles(full);
		}
		return /\.tsx?$/.test(entry.name) ? [full] : [];
	});
}

const stylesheetFiles = sourceFiles(SRC).filter(file =>
	readFileSync(file, 'utf8').includes('StyleSheet.create('),
);

/**
 * Compiles in a child process because the plugin turns itself into a no-op
 * when `NODE_ENV` is `test` — which it always is under Jest — and Babel caches
 * that decision with the plugin instance. The child compiles as a development
 * build does.
 */
const COMPILE = `
const fs = require('fs');
const path = require('path');
const babel = require(require.resolve('@babel/core', { paths: [process.cwd()] }));
const configFile = path.join(process.cwd(), 'babel.config.js');
const out = {};
for (const file of process.argv.slice(1)) {
	out[file] = babel.transformSync(fs.readFileSync(file, 'utf8'), {
		filename: file,
		cwd: process.cwd(),
		configFile,
	}).code;
}
process.stdout.write(JSON.stringify(out));
`;

function compileAll(files: string[]): Record<string, string> {
	const stdout = execFileSync(process.execPath, ['-e', COMPILE, ...files], {
		cwd: PROJECT_ROOT,
		env: { ...process.env, NODE_ENV: 'development' },
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	return JSON.parse(stdout);
}

function hasIdentifier(node: t.Node, name: string): boolean {
	let found = false;
	t.traverseFast(node, child => {
		if (t.isIdentifier(child, { name })) {
			found = true;
		}
	});
	return found;
}

function dependencies(style: t.ObjectExpression): number[] {
	const entry = style.properties.find(
		(property): property is t.ObjectProperty =>
			t.isObjectProperty(property) &&
			t.isIdentifier(property.key, { name: 'uni__dependencies' }),
	);
	if (!entry || !t.isArrayExpression(entry.value)) {
		return [];
	}
	return entry.value.elements.flatMap(element =>
		t.isNumericLiteral(element) ? [element.value] : [],
	);
}

function hasVariants(style: t.ObjectExpression): boolean {
	return style.properties.some(
		property =>
			t.isObjectProperty(property) &&
			t.isIdentifier(property.key, { name: 'variants' }),
	);
}

/** Every problem found in one compiled file, as `<entry>: <reason>`. */
function problems(code: string): string[] {
	const found: string[] = [];
	const ast = parseSync(code, {
		configFile: false,
		babelrc: false,
		sourceType: 'unambiguous',
	});
	if (!ast) {
		return ['unparseable output'];
	}
	traverse(ast, {
		CallExpression(callPath) {
			const { callee, arguments: args } = callPath.node;
			const factory = args[0];
			// React Native's own StyleSheet.create takes an object; only the
			// Unistyles theme factories are in scope.
			if (
				!t.isMemberExpression(callee) ||
				!t.isIdentifier(callee.property, { name: 'create' }) ||
				!t.isArrowFunctionExpression(factory)
			) {
				return;
			}
			const param = factory.params[0];
			if (!t.isIdentifier(param)) {
				found.push('factory: the theme parameter must be a plain identifier');
				return;
			}
			if (!t.isObjectExpression(factory.body)) {
				found.push(
					'factory: return the styles directly — a block body is where aliases and casts hide',
				);
				return;
			}
			for (const property of factory.body.properties) {
				if (!t.isObjectProperty(property) || !t.isObjectExpression(property.value)) {
					continue;
				}
				const key = t.isIdentifier(property.key) ? property.key.name : '?';
				const style = property.value;
				const recorded = dependencies(style);
				if (
					hasIdentifier(style, param.name) &&
					!recorded.includes(THEME_DEPENDENCY)
				) {
					found.push(`${key}: reads the theme but records no theme dependency`);
				}
				if (hasVariants(style) && !recorded.includes(VARIANTS_DEPENDENCY)) {
					found.push(`${key}: has variants but records no variants dependency`);
				}
			}
		},
	});
	return found;
}

describe('Unistyles theme dependencies', () => {
	let compiled: Record<string, string> = {};

	beforeAll(() => {
		compiled = compileAll(stylesheetFiles);
	}, 120_000);

	it('finds the stylesheets to check, and the plugin is active', () => {
		expect(stylesheetFiles.length).toBeGreaterThan(0);
		// Without this a disabled plugin would make every file below "pass".
		expect(Object.values(compiled).join('')).toContain('uni__dependencies');
	});

	it.each(stylesheetFiles.map(file => [path.relative(PROJECT_ROOT, file), file]))(
		'%s records them for every themed style',
		(_, file) => {
			expect(problems(compiled[file])).toEqual([]);
		},
	);
});
