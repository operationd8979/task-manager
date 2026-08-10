import { parseLocalDate, weekdayOf, type LocalDate, type Weekday } from './date';

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
