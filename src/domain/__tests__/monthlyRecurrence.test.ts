import {
	countOccurrences,
	monthsWithoutDay,
	ruleOccursOn,
	type RecurringRule,
} from '../recurrence';

/**
 * Monthly recurrence (change.md §2).
 *
 * The decision this file protects is that a month WITHOUT the chosen day
 * produces nothing, rather than nudging the session to the 28th. Nudging is
 * invisible in a unit test and obvious to a user in February, which is the
 * wrong way round — so it is pinned here.
 */

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
	id: 'r1',
	title: 'Đóng tiền nhà',
	note: null,
	startDate: '2026-01-01',
	endDate: null,
	frequency: 'monthlyByDay',
	daysOfWeek: [],
	daysOfMonth: [31],
	defaultStartTime: '09:00',
	defaultEndTime: null,
	timeHistory: [],
	reminderEnabled: false,
	reminderOffsetMinutes: 0,
	...over,
});

describe('monthlyByDay', () => {
	it('occurs on the chosen day of every month that has it', () => {
		expect(ruleOccursOn(rule(), '2026-01-31')).toBe(true);
		expect(ruleOccursOn(rule(), '2026-03-31')).toBe(true);
	});

	it('produces NOTHING in a month without that day, rather than moving it', () => {
		// 2026 is not a leap year, so February ends on the 28th.
		expect(ruleOccursOn(rule(), '2026-02-28')).toBe(false);
		// April has 30 days.
		expect(ruleOccursOn(rule(), '2026-04-30')).toBe(false);
	});

	it('ignores the weekday entirely', () => {
		// 2026-01-31 is a Saturday, 2026-03-31 a Tuesday. Both occur.
		expect(ruleOccursOn(rule(), '2026-01-31')).toBe(true);
		expect(ruleOccursOn(rule(), '2026-03-31')).toBe(true);
	});

	it('honours the start and end dates', () => {
		const r = rule({ startDate: '2026-02-01', endDate: '2026-05-31' });
		expect(ruleOccursOn(r, '2026-01-31')).toBe(false);
		expect(ruleOccursOn(r, '2026-05-31')).toBe(true);
		expect(ruleOccursOn(r, '2026-07-31')).toBe(false);
	});

	it('counts only the months that actually have the day', () => {
		// Jan–Dec 2026 has 31 days in Jan, Mar, May, Jul, Aug, Oct, Dec — seven.
		expect(countOccurrences(rule(), '2026-01-01', '2026-12-31')).toBe(7);
	});

	it('counts several chosen days without double-counting a repeat', () => {
		const r = rule({ daysOfMonth: [1, 15, 15] });
		// Two distinct days, twelve months.
		expect(countOccurrences(r, '2026-01-01', '2026-12-31')).toBe(24);
	});

	it('is zero when no day of the month is chosen', () => {
		expect(
			countOccurrences(rule({ daysOfMonth: [] }), '2026-01-01', '2026-12-31'),
		).toBe(0);
	});

	it('clips the count to a partial first and last month', () => {
		const r = rule({ daysOfMonth: [10, 20] });
		// 2026-01-15 .. 2026-02-15 covers Jan 20 and Feb 10.
		expect(countOccurrences(r, '2026-01-15', '2026-02-15')).toBe(2);
	});
});

describe('monthlyLastDay', () => {
	const last = rule({ frequency: 'monthlyLastDay', daysOfMonth: [] });

	it('occurs on whatever the last day of that month happens to be', () => {
		expect(ruleOccursOn(last, '2026-01-31')).toBe(true);
		expect(ruleOccursOn(last, '2026-02-28')).toBe(true);
		expect(ruleOccursOn(last, '2026-04-30')).toBe(true);
	});

	it('follows February into a leap year rather than assuming 28', () => {
		// 2028 is a leap year: the 29th is the last day, the 28th is not.
		expect(ruleOccursOn(last, '2028-02-29')).toBe(true);
		expect(ruleOccursOn(last, '2028-02-28')).toBe(false);
	});

	it('does not occur on any other day', () => {
		expect(ruleOccursOn(last, '2026-01-30')).toBe(false);
		expect(ruleOccursOn(last, '2026-03-01')).toBe(false);
	});

	it('counts exactly one session per month in the window', () => {
		expect(countOccurrences(last, '2026-01-01', '2026-12-31')).toBe(12);
	});

	it('excludes a final month whose last day falls past the window', () => {
		// Ends mid-December, so December's session is outside the range.
		expect(countOccurrences(last, '2026-01-01', '2026-12-15')).toBe(11);
	});
});

describe('monthsWithoutDay', () => {
	it('names the months a day-31 series will skip', () => {
		// From January 2026: Feb, Apr, Jun, Sep, Nov have no 31st.
		expect(monthsWithoutDay([31], '2026-01-01')).toEqual([2, 4, 6, 9, 11]);
	});

	it('names only February for day 30, and only that in a common year', () => {
		expect(monthsWithoutDay([30], '2026-01-01')).toEqual([2]);
	});

	it('says nothing at all for days every month has', () => {
		expect(monthsWithoutDay([1, 15, 28], '2026-01-01')).toEqual([]);
	});

	it('finds no gap for day 29 across a leap February', () => {
		// The twelve months from 2028-01 include 2028-02, which has a 29th.
		expect(monthsWithoutDay([29], '2028-01-01')).toEqual([]);
		// The twelve months from 2026-01 do not.
		expect(monthsWithoutDay([29], '2026-01-01')).toEqual([2]);
	});
});
