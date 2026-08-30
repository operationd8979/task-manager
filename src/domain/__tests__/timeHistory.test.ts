import { buildOccurrences } from '../occurrence';
import {
	timeOn,
	withTimeFrom,
	type RecurringRule,
	type TimeSegment,
} from '../recurrence';

/**
 * Editing a series' time must not rewrite its history (change.md §4).
 *
 * The failure this guards against is quiet and total: change a habit from 07:00
 * to 08:00 and every session you ever completed at 07:00 starts claiming it was
 * at 08:00. Occurrences are computed, so there is no stored row to disagree —
 * the only thing standing between the user and a rewritten past is this.
 */

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
	id: 'r1',
	title: 'Tập thể dục',
	note: null,
	startDate: '2026-01-05',
	endDate: null,
	frequency: 'weekly',
	daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
	daysOfMonth: [],
	defaultStartTime: '08:00',
	defaultEndTime: '09:00',
	timeHistory: [],
	reminderEnabled: false,
	reminderOffsetMinutes: 0,
	...over,
});

const segment = (
	until: string,
	startTime: string,
	endTime: string | null = null,
): TimeSegment => ({ until, startTime, endTime });

describe('timeOn', () => {
	it('uses the current default when nothing was ever edited', () => {
		expect(timeOn(rule(), '2026-03-01')).toEqual({
			startTime: '08:00',
			endTime: '09:00',
		});
	});

	it('uses the old time for a date before the edit', () => {
		const r = rule({ timeHistory: [segment('2026-02-01', '07:00', '07:30')] });
		expect(timeOn(r, '2026-01-31')).toEqual({
			startTime: '07:00',
			endTime: '07:30',
		});
	});

	it('uses the new time from the edit date itself onwards', () => {
		const r = rule({ timeHistory: [segment('2026-02-01', '07:00', '07:30')] });
		// `until` is exclusive, so the edit date is already the new time.
		expect(timeOn(r, '2026-02-01').startTime).toBe('08:00');
		expect(timeOn(r, '2026-06-01').startTime).toBe('08:00');
	});

	it('picks the right era when the time was edited more than once', () => {
		const r = rule({
			defaultStartTime: '09:00',
			timeHistory: [
				segment('2026-02-01', '07:00'),
				segment('2026-05-01', '08:00'),
			],
		});
		expect(timeOn(r, '2026-01-15').startTime).toBe('07:00');
		expect(timeOn(r, '2026-03-15').startTime).toBe('08:00');
		expect(timeOn(r, '2026-06-15').startTime).toBe('09:00');
	});

	it('carries a null end time through the history unchanged', () => {
		const r = rule({ timeHistory: [segment('2026-02-01', '07:00', null)] });
		expect(timeOn(r, '2026-01-10').endTime).toBeNull();
	});
});

describe('withTimeFrom', () => {
	it('records the old time and installs the new one', () => {
		const next = withTimeFrom(rule(), '2026-03-01', '10:00', '11:00');
		expect(next.defaultStartTime).toBe('10:00');
		expect(next.defaultEndTime).toBe('11:00');
		expect(next.timeHistory).toEqual([segment('2026-03-01', '08:00', '09:00')]);
	});

	it('writes no history for a series with nothing behind the cutoff', () => {
		// Starts the same day it is edited: there is no past to protect, so
		// recording one would leave a segment that can never be reached.
		const r = rule({ startDate: '2026-03-01' });
		const next = withTimeFrom(r, '2026-03-01', '10:00', null);
		expect(next.timeHistory).toEqual([]);
	});

	it('leaves the rule alone when the time did not actually change', () => {
		const next = withTimeFrom(rule(), '2026-03-01', '08:00', '09:00');
		expect(next.timeHistory).toEqual([]);
		expect(next.defaultStartTime).toBe('08:00');
	});

	it('does not stack a second entry for two edits on the same day', () => {
		const first = withTimeFrom(rule(), '2026-03-01', '10:00', null);
		const second = withTimeFrom(
			{ ...rule(), ...first },
			'2026-03-01',
			'11:00',
			null,
		);
		// 10:00 never applied to a past date, so it is not part of the history.
		expect(second.timeHistory).toEqual([segment('2026-03-01', '08:00', '09:00')]);
		expect(second.defaultStartTime).toBe('11:00');
	});
});

describe('an edited series on the timeline', () => {
	const edited = rule({
		...rule(),
		...withTimeFrom(rule(), '2026-03-01', '10:00', '11:00'),
	});

	it('shows a past session at the time it actually happened', () => {
		const [occurrence] = buildOccurrences([edited], [], '2026-02-20');
		expect(occurrence.startTime).toBe('08:00');
		expect(occurrence.endTime).toBe('09:00');
	});

	it('shows a session from the edit date on at the new time', () => {
		const [occurrence] = buildOccurrences([edited], [], '2026-03-01');
		expect(occurrence.startTime).toBe('10:00');
		expect(occurrence.endTime).toBe('11:00');
	});

	it('still lets one session override the time for itself', () => {
		const [occurrence] = buildOccurrences(
			[edited],
			[
				{
					ruleId: 'r1',
					occurrenceDate: '2026-02-20',
					isSkipped: false,
					startTime: '06:00',
				},
			],
			'2026-02-20',
		);
		expect(occurrence.startTime).toBe('06:00');
	});
});
