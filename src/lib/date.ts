/**
 * Local dates and times.
 *
 * Everything is stored as a wall-clock string rather than an absolute
 * timestamp. That is what makes the timezone assumption hold: when the device
 * changes timezone, a 09:00 task is still 09:00 (spec.md Assumptions).
 */

/** `YYYY-MM-DD` */
export type LocalDate = string;
/** `HH:mm`, 24-hour */
export type LocalTime = string;
/** 1 = Monday … 7 = Sunday */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const MINUTES_PER_DAY = 24 * 60;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isLocalDate(value: string): value is LocalDate {
	if (!DATE_RE.test(value)) {
		return false;
	}
	// Reject 2026-02-31 and friends: Date normalises them, so round-tripping is
	// the cheapest correct check.
	return toLocalDate(parseLocalDate(value)) === value;
}

export function isLocalTime(value: string): value is LocalTime {
	return TIME_RE.test(value);
}

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/** Local midnight for a `LocalDate`. Never UTC — `new Date('2026-08-03')` is. */
export function parseLocalDate(date: LocalDate): Date {
	const [y, m, d] = date.split('-').map(Number);
	return new Date(y, m - 1, d);
}

export function toLocalDate(value: Date): LocalDate {
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
		value.getDate(),
	)}`;
}

export function toLocalTime(value: Date): LocalTime {
	return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function today(now: Date = new Date()): LocalDate {
	return toLocalDate(now);
}

export function addDays(date: LocalDate, days: number): LocalDate {
	const d = parseLocalDate(date);
	d.setDate(d.getDate() + days);
	return toLocalDate(d);
}

/** Signed day difference, `to - from`. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
	const a = parseLocalDate(from).getTime();
	const b = parseLocalDate(to).getTime();
	// Round rather than truncate: a DST transition makes the span 23 or 25 hours.
	return Math.round((b - a) / 86_400_000);
}

/** ISO weekday, 1 = Monday. `Date.getDay()` is 0 = Sunday. */
export function weekdayOf(date: LocalDate): Weekday {
	const jsDay = parseLocalDate(date).getDay();
	return (jsDay === 0 ? 7 : jsDay) as Weekday;
}

export function minutesOf(time: LocalTime): number {
	const [h, m] = time.split(':').map(Number);
	return h * 60 + m;
}

export function timeFromMinutes(minutes: number): LocalTime {
	const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) %
		MINUTES_PER_DAY;
	return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

/** Combines a local date and time into an absolute instant for scheduling. */
export function toDateTime(date: LocalDate, time: LocalTime): Date {
	const d = parseLocalDate(date);
	const [h, m] = time.split(':').map(Number);
	d.setHours(h, m, 0, 0);
	return d;
}

export function compareDate(a: LocalDate, b: LocalDate): number {
	// Lexicographic comparison is correct for zero-padded ISO dates.
	return a < b ? -1 : a > b ? 1 : 0;
}

export function compareTime(a: LocalTime, b: LocalTime): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The next whole hour after `now`, as a wall-clock time.
 *
 * The default start time for a new task. A fixed 09:00 was wrong for most of
 * the day — anyone adding something at 14:20 had to change it before they could
 * change anything else.
 *
 * Clamped to the last hour of the day rather than wrapping past midnight:
 * 00:00 belongs to the START of the same day, so wrapping would hand back a
 * time twenty-three hours in the past — the opposite of "next".
 */
export function nextWholeHour(now: Date = new Date()): LocalTime {
	const next = (now.getHours() + 1) * 60;
	return timeFromMinutes(Math.min(next, MINUTES_PER_DAY - 60));
}

/** Snap a time to a grid, used by drag-to-reschedule (FR-018a, 15 minutes). */
export function snapToGrid(time: LocalTime, stepMinutes: number): LocalTime {
	const snapped = Math.round(minutesOf(time) / stepMinutes) * stepMinutes;
	return timeFromMinutes(snapped);
}

/** 1–31. The day-of-month a monthly rule matches against. */
export function dayOfMonth(date: LocalDate): number {
	return parseLocalDate(date).getDate();
}

/**
 * 28, 29, 30 or 31 — how many days the month containing `date` actually has.
 *
 * Day 0 of the NEXT month is the last day of this one; asking for it is what
 * keeps February right in a leap year without a rule of its own.
 */
export function daysInMonth(date: LocalDate): number {
	const d = parseLocalDate(date);
	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** The last calendar day of the month containing `date`. */
export function lastDayOfMonth(date: LocalDate): LocalDate {
	const d = parseLocalDate(date);
	return toLocalDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** The first day of the month containing `date`. */
export function startOfMonth(date: LocalDate): LocalDate {
	const d = parseLocalDate(date);
	return toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/**
 * Move by whole months, keeping the day-of-month where the target month has it.
 *
 * Only ever called on the first of a month by the occurrence counter, so the
 * "31 January + 1 month" question never arises here — but it is answered
 * anyway, by clamping rather than rolling into the next month, because rolling
 * would silently skip a month in any loop that used it.
 */
export function addMonths(date: LocalDate, months: number): LocalDate {
	const d = parseLocalDate(date);
	const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
	const lastDay = new Date(
		target.getFullYear(),
		target.getMonth() + 1,
		0,
	).getDate();
	target.setDate(Math.min(d.getDate(), lastDay));
	return toLocalDate(target);
}

/** A date built from a year/month pair and a day, or null when it has no such day. */
export function dateInMonth(
	monthStart: LocalDate,
	day: number,
): LocalDate | null {
	const d = parseLocalDate(monthStart);
	// The whole point of "Lặp theo ngày": a month without day 31 produces
	// NOTHING for day 31 rather than being nudged to the 28th. Nudging is what
	// makes a monthly series land on a day the user never chose.
	if (day < 1 || day > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()) {
		return null;
	}
	return toLocalDate(new Date(d.getFullYear(), d.getMonth(), day));
}
