import {
	auditTheme,
	buildThemes,
	contrastRatio,
	ThemeContrastError,
} from '@chipmobilesdk/rn-theme';

import { themeConfig } from '../config';

const themes = buildThemes(themeConfig);
const SCHEMES = ['light', 'dark'] as const;

/** WCAG AA: body text, and non-text boundaries (1.4.11). */
const TEXT_MIN = 4.5;
const NON_TEXT_MIN = 3;

describe.each(SCHEMES)('%s theme', scheme => {
	const theme = themes[scheme];

	// AC-3.1, AC-3.2: an empty list is the pass condition; a failure prints the
	// offending pair with its ratio.
	it('passes the package contrast audit', () => {
		expect(auditTheme(theme)).toEqual([]);
	});

	/**
	 * AC-3.4: done/skipped rows, inputs and the toast sit on the raised tier,
	 * which the package does not pair with these foregrounds.
	 */
	const raised = theme.color.surfaceContainerHigh;
	it.each([
		['muted text', theme.color.onSurfaceVariant, TEXT_MIN],
		['body text', theme.color.onSurface, TEXT_MIN],
		['done text', theme.color.success, TEXT_MIN],
		['accent text', theme.tone.accent.fg, TEXT_MIN],
		['skipped mark', theme.color.outline, NON_TEXT_MIN],
	])('keeps %s readable on the raised surface', (_, foreground, minimum) => {
		expect(contrastRatio(foreground, raised)).toBeGreaterThanOrEqual(minimum);
	});

	/**
	 * Pairs the app draws that the package does not pair: the switch and the
	 * text caret used to take the OS's colours, and the repeat list's radio
	 * sits on the selected row's tint.
	 */
	const accent = theme.tone.accent;
	it.each([
		['switch thumb, on', accent.fill, theme.color.background, NON_TEXT_MIN],
		['switch thumb, off', theme.color.outline, theme.color.background, NON_TEXT_MIN],
		['radio mark on a selected row', accent.fg, accent.container, NON_TEXT_MIN],
		['text over the Android selection', theme.color.onSurface, accent.container, TEXT_MIN],
	])('keeps the %s visible', (_, foreground, background, minimum) => {
		expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
			minimum,
		);
	});
});

describe('contrast enforcement', () => {
	/** An override that drops muted text to the colour of its own background. */
	const breaking = {
		...themeConfig,
		overrides: {
			...themeConfig.overrides,
			light: {
				...themeConfig.overrides.light,
				color: { onSurfaceVariant: themes.light.color.background },
			},
		},
	};

	beforeEach(() => {
		// Non-strict builds report through a development warning.
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});
	afterEach(() => jest.restoreAllMocks());

	// AC-3.3, FR-7: Jest runs as a development build.
	it('is strict in development and test builds', () => {
		expect(__DEV__).toBe(true);
		expect(themeConfig.strict).toBe(__DEV__);
		expect(() => buildThemes(breaking)).toThrow(ThemeContrastError);
	});

	it('never throws for contrast when strict is off, as in release', () => {
		expect(() => buildThemes({ ...breaking, strict: false })).not.toThrow();
	});
});
