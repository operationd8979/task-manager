import {
	COUNTDOWN_OFFSETS,
	countdownSeconds,
	DEFAULT_COUNTDOWN_MINUTES,
	isCountdownOffset,
} from '../countdown';

/**
 * The countdown is app-wide and has nothing to do with reminders.
 *
 * These live in their own file for the same reason the module does: the two
 * were one setting once, and "when the phone rings" kept being read as "when
 * the row starts counting", which is how a task with no reminder ended up with
 * no countdown either.
 */

describe('COUNTDOWN_OFFSETS', () => {
	it('offers no zero — a zero-minute window can never be seen', () => {
		expect(COUNTDOWN_OFFSETS).not.toContain(0);
		expect(isCountdownOffset(0)).toBe(false);
	});

	it('defaults to five minutes before the start', () => {
		expect(DEFAULT_COUNTDOWN_MINUTES).toBe(5);
		expect(isCountdownOffset(DEFAULT_COUNTDOWN_MINUTES)).toBe(true);
	});
});

describe('countdownSeconds', () => {
	const item = { taskDate: '2026-08-03', startTime: '09:00' };
	const at = (time: string) => new Date(`2026-08-03T${time}`);

	it('is null before the window opens', () => {
		expect(countdownSeconds(item, at('08:54:59'), 5)).toBeNull();
	});

	it('counts the full window at the instant it opens', () => {
		expect(countdownSeconds(item, at('08:55:00'), 5)).toBe(300);
	});

	it('rounds up, so the last visible value is one second and not zero', () => {
		expect(countdownSeconds(item, at('08:59:59'), 5)).toBe(1);
		expect(countdownSeconds(item, at('08:59:59.500'), 5)).toBe(1);
	});

	it('stops at the start time — after that the row is overdue, not pending', () => {
		expect(countdownSeconds(item, at('09:00:00'), 5)).toBeNull();
		expect(countdownSeconds(item, at('09:30:00'), 5)).toBeNull();
	});

	it('honours whichever window the setting holds', () => {
		expect(countdownSeconds(item, at('08:40:00'), 60)).toBe(1200);
		expect(countdownSeconds(item, at('08:40:00'), 5)).toBeNull();
	});

	it('crosses midnight backwards with the window', () => {
		const late = { taskDate: '2026-08-03', startTime: '00:10' };
		expect(countdownSeconds(late, new Date('2026-08-02T23:55:00'), 30)).toBe(
			900,
		);
	});
});
