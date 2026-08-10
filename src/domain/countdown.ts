import { toDateTime, type LocalDate, type LocalTime } from '../lib/date';

/**
 * The row countdown.
 *
 * Deliberately a separate concept from `reminder.ts`, and the two must not be
 * confused again: a reminder is one notification the OS rings for a task the
 * user asked to be reminded about, while the countdown is a property of the
 * LIST. Every task counts down, whether or not it has a reminder, and the
 * window is one app-wide setting rather than a per-task field.
 */

/**
 * Windows the settings screen offers, in minutes before the start.
 *
 * No zero. A zero-minute window opens and closes in the same instant, so the
 * countdown it produced could never be seen — offering it was offering a
 * setting that turns the feature off while looking like a value.
 */
export const COUNTDOWN_OFFSETS = [5, 10, 15, 30, 60] as const;

export type CountdownOffset = (typeof COUNTDOWN_OFFSETS)[number];

export const DEFAULT_COUNTDOWN_MINUTES: CountdownOffset = 5;

export function isCountdownOffset(value: number): value is CountdownOffset {
	return (COUNTDOWN_OFFSETS as readonly number[]).includes(value);
}

/** The instant a row starts counting down. */
export function countdownOpensAt(
	item: { taskDate: LocalDate; startTime: LocalTime },
	windowMinutes: number,
): Date | null {
	if (windowMinutes <= 0) {
		return null;
	}
	const start = toDateTime(item.taskDate, item.startTime);
	return new Date(start.getTime() - windowMinutes * 60_000);
}

/**
 * Whole seconds left until the start, or null when the row is not counting.
 *
 * Rounded UP so the last visible value is 00:01 and not 00:00 — a timer that
 * sits on zero for a second reads as stopped.
 */
export function countdownSeconds(
	item: { taskDate: LocalDate; startTime: LocalTime },
	now: Date,
	windowMinutes: number,
): number | null {
	const opensAt = countdownOpensAt(item, windowMinutes);
	if (opensAt === null) {
		return null;
	}
	const remaining =
		opensAt.getTime() + windowMinutes * 60_000 - now.getTime();
	if (remaining <= 0 || now.getTime() < opensAt.getTime()) {
		return null;
	}
	return Math.ceil(remaining / 1000);
}
