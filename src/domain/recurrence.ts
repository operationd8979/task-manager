import {
	addDays,
	addMonths,
	compareDate,
	dateInMonth,
	dayOfMonth,
	daysBetween,
	daysInMonth,
	lastDayOfMonth,
	startOfMonth,
	weekdayOf,
	type LocalDate,
	type LocalTime,
	type Weekday,
} from '../lib/date';
import type { ReminderOffset } from './reminder';
import type { TaskStatus } from './task';

/**
 * How a series picks its dates.
 *
 * `monthlyByDay` deliberately SKIPS months that have no such day: a series on
 * the 31st produces nothing in February. Nudging it to the 28th would put the
 * session on a day the user never chose, which is worse than a gap they can see
 * coming — the recurrence sheet says which months will be empty.
 * `monthlyLastDay` is the separate answer for "cuối tháng", where landing on
 * 28, 29, 30 or 31 is exactly what was asked for.
 */
export type RecurrenceFrequency = 'weekly' | 'monthlyByDay' | 'monthlyLastDay';

/**
 * A start/end time that applied to every occurrence BEFORE `until`.
 *
 * Editing a series' time must not rewrite history: sessions that already
 * happened keep the time they happened at (change.md §4). Occurrences are
 * computed and never stored, so the only place "it used to be 07:00" can live
 * is here — one entry per edit, rather than an override per past day, which for
 * a year-old daily series would be 365 writes to answer one edit.
 */
export interface TimeSegment {
	/** The first date on which this pair stopped applying. Exclusive. */
	until: LocalDate;
	startTime: LocalTime;
	endTime: LocalTime | null;
}

export interface RecurringRule {
	id: string;
	title: string;
	note: string | null;
	startDate: LocalDate;
	/** null means the series never ends (FR-022). */
	endDate: LocalDate | null;
	frequency: RecurrenceFrequency;
	/** Read only when `frequency` is 'weekly'. */
	daysOfWeek: readonly Weekday[];
	/** Read only when `frequency` is 'monthlyByDay'. */
	daysOfMonth: readonly number[];
	defaultStartTime: LocalTime;
	defaultEndTime: LocalTime | null;
	/** Times this series USED to run at, oldest first. Empty for a new series. */
	timeHistory: readonly TimeSegment[];
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
}

export type NewRecurringRule = Omit<RecurringRule, 'id'>;

/**
 * An override records ONLY the fields it actually replaces.
 *
 * Every field is optional AND nullable, and those are different: absent means
 * "inherit from the rule", present-and-null means "this occurrence deliberately
 * has no value". Collapsing the two loses user data silently (research.md R7).
 */
export interface RecurrenceOverride {
	ruleId: string;
	occurrenceDate: LocalDate;
	isSkipped: boolean;
	title?: string;
	note?: string | null;
	startTime?: LocalTime;
	endTime?: LocalTime | null;
	status?: TaskStatus;
	reminderEnabled?: boolean;
	reminderOffsetMinutes?: ReminderOffset;
}

/** Fields whose presence means the user edited this occasion's CONTENT. */
const CONTENT_FIELDS = [
	'title',
	'note',
	'startTime',
	'endTime',
	'reminderEnabled',
	'reminderOffsetMinutes',
] as const;

/**
 * Does this rule produce an occurrence on that date? Overrides not considered.
 *
 * The end date is INCLUSIVE (FR-024). Writing `<` instead of `<=` here is the
 * kind of mistake that surfaces on exactly one day in each series' life.
 */
export function ruleOccursOn(rule: RecurringRule, date: LocalDate): boolean {
	if (compareDate(date, rule.startDate) < 0) {
		return false;
	}
	if (rule.endDate !== null && compareDate(date, rule.endDate) > 0) {
		return false;
	}
	switch (rule.frequency) {
		case 'weekly':
			return rule.daysOfWeek.includes(weekdayOf(date));
		case 'monthlyByDay':
			return rule.daysOfMonth.includes(dayOfMonth(date));
		case 'monthlyLastDay':
			return dayOfMonth(date) === daysInMonth(date);
	}
}

/**
 * The start and end time this series ran at on `date`.
 *
 * The history holds only PAST times, so the common case — a series whose time
 * was never edited, and every date from the last edit onwards — falls straight
 * through to the current default without reading the list at all.
 */
export function timeOn(
	rule: Pick<
		RecurringRule,
		'defaultStartTime' | 'defaultEndTime' | 'timeHistory'
	>,
	date: LocalDate,
): { startTime: LocalTime; endTime: LocalTime | null } {
	for (const segment of rule.timeHistory) {
		if (compareDate(date, segment.until) < 0) {
			return { startTime: segment.startTime, endTime: segment.endTime };
		}
	}
	return { startTime: rule.defaultStartTime, endTime: rule.defaultEndTime };
}

/**
 * The patch that moves a series to a new time from `from` onwards, leaving
 * every earlier session at the time it already had.
 *
 * Two compactions keep the history from growing without bound:
 *  - a rule with no sessions before `from` has no past to protect, so the old
 *    time is simply dropped;
 *  - editing twice on the same day records only the time that actually reached
 *    a past date — the intermediate value never did.
 */
export function withTimeFrom(
	rule: RecurringRule,
	from: LocalDate,
	startTime: LocalTime,
	endTime: LocalTime | null,
): Pick<RecurringRule, 'defaultStartTime' | 'defaultEndTime' | 'timeHistory'> {
	if (startTime === rule.defaultStartTime && endTime === rule.defaultEndTime) {
		return {
			defaultStartTime: rule.defaultStartTime,
			defaultEndTime: rule.defaultEndTime,
			timeHistory: rule.timeHistory,
		};
	}

	const hasPast = compareDate(rule.startDate, from) < 0;
	const alreadyRecorded =
		rule.timeHistory.length > 0 &&
		rule.timeHistory.at(-1)?.until === from;

	return {
		defaultStartTime: startTime,
		defaultEndTime: endTime,
		timeHistory:
			!hasPast || alreadyRecorded
				? rule.timeHistory
				: [
					...rule.timeHistory,
					{
						until: from,
						startTime: rule.defaultStartTime,
						endTime: rule.defaultEndTime,
					},
				],
	};
}

/** True when the override changes content, not merely status (FR-026a). */
export function overridesContent(override: RecurrenceOverride): boolean {
	return CONTENT_FIELDS.some(field => field in override);
}

/**
 * How many occurrences fall in [from, to], inclusive.
 *
 * Deliberately never a day-by-day walk: the delete warning and the apply-scope
 * sheet call this while the user is waiting, and a 365-iteration loop on the JS
 * thread for a number is work the user pays for (Principle VI). Weekly is
 * arithmetic; the monthly kinds step by MONTH, so a 12-month window costs a
 * dozen iterations rather than 365.
 */
export function countOccurrences(
	rule: RecurringRule,
	from: LocalDate,
	to: LocalDate,
): number {
	const start = compareDate(from, rule.startDate) > 0 ? from : rule.startDate;
	const end =
		rule.endDate !== null && compareDate(rule.endDate, to) < 0
			? rule.endDate
			: to;

	if (compareDate(start, end) > 0) {
		return 0;
	}

	return rule.frequency === 'weekly'
		? countWeekly(rule.daysOfWeek, start, end)
		: countMonthly(rule, start, end);
}

function countWeekly(
	daysOfWeek: readonly Weekday[],
	start: LocalDate,
	end: LocalDate,
): number {
	if (daysOfWeek.length === 0) {
		return 0;
	}
	const span = daysBetween(start, end) + 1;
	const wholeWeeks = Math.floor(span / 7);
	let total = wholeWeeks * daysOfWeek.length;

	// Remaining days form a partial week beginning at `start`.
	const leftover = span % 7;
	for (let i = 0; i < leftover; i++) {
		if (daysOfWeek.includes(weekdayOf(addDays(start, wholeWeeks * 7 + i)))) {
			total += 1;
		}
	}
	return total;
}

function countMonthly(
	rule: RecurringRule,
	start: LocalDate,
	end: LocalDate,
): number {
	// De-duplicated because two chips can never mean two sessions on one date;
	// the set also makes "chọn ngày 5 hai lần" impossible to count twice.
	const days =
		rule.frequency === 'monthlyByDay' ? [...new Set(rule.daysOfMonth)] : null;
	if (days !== null && days.length === 0) {
		return 0;
	}

	let total = 0;
	for (
		let month = startOfMonth(start);
		compareDate(month, end) <= 0;
		month = addMonths(month, 1)
	) {
		// null is a month that simply has no such day — the gap is the point.
		const dates =
			days === null
				? [lastDayOfMonth(month)]
				: days.map(day => dateInMonth(month, day));
		for (const date of dates) {
			if (date !== null && within(date, start, end)) {
				total += 1;
			}
		}
	}
	return total;
}

function within(date: LocalDate, start: LocalDate, end: LocalDate): boolean {
	return compareDate(date, start) >= 0 && compareDate(date, end) <= 0;
}

/**
 * Which months in the next year a `monthlyByDay` rule will produce nothing for.
 *
 * Feeds the warning in the recurrence sheet. Someone who picks the 31st and is
 * not told about February reads the missing sessions as a bug in the app.
 */
export function monthsWithoutDay(
	daysOfMonth: readonly number[],
	from: LocalDate,
): number[] {
	const missing = new Set<number>();
	for (const day of daysOfMonth) {
		// Every month has 28 days, so nothing at or below it can ever be missing.
		if (day <= 28) {
			continue;
		}
		for (let i = 0; i < 12; i++) {
			const month = addMonths(startOfMonth(from), i);
			if (dateInMonth(month, day) === null) {
				missing.add(Number(month.slice(5, 7)));
			}
		}
	}
	return [...missing].sort((a, b) => a - b);
}
