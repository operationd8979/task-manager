/**
 * Android draws a few things before, or outside, JavaScript — the launcher
 * icon's background and the date/time picker dialogs — so their colours are
 * copies in android/app/src/main/res. A copy that drifts from its source is a
 * picker in last year's brand colour, which nobody notices on review; this
 * makes it a failing test that says which token to copy.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { buildThemes } from '@chipmobilesdk/rn-theme';

import { BRAND_COLORS } from '../brand';
import { themeConfig } from '../config';

const RES = path.resolve(__dirname, '../../../android/app/src/main/res');

/** Every `<color name="…">#…</color>` in one resource file. */
function colors(file: string): Record<string, string> {
	const xml = readFileSync(path.join(RES, file), 'utf8');
	const found: Record<string, string> = {};
	for (const match of xml.matchAll(/<color name="(\w+)">(#[0-9A-Fa-f]+)<\/color>/g)) {
		found[match[1]] = match[2].toUpperCase();
	}
	return found;
}

const themes = buildThemes(themeConfig);

describe.each([
	['light', 'values/theme_colors.xml'],
	['dark', 'values-night/theme_colors.xml'],
] as const)('native %s colours', (scheme, file) => {
	const theme = themes[scheme];
	const native = colors(file);

	it.each([
		['app_accent', 'tone.accent.fg', theme.tone.accent.fg],
		['app_dialog_surface', 'color.surfaceContainerHigh', theme.color.surfaceContainerHigh],
	])('%s is a copy of %s', (name, _token, expected) => {
		expect(native[name]).toBe(expected.toUpperCase());
	});
});

it('keeps the launcher background on the brand primary', () => {
	expect(colors('values/ic_launcher_background.xml').ic_launcher_background).toBe(
		BRAND_COLORS.primary.toUpperCase(),
	);
});
