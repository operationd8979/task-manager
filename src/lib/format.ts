import { t } from '../i18n';
import { parseLocalDate, weekdayOf, type LocalDate, type Weekday } from './date';
import type { RepeatSummary } from '../domain/timeline';

/**
 * Display formatting that is composed at runtime.
 *
 * Kept out of the catalogue because these are built rather than looked up; the
 * catalogue holds fixed sentences, this holds the rules that assemble variable
 * ones. Every word still comes from the catalogue — what lives here is the
 * arithmetic and the ordering, not the language.
 *
 * These call the module-level `t` rather than the hook, because they are plain
 * functions with no render of their own. That is safe as long as they are
 * called DURING a render that subscribed to the locale, which every caller does
 * via `useT()`. Calling one from a `useMemo` that omits `t` from its
 * dependency list would freeze its output at the language of the first render —
 * which is why `useT` gives `t` an identity that moves with the locale.
 *
 * The switch statements are deliberate. Building the key from the weekday
 * number would read better and would also make all seven keys invisible to the
 * extraction CLI, which would then delete them from every locale file as
 * unused. Written out, each key is one the tooling can see and `tsc` can check.
 */

function weekdayLongName(day: Weekday): string {
	switch (day) {
		case 1:
			return t('weekday.long.1');
		case 2:
			return t('weekday.long.2');
		case 3:
			return t('weekday.long.3');
		case 4:
			return t('weekday.long.4');
		case 5:
			return t('weekday.long.5');
		case 6:
			return t('weekday.long.6');
		case 7:
			return t('weekday.long.7');
	}
}

export function weekdayShort(day: Weekday): string {
	switch (day) {
		case 1:
			return t('weekday.short.1');
		case 2:
			return t('weekday.short.2');
		case 3:
			return t('weekday.short.3');
		case 4:
			return t('weekday.short.4');
		case 5:
			return t('weekday.short.5');
		case 6:
			return t('weekday.short.6');
		case 7:
			return t('weekday.short.7');
	}
}

export function weekdayLong(date: LocalDate): string {
	return weekdayLongName(weekdayOf(date));
}

/**
 * "Thứ Hai 03/08" · "Monday 8/3" · "8月3日 月曜日" — the day bar title.
 *
 * Both the zero-padded and the plain form of each number are handed to the
 * template, because which one reads as natural is a property of the language,
 * not of the data: Vietnamese wants 03/08, Japanese wants 8月3日.
 */
export function dayLabel(date: LocalDate): string {
	const d = parseLocalDate(date);
	const day = d.getDate();
	const month = d.getMonth() + 1;
	return t('format.dayLabel', {
		weekday: weekdayLong(date),
		day: String(day).padStart(2, '0'),
		month: String(month).padStart(2, '0'),
		dayNumber: day,
		monthNumber: month,
	});
}

/**
 * "5 giờ", "20 phút", "2 ngày" — always a concrete amount.
 *
 * The overdue label must name how late it is; a bare exclamation mark tells the
 * user nothing they can act on (design/ux-ui-spec.md §1).
 *
 * The amount goes in as `count`, not as an ordinary variable, so English can
 * pick "1 minute" over "1 minutes". Vietnamese and Japanese have one form and
 * ignore the distinction.
 */
export function durationLabel(minutes: number): string {
	if (minutes < 60) {
		return t('duration.minutes', undefined, { count: Math.max(minutes, 1) });
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return t('duration.hours', undefined, { count: hours });
	}
	return t('duration.days', undefined, { count: Math.floor(hours / 24) });
}

/** "−10′" / "đúng giờ" for the reminder chip on a row. */
export function reminderOffsetLabel(minutes: number): string {
	return minutes === 0
		? t('reminder.onTime')
		: t('reminder.offsetShort', { minutes });
}

/**
 * "04:59" — the row countdown, always mm:ss.
 *
 * Fixed width on purpose: the value changes every second, and a label that
 * switches between "5:00" and "59" makes the whole row twitch. Pair it with the
 * tabular-numeral clock token or the digits still shift inside that width.
 *
 * Digits only, so it is the same in all three languages.
 */
export function countdownLabel(seconds: number): string {
	const whole = Math.max(seconds, 0);
	const minutes = Math.floor(whole / 60);
	const rest = whole % 60;
	return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** "09:00–10:00" or "09:00" when the task is a single moment. */
export function timeRangeLabel(
	start: string,
	end: string | null,
): string {
	return end === null ? start : `${start}–${end}`;
}

/** "T2, T4, T6" — the weekdays a series runs on, in week order. */
export function weekdayList(days: readonly Weekday[]): string {
	return [...days].sort((a, b) => a - b).map(weekdayShort).join(', ');
}

/** "1, 15, 31" — the days of the month a series runs on, in order. */
export function dayOfMonthList(days: readonly number[]): string {
	return [...new Set(days)].sort((a, b) => a - b).join(', ');
}

/**
 * "T2, T4" / "ngày 1, 15" / "cuối tháng" — the variable half of every sentence
 * that has to name a repeat pattern.
 *
 * One function for the row label, the form summary and the recurrence preview,
 * so a series cannot describe itself one way on the timeline and another way in
 * the sheet that created it.
 */
export function repeatPatternLabel(summary: RepeatSummary): string {
	switch (summary.frequency) {
		case 'weekly':
			return weekdayList(summary.daysOfWeek);
		case 'monthlyByDay':
			return t('repeat.patternMonthDays', {
				days: dayOfMonthList(summary.daysOfMonth),
			});
		case 'monthlyLastDay':
			return t('repeat.patternLastDay');
	}
}

/**
 * Two forms of every month name, because the calendar header and the mid-
 * sentence warning need different ones: Vietnamese writes "Tháng 8" standing
 * alone and "tháng 8" inside a sentence. English and Japanese happen to use the
 * same string for both, which is exactly why the choice belongs to the
 * catalogue rather than to a `toLowerCase()` here.
 */
export function monthStandalone(month: number): string {
	switch (month) {
		case 1:
			return t('month.standalone.1');
		case 2:
			return t('month.standalone.2');
		case 3:
			return t('month.standalone.3');
		case 4:
			return t('month.standalone.4');
		case 5:
			return t('month.standalone.5');
		case 6:
			return t('month.standalone.6');
		case 7:
			return t('month.standalone.7');
		case 8:
			return t('month.standalone.8');
		case 9:
			return t('month.standalone.9');
		case 10:
			return t('month.standalone.10');
		case 11:
			return t('month.standalone.11');
		default:
			return t('month.standalone.12');
	}
}

function monthInline(month: number): string {
	switch (month) {
		case 1:
			return t('month.inline.1');
		case 2:
			return t('month.inline.2');
		case 3:
			return t('month.inline.3');
		case 4:
			return t('month.inline.4');
		case 5:
			return t('month.inline.5');
		case 6:
			return t('month.inline.6');
		case 7:
			return t('month.inline.7');
		case 8:
			return t('month.inline.8');
		case 9:
			return t('month.inline.9');
		case 10:
			return t('month.inline.10');
		case 11:
			return t('month.inline.11');
		default:
			return t('month.inline.12');
	}
}

/** "tháng 2, tháng 4" — the months a day-of-month series will skip. */
export function monthList(months: readonly number[]): string {
	return months.map(monthInline).join(', ');
}
