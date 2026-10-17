/**
 * Design values the theme package has no token for.
 *
 * Colours, spacing, radius, touch target, glyph alignment, tabular numerals and
 * the font-scale ceiling all come from `@chipmobilesdk/rn-theme`; app colour
 * and type roles are declared through `extend` in config.ts. Only sizes and
 * the type scale override live here.
 */

/** Design type scale: 11/13/15/20/24. The package ships 12/14/16/22/32. */
export const TYPE_OVERRIDE = {
	headline: { fontSize: 24, fontWeight: '800' as const, lineHeight: 26 },
	title: { fontSize: 20, fontWeight: '800' as const, lineHeight: 24 },
	body: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
	label: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
	caption: {
		fontSize: 11,
		fontWeight: '700' as const,
		lineHeight: 14,
		letterSpacing: 0.4,
	},
};

/**
 * Header controls: the day bar's arrows and settings button, and the Settings
 * screen's back button.
 *
 * Deliberately above the 44pt touch target: these are the most-used controls
 * on the most-used screens, and at 44pt with a 20pt glyph they read as
 * decoration rather than as buttons. Shared so a header control is the same
 * size wherever it appears — a smaller back arrow on one screen reads as a
 * different app.
 */
export const DAY_ICON_SIZE = 52;

/**
 * Side of the square the header chevrons are cut from (see components/Chevron).
 * The drawn arrow ends up roughly 13×25pt, which reads at the same weight as
 * the 20pt glyphs beside it.
 */
export const NAV_CHEVRON_SIZE = 18;
/** The smaller chevrons inside a sheet, e.g. the month stepper. */
export const SHEET_CHEVRON_SIZE = 12;

/** Row heights from the design; content may push them taller, never shorter. */
export const ROW_MIN_HEIGHT = { oneLabel: 76, threeLabels: 92 } as const;

/**
 * The note field: three lines when empty, growing as it is typed into, up to
 * about seven — small enough to fit above the keyboard with its label on a
 * short phone, after which it scrolls inside itself.
 */
export const NOTE_FIELD_HEIGHT = { min: 72, max: 144 } as const;

/** Fixed chrome heights. */
export const BAR_HEIGHT = { day: 56, action: 56, sheetHeader: 52 } as const;

/** Padding under the list so the last row clears the action bar. */
export const LIST_BOTTOM_PADDING = 88;
