import { minutesOf, type LocalTime } from '../../lib/date';

/**
 * Minutes from start to end, or null when there is no end time.
 *
 * Drives which duration chip is lit in the task form: a chip is selected while
 * the end really is start + its duration, however the end got there.
 */
export function durationMinutes(startTime: LocalTime, endTime: LocalTime | null): number | null {
	return endTime === null ? null : minutesOf(endTime) - minutesOf(startTime);
}
