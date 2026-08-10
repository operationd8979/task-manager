/**
 * Unistyles configuration. This module MUST be imported before the first
 * component that consumes a style renders — see index.js. Getting the order
 * wrong produces an app that renders with no styling and no error.
 */
import { StyleSheet } from 'react-native-unistyles';
import { createUnistylesConfig } from '@chipmobilesdk/rn-theme';

import { BRAND_COLORS, BRAND_TYPOGRAPHY } from './brand';
import {
	APP_COLOR_DARK,
	APP_COLOR_LIGHT,
	APP_SPACING,
	APP_TYPE,
	BASE_COLOR_DARK,
	BASE_COLOR_LIGHT,
	TYPE_OVERRIDE,
	ZERO_RADIUS,
} from './tokens';

const base = createUnistylesConfig(
	{
		brandColors: BRAND_COLORS,
		typographyConfig: BRAND_TYPOGRAPHY,
		overrides: {
			light: {
				color: { ...BASE_COLOR_LIGHT, error: APP_COLOR_LIGHT.accentInk },
				radius: ZERO_RADIUS,
				typography: TYPE_OVERRIDE,
			},
			dark: {
				color: { ...BASE_COLOR_DARK, error: APP_COLOR_DARK.accentInk },
				radius: ZERO_RADIUS,
				typography: TYPE_OVERRIDE,
			},
		},
	},
	// Boot in "auto"; a stored Sáng/Tối preference is applied by applyDisplayMode
	// once settings have been read. `adaptiveThemes` and `initialTheme` cannot be
	// combined — the package rejects that at validation time.
	{ adaptiveThemes: true },
);

/**
 * `DeepPartial<StyleTheme>` can only override keys that already exist, so the
 * seven semantic tokens the design needs are attached here instead.
 */
const themes = {
	light: {
		...base.themes.light,
		appColor: APP_COLOR_LIGHT,
		appSpacing: APP_SPACING,
		appType: APP_TYPE,
	},
	dark: {
		...base.themes.dark,
		appColor: APP_COLOR_DARK,
		appSpacing: APP_SPACING,
		appType: APP_TYPE,
	},
};

export type AppThemes = typeof themes;


StyleSheet.configure({ ...base, themes });
