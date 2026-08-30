import { parseLocalDate, weekdayOf, type LocalDate, type Weekday } from './date';
import type { RepeatSummary } from '../domain/timeline';

/**
 * Vietnamese display formatting.
 *
 * Kept out of strings.ts because these are composed at runtime rather than
 * looked up; the catalogue holds fixed sentences, this holds the rules that
 * build variable ones.
 */

const WEEKDAY_LONG: Record<Weekday, string> = {
	1: 'Thứ Hai',
	2: 'Thứ Ba',
	3: 'Thứ Tư',
	4: 'Thứ Năm',
	5: 'Thứ Sáu',
	6: 'Thứ Bảy',
	7: 'Chủ Nhật',
};

const WEEKDAY_SHORT: Record<Weekday, string> = {
	1: 'T2',
	2: 'T3',
	3: 'T4',
	4: 'T5',
	5: 'T6',
	6: 'T7',
	7: 'CN',
};

export function weekdayLong(date: LocalDate): string {
	return WEEKDAY_LONG[weekdayOf(date)];
}

export function weekdayShort(day: Weekday): string {
	return WEEKDAY_SHORT[day];
}

/** "Thứ Hai 03/08" — the day bar title. */
export function dayLabel(date: LocalDate): string {
	const d = parseLocalDate(date);
	const day = String(d.getDate()).padStart(2, '0');
	const month = String(d.getMonth() + 1).padStart(2, '0');
	return `${weekdayLong(date)} ${day}/${month}`;
}

/**
 * "5 giờ", "20 phút", "2 ngày" — always a concrete amount.
 *
 * The overdue label must name how late it is; a bare exclamation mark tells the
 * user nothing they can act on (design/ux-ui-spec.md §1).
 */
export function durationLabel(minutes: number): string {
	if (minutes < 60) {
		return `${Math.max(minutes, 1)} phút`;
	}
	const hours = Math.floor(minutes / 60);
	if (hours < 24) {
		return `${hours} giờ`;
	}
	return `${Math.floor(hours / 24)} ngày`;
}

/** "−10′" / "đúng giờ" for the reminder chip on a row. */
export function reminderOffsetLabel(minutes: number): string {
	return minutes === 0 ? 'đúng giờ' : `−${minutes}′`;
}

/**
 * "04:59" — the row countdown, always mm:ss.
 *
 * Fixed width on purpose: the value changes every second, and a label that
 * switches between "5:00" and "59" makes the whole row twitch. Pair it with the
 * tabular-numeral clock token or the digits still shift inside that width.
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
			return `ngày ${dayOfMonthList(summary.daysOfMonth)}`;
		case 'monthlyLastDay':
			return 'cuối tháng';
	}
}

const MONTH_NAMES = [
	'tháng 1',
	'tháng 2',
	'tháng 3',
	'tháng 4',
	'tháng 5',
	'tháng 6',
	'tháng 7',
	'tháng 8',
	'tháng 9',
	'tháng 10',
	'tháng 11',
	'tháng 12',
];

/** "tháng 2, tháng 4" — the months a day-of-month series will skip. */
export function monthList(months: readonly number[]): string {
	return months.map(m => MONTH_NAMES[m - 1] ?? `tháng ${m}`).join(', ');
}
