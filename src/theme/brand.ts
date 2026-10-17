import type { BrandColors, TypographyConfig } from '@chipmobilesdk/rn-theme';

/**
 * Three colours are the ENTIRE colour input. The theme package builds every
 * role in light and dark from their hue and chroma at fixed tones, so contrast
 * holds whatever the values — the hexes themselves never appear on screen.
 *
 * Neutral surfaces carry a faint tint of the primary hue (specs/003 A-4).
 */
export const BRAND_COLORS: BrandColors = {
	// Accent — primary action, overdue, warning notices. Also seeds the `accent`
	// tone (see config.ts).
	primary: '#EC3013',
	// Ink — a near-neutral warm grey; seeds the secondary roles.
	secondary: '#201E1D',
	// Ground — a near-neutral light grey; seeds the tertiary roles.
	tertiary: '#F3F2F2',
};

/**
 * System font on purpose: SF on iOS, Roboto on Android. Both carry full
 * Vietnamese diacritics, cost no bundle size, and follow the OS text size.
 */
export const BRAND_TYPOGRAPHY: TypographyConfig = {
	fontFamily: 'System',
	baseFontSize: 16,
	fontScale: 1,
	// OS text-size ceiling (FR-057), read by the shared Text as
	// `theme.maxFontScale`. `fontScale` above is a design-time multiplier and
	// does not track the OS setting.
	maxFontScale: 1.7,
};
