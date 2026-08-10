import {
	compareByStart,
	isOverdue,
	overdueByMinutes,
	validateTask,
	withStartTime,
	type NewTask,
} from '../task';

/**
 * These run without a renderer on purpose — `npx jest src/domain` must stay
 * green with no component mounted (Principle II, VIII).
 */

const base: NewTask = {
	title: 'Gọi khách hàng',
	note: null,
	taskDate: '2026-08-03',
	startTime: '09:00',
	endTime: '10:00',
	status: 'processing',
	reminderEnabled: false,
	reminderOffsetMinutes: 0,
};

const fields = (input: NewTask) => validateTask(input).map(e => e.field);

describe('validateTask', () => {
	it('accepts a well-formed task', () => {
		expect(validateTask(base)).toEqual([]);
	});

	it('rejects a title that is empty after trimming', () => {
		expect(fields({ ...base, title: '   ' })).toContain('title');
	});

	it('rejects an end time equal to the start time', () => {
		expect(fields({ ...base, endTime: '09:00' })).toContain('endTime');
	});

	it('rejects an end time before the start time', () => {
		expect(fields({ ...base, endTime: '08:59' })).toContain('endTime');
	});

	it('accepts an absent end time — a task may be a single moment', () => {
		expect(validateTask({ ...base, endTime: null })).toEqual([]);
	});

	it('reports the start time in the end-time message so the fix is stated', () => {
		const [error] = validateTask({ ...base, endTime: '08:00' });
		expect(error.params).toEqual({ start: '09:00' });
	});

	it('rejects a calendar-invalid date', () => {
		expect(fields({ ...base, taskDate: '2026-02-31' })).toContain('taskDate');
	});

	it('rejects a reminder offset outside the supported set', () => {
		expect(fields({ ...base, reminderOffsetMinutes: 7 as never })).toContain(
			'reminderOffsetMinutes',
		);
	});
});

describe('isOverdue', () => {
	const at = (iso: string) => new Date(iso);

	it('is false for a completed task, however late', () => {
		expect(
			isOverdue({ ...base, status: 'done' }, at('2026-08-04T00:00:00')),
		).toBe(false);
	});

	it('measures from the end time when there is one', () => {
		expect(isOverdue(base, at('2026-08-03T09:30:00'))).toBe(false);
		expect(isOverdue(base, at('2026-08-03T10:01:00'))).toBe(true);
	});

	it('measures from the start time when there is no end time', () => {
		const moment = { ...base, endTime: null };
		expect(isOverdue(moment, at('2026-08-03T08:59:00'))).toBe(false);
		expect(isOverdue(moment, at('2026-08-03T09:01:00'))).toBe(true);
	});

	it('reports how late, for the label that must name a duration', () => {
		expect(overdueByMinutes(base, at('2026-08-03T15:00:00'))).toBe(300);
		expect(overdueByMinutes(base, at('2026-08-03T09:00:00'))).toBe(0);
	});
});

describe('withStartTime', () => {
	it('carries the end time so the duration survives a reschedule', () => {
		expect(withStartTime({ startTime: '09:00', endTime: '10:00' }, '10:15')).toEqual(
			{ startTime: '10:15', endTime: '11:15' },
		);
	});

	it('moves the end backwards too', () => {
		expect(withStartTime({ startTime: '14:00', endTime: '15:30' }, '08:00')).toEqual(
			{ startTime: '08:00', endTime: '09:30' },
		);
	});

	it('leaves a bare moment without an end time', () => {
		expect(withStartTime({ startTime: '09:00', endTime: null }, '11:00')).toEqual({
			startTime: '11:00',
			endTime: null,
		});
	});

	it('clamps to the end of the day rather than wrapping past midnight', () => {
		// Wrapping would produce 00:30, which reads as ending before it starts and
		// is exactly what validateTask rejects.
		expect(withStartTime({ startTime: '09:00', endTime: '10:00' }, '23:30')).toEqual(
			{ startTime: '23:30', endTime: '23:59' },
		);
	});

	it('produces a value validateTask accepts', () => {
		const next = withStartTime(base, '23:45');
		expect(validateTask({ ...base, ...next })).toEqual([]);
	});
});

describe('compareByStart', () => {
	it('orders by start time', () => {
		const rows = [
			{ startTime: '13:00', endTime: null, title: 'B' },
			{ startTime: '09:00', endTime: '10:00', title: 'A' },
		].sort(compareByStart);
		expect(rows.map(r => r.title)).toEqual(['A', 'B']);
	});

	it('puts a bare moment before a span that starts at the same time', () => {
		const rows = [
			{ startTime: '09:00', endTime: '10:00', title: 'span' },
			{ startTime: '09:00', endTime: null, title: 'moment' },
		].sort(compareByStart);
		expect(rows.map(r => r.title)).toEqual(['moment', 'span']);
	});

	it('is deterministic when start and end match', () => {
		const rows = [
			{ startTime: '09:00', endTime: '10:00', title: 'Bê' },
			{ startTime: '09:00', endTime: '10:00', title: 'An' },
		].sort(compareByStart);
		expect(rows.map(r => r.title)).toEqual(['An', 'Bê']);
	});
});
