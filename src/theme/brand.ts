import type {BrandColors, TypographyConfig} from '@chipmobilesdk/rn-theme';

/**
 * Three colours are the ENTIRE colour input. Everything else is derived, so
 * light and dark stay complete at the same time.
 *
 * See specs/001-timeline-task-manager/design/design-system.md §1.
 */
export const BRAND_COLORS: BrandColors = {
  // Accent — primary action, overdue, focus ring, overlap-cluster rail.
  primary: '#EC3013',
  // Ink — text, rules, structure. Becomes the background in dark mode.
  secondary: '#201E1D',
  // Ground — light background and surfaces. Becomes the text colour in dark mode.
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
};
