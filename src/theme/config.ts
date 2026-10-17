import {
	presets,
	type ThemeConfig,
} from '@chipmobilesdk/rn-theme';

import { BRAND_COLORS, BRAND_TYPOGRAPHY } from './brand';
import { TYPE_OVERRIDE } from './tokens';

/**
 * Radius is 0 system-wide; the package defaults to 2/4/8/16/24. `none` and
 * `full` keep their meaning.
 */
const SQUARE_CORNERS = { xs: 0, sm: 0, md: 0, lg: 0, xl: 0 };

/**
 * The design's accent IS the brand primary (overdue, primary action, warning
 * notices). A named tone keeps that intent readable and lets `byTone` offer it.
 */
const APP_TONES = { accent: BRAND_COLORS.primary };

/**
 * The whole theme, in one object.
 *
 * Kept free of `react-native-unistyles` so the Jest mock of that package can
 * build the real themes from it (`buildThemes`); `setup.ts` hands the same
 * object to `createUnistylesConfig`.
 *
 * `satisfies` rather than a `ThemeConfig` annotation, which would erase the
 * `extend` and tone types. The tone names are passed explicitly: with a bare
 * `satisfies ThemeConfig`, `extend`'s parameter is typed with no custom tones
 * and TypeScript infers none, so `theme.tone.accent` would not exist.
 *
 * Every colour is generated from the three brand colours (specs/003 FR-6);
 * nothing is pinned over the palette.
 */
export const themeConfig = {
	brandColors: BRAND_COLORS,
	typography: BRAND_TYPOGRAPHY,
	tones: APP_TONES,
	extend: ({ theme }) => ({
		appColor: {
			/** Resting colour of a loading block; it breathes via opacity. */
			skeleton: theme.color.surfaceContainerHigh,
		},
		/** Type roles the package scale has no slot for. */
		appType: {
			sheetTitle: { fontSize: 17, lineHeight: 22, ...theme.font.heavy },
			/**
			 * The clock column. Tabular numerals are mandatory: without them `09:00`
			 * and `11:30` differ in width and the column jitters while scrolling.
			 */
			clock: {
				fontSize: 13,
				lineHeight: 16,
				...theme.font.heavy,
				...presets.tabularNums,
			},
		},
	}),
	overrides: {
		light: { radius: SQUARE_CORNERS, typography: TYPE_OVERRIDE },
		dark: { radius: SQUARE_CORNERS, typography: TYPE_OVERRIDE },
	},
	// Fail fast while developing and under Jest; a release build never crashes
	// over a colour (specs/003 FR-7). The audit test is the gate either way.
	strict: __DEV__,
} satisfies ThemeConfig<object, keyof typeof APP_TONES>;
