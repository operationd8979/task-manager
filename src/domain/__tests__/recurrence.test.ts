import {
	countOccurrences,
	ruleOccursOn,
	type RecurringRule,
} from '../recurrence';

/**
 * The edge cases contracts/recurrence.md lists as mandatory. Every one of them
 * is a bug that would reach a user as "my repeating task is on the wrong day"
 * and be very hard to reproduce from that description.
 */

// 2026-08-03 is a Monday.
const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
	id: 'r1',
	title: 'Tập thể dục',
	note: null,
	startDate: '2026-08-03',
	endDate: null,
	daysOfWeek: [1, 3, 5],
	defaultStartTime: '07:00',
	defaultEndTime: '07:30',
	reminderEnabled: false,
	reminderOffsetMinutes: 0,
	...over,
});

describe('ruleOccursOn', () => {
	it('produces nothing before the start date, even on a chosen weekday', () => {
		// 2026-07-27 is also a Monday, one week earlier.
		expect(ruleOccursOn(rule(), '2026-07-27')).toBe(false);
	});

	it('produces an occurrence on a chosen weekday from the start date on', () => {
		expect(ruleOccursOn(rule(), '2026-08-03')).toBe(true); // Monday
		expect(ruleOccursOn(rule(), '2026-08-05')).toBe(true); // Wednesday
	});

	it('skips weekdays that are not selected', () => {
		expect(ruleOccursOn(rule(), '2026-08-04')).toBe(false); // Tuesday
	});

	it('INCLUDES the end date itself when it falls on a chosen weekday', () => {
		const r = rule({ endDate: '2026-08-05' }); // a Wednesday
		expect(ruleOccursOn(r, '2026-08-05')).toBe(true);
		expect(ruleOccursOn(r, '2026-08-07')).toBe(false);
	});

	it('keeps producing occurrences far ahead when there is no end date', () => {
		// Both are Mondays, five years out. An unbounded series must not quietly
		// stop at some internal horizon (FR-022).
		expect(ruleOccursOn(rule(), '2031-08-04')).toBe(true);
		expect(ruleOccursOn(rule(), '2030-08-05')).toBe(true);
		// Still a Tuesday five years out, so still excluded.
		expect(ruleOccursOn(rule(), '2031-08-05')).toBe(false);
	});

	it('produces nothing when no weekday is selected', () => {
		expect(ruleOccursOn(rule({ daysOfWeek: [] }), '2026-08-03')).toBe(false);
	});
});

describe('countOccurrences', () => {
	it('counts a whole number of weeks exactly', () => {
		// 2026-08-03 .. 2026-08-30 is 4 weeks, 3 weekdays each.
		expect(countOccurrences(rule(), '2026-08-03', '2026-08-30')).toBe(12);
	});

	it('counts a partial week from the correct weekday', () => {
		// Mon 03 .. Thu 06 covers Mon and Wed.
		expect(countOccurrences(rule(), '2026-08-03', '2026-08-06')).toBe(2);
	});

	it('never counts before the rule starts', () => {
		expect(countOccurrences(rule(), '2026-07-01', '2026-08-03')).toBe(1);
	});

	it('never counts past the end date', () => {
		const r = rule({ endDate: '2026-08-05' });
		expect(countOccurrences(r, '2026-08-03', '2026-12-31')).toBe(2);
	});

	it('is zero for an empty range and for no selected weekdays', () => {
		expect(countOccurrences(rule(), '2026-08-30', '2026-08-03')).toBe(0);
		expect(
			countOccurrences(rule({ daysOfWeek: [] }), '2026-08-03', '2026-08-30'),
		).toBe(0);
	});

	it('handles a 365-day window without walking it', () => {
		// 365 days = 52 whole weeks (156) + 1 leftover day, which is a Monday.
		expect(countOccurrences(rule(), '2026-08-03', '2027-08-02')).toBe(157);
	});
});
