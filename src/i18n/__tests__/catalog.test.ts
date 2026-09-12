import { I18N_KEYS } from '../keys.generated';
import { ENGLISH, JAPANESE, LOCALES, PRIMARY_LOCALE, VIETNAMESE } from '../config';
import en from '../locales/en-US.json';
import ja from '../locales/ja-JP.json';
import vi from '../locales/vi-VN.json';

/**
 * What the three catalogues owe each other.
 *
 * A missing translation does not crash and does not look like a defect: the SDK
 * serves the fallback locale, so the app shows one Vietnamese sentence in the
 * middle of an English screen and carries on. That is exactly the kind of gap
 * that ships. These tests are the reason it cannot.
 *
 * The key LIST comes from the generated contract rather than from one of the
 * files, so "every locale has the same keys" and "every key the code asks for
 * exists" are the same assertion.
 */

type Node = string | { [key: string]: Node };

const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];

const CATALOGUES: ReadonlyArray<{ code: string; tree: Node }> = [
	{ code: VIETNAMESE, tree: vi as Node },
	{ code: ENGLISH, tree: en as Node },
	{ code: JAPANESE, tree: ja as Node },
];

function isPluralGroup(node: Node): node is Record<string, string> {
	return (
		typeof node === 'object' &&
		'other' in node &&
		Object.keys(node).every(key => PLURAL_CATEGORIES.includes(key))
	);
}

/** The value at a dot-path, or undefined where the path does not resolve. */
function lookup(tree: Node, key: string): Node | undefined {
	let node: Node = tree;
	for (const segment of key.split('.')) {
		if (typeof node !== 'object') {
			return undefined;
		}
		const next: Node | undefined = node[segment];
		if (next === undefined) {
			return undefined;
		}
		node = next;
	}
	return node;
}

/** Every leaf path in a catalogue, so extra keys are as visible as missing ones. */
function leafKeys(node: Node, prefix = '', out: string[] = []): string[] {
	if (typeof node === 'string' || isPluralGroup(node)) {
		out.push(prefix);
		return out;
	}
	for (const [key, child] of Object.entries(node)) {
		leafKeys(child, prefix === '' ? key : `${prefix}.${key}`, out);
	}
	return out;
}

/** The `{{name}}` placeholders a value promises to fill, across plural variants. */
function variablesOf(node: Node): string[] {
	const texts = typeof node === 'string' ? [node] : Object.values(node);
	const names = new Set<string>();
	for (const text of texts) {
		for (const match of String(text).matchAll(/\{\{(\w+)\}\}/g)) {
			names.add(match[1]);
		}
	}
	return [...names].sort();
}

/**
 * The one key whose variables are allowed to differ between languages.
 *
 * `dayLabel` hands the template both the zero-padded and the plain form of the
 * day and the month, and which pair reads as natural is a property of the
 * language: Vietnamese writes 03/08, Japanese writes 8月3日. Every locale picks
 * from the same set; none of them uses all of it.
 */
const LOCALE_SHAPED_KEYS = new Set(['format.dayLabel']);

describe('translation catalogues', () => {
	it.each(CATALOGUES)('$code defines every key the code asks for', ({ tree }) => {
		const missing = I18N_KEYS.filter(key => lookup(tree, key) === undefined);
		expect(missing).toEqual([]);
	});

	it.each(CATALOGUES)('$code defines nothing the code never asks for', ({ tree }) => {
		const declared = new Set<string>(I18N_KEYS);
		// A stale key is dead weight a translator is still paying to maintain.
		// `npm run i18n:sync` removes them; this is what makes skipping it fail.
		expect(leafKeys(tree).filter(key => !declared.has(key))).toEqual([]);
	});

	it.each(CATALOGUES)('$code fills the same placeholders as Vietnamese', ({ code, tree }) => {
		const differing = I18N_KEYS.filter(key => {
			if (LOCALE_SHAPED_KEYS.has(key)) {
				return false;
			}
			const source = lookup(vi as Node, key);
			const target = lookup(tree, key);
			if (source === undefined || target === undefined) {
				return false; // Reported by the first test, not twice here.
			}
			return variablesOf(source).join() !== variablesOf(target).join();
		});
		// A placeholder the source has and a translation drops silently deletes a
		// date, a name or a count from a sentence — and reads as finished prose.
		expect({ code, differing }).toEqual({ code, differing: [] });
	});

	it('never leaves a single-brace placeholder behind', () => {
		// The catalogue was migrated from a `{name}` syntax to the SDK's
		// `{{name}}`. A half-converted value interpolates nothing and renders the
		// braces to the user.
		for (const { code, tree } of CATALOGUES) {
			for (const key of leafKeys(tree)) {
				const node = lookup(tree, key) as Node;
				const texts = typeof node === 'string' ? [node] : Object.values(node);
				for (const text of texts) {
					expect({ code, key, text }).toEqual({
						code,
						key,
						text: String(text).replace(/(?<!\{)\{(\w+)\}(?!\})/g, '«$1»'),
					});
				}
			}
		}
	});

	it('gives English both plural forms wherever it uses a plural group', () => {
		for (const key of I18N_KEYS) {
			const node = lookup(en as Node, key);
			if (node !== undefined && typeof node !== 'string') {
				expect(Object.keys(node).sort()).toEqual(['one', 'other']);
			}
		}
	});

	it('resolves every fallback chain to the primary locale', () => {
		// The chains are what stop a gap showing as a raw key. They only do that
		// if they end somewhere complete, and Vietnamese is the only catalogue
		// the tests above prove complete on its own.
		for (const locale of LOCALES) {
			if (locale.code === PRIMARY_LOCALE) {
				continue;
			}
			expect(locale.fallbackChain).toContain(PRIMARY_LOCALE);
		}
	});
});
