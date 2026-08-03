import type {TextStyle} from 'react-native';

/**
 * The ONLY place in the app where colour literals may appear (Principle III).
 *
 * Every value below was derived from the three brand colours and verified with
 * a WCAG contrast check — see design/design-system.md §3 for the full table and
 * the measured ratios. They are written out rather than computed at runtime so
 * the app does not depend on `tinycolor2`, which belongs to the theme package
 * rather than to this app.
 */

/** Semantic roles that the SDK's ThemeColors has no slot for. */
export interface AppColors {
  /** Notes, meta, secondary labels. */
  textMuted: string;
  /** 2px rules between large regions. */
  lineStrong: string;
  /** Background of a filled button that carries a text label. */
  accentFill: string;
  /** Accent-coloured text at body/caption size. */
  accentInk: string;
  /** Background of the OVERDUE pill and permission banners. */
  accentSoft: string;
  /** Text drawn on top of `accentFill`. */
  onAccent: string;
  /** Overlay behind a bottom sheet. */
  scrim: string;
  skeletonFrom: string;
  skeletonTo: string;
}

export const APP_COLOR_LIGHT: AppColors = {
  textMuted: '#706966', // 4.82:1 on #F3F2F2
  lineStrong: 'rgba(32, 30, 29, 0.4)',
  accentFill: '#BD260F', // onAccent reaches 5.45:1
  accentInk: '#A0210D', // 6.91:1 on bg, 4.99:1 on accentSoft
  accentSoft: '#F4C5BE',
  onAccent: '#F3F2F2',
  scrim: 'rgba(32, 30, 29, 0.45)',
  skeletonFrom: '#E9E7E7',
  skeletonTo: '#F3F2F2',
};

export const APP_COLOR_DARK: AppColors = {
  textMuted: '#978F8C', // 5.24:1 on #201E1D
  lineStrong: '#57514E',
  accentFill: '#F05942', // onAccent reaches 4.91:1
  accentInk: '#F48371', // 6.59:1 on bg, 4.91:1 on accentSoft
  accentSoft: '#4E2B25',
  onAccent: '#201E1D',
  scrim: 'rgba(32, 30, 29, 0.8)',
  skeletonFrom: '#302D2C',
  skeletonTo: '#403C3A',
};

/**
 * Base surfaces. The theme package hardcodes neutral greys for these rather
 * than deriving them from the brand, so they must be overridden or the app
 * ships in the wrong colours with no runtime warning.
 */
export const BASE_COLOR_LIGHT = {
  background: '#F3F2F2',
  surface: '#E9E7E7',
  surfaceVariant: '#E9E7E7',
  onBackground: '#201E1D',
  onSurface: '#201E1D',
  border: '#D6D2D2',
} as const;

export const BASE_COLOR_DARK = {
  background: '#201E1D',
  surface: '#302D2C',
  surfaceVariant: '#302D2C',
  onBackground: '#F3F2F2',
  onSurface: '#F3F2F2',
  border: '#403C3A',
} as const;

/** The 4pt step the design system uses; the SDK scale is missing 12. */
export const APP_SPACING = {gap12: 12} as const;

/**
 * Type roles the SDK typography scale has no slot for.
 *
 * Deliberately NOT `as const`: that would make `fontVariant` a readonly tuple,
 * which React Native's TextStyle rejects — and the resulting mismatch breaks
 * type inference for every entry in whichever stylesheet spreads it.
 */
interface TypeToken {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  lineHeight: number;
  /**
   * React Native's own type, not `string[]` and not an `as const` tuple.
   * `as const` produces a readonly tuple and `string[]` is too wide; either one
   * fails the style index signature and takes the whole stylesheet's inferred
   * type down with it.
   */
  fontVariant?: TextStyle['fontVariant'];
}

export const APP_TYPE: {
  sheetTitle: TypeToken;
  clock: TypeToken;
} = {
  sheetTitle: {fontSize: 17, fontWeight: '800', lineHeight: 22},
  /**
   * The clock column. `tabular-nums` is mandatory: without it `09:00` and
   * `11:30` differ in width and the whole column jitters while scrolling.
   */
  clock: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
};

/** Radius is 0 system-wide; the SDK defaults to 4/8/16/24. */
export const ZERO_RADIUS = {sm: 0, md: 0, lg: 0, xl: 0, full: 9999} as const;

/** Design type scale: 11/13/15/20/24. The SDK ships 12/14/16/22/32. */
export const TYPE_OVERRIDE = {
  headline: {fontSize: 24, fontWeight: '800' as const, lineHeight: 26},
  title: {fontSize: 20, fontWeight: '800' as const, lineHeight: 24},
  body: {fontSize: 15, fontWeight: '600' as const, lineHeight: 22},
  label: {fontSize: 13, fontWeight: '400' as const, lineHeight: 18},
  caption: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
};

/** Every touchable must reach this, per Principle V. */
export const TAP_TARGET_MIN = 44;

/**
 * Header controls: the day bar's arrows and settings button, and the Settings
 * screen's back button.
 *
 * Deliberately above TAP_TARGET_MIN: these are the most-used controls on the
 * most-used screens, and at 44pt with a 20pt glyph they read as decoration
 * rather than as buttons. Shared so a header control is the same size wherever
 * it appears — a smaller back arrow on one screen reads as a different app.
 */
export const DAY_ICON_SIZE = 52;

/**
 * The chevrons drawn in those controls. Above the type scale on purpose: they
 * sit small inside their em box, so at `title` size they look lighter than the
 * glyphs beside them.
 */
export const NAV_GLYPH = {fontSize: 34, lineHeight: 38} as const;

/**
 * OS text-size ceiling. Enforced with `maxFontSizeMultiplier` on the shared
 * Text component — NOT via the theme's `fontScale`, which is applied once at
 * config time and does not track the OS setting.
 */
export const MAX_FONT_SCALE = 1.7;

/** Row heights from the design; content may push them taller, never shorter. */
export const ROW_MIN_HEIGHT = {oneLabel: 76, threeLabels: 92} as const;

/** Fixed chrome heights. */
export const BAR_HEIGHT = {day: 56, action: 56, sheetHeader: 52} as const;

/** Padding under the list so the last row clears the action bar. */
export const LIST_BOTTOM_PADDING = 88;
