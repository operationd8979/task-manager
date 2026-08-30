import {
	createMemoryAdapter,
	resetMemoryAdapter,
} from '@chipmobilesdk/rn-local-db/testing';
import type { DatabaseHandle } from '@chipmobilesdk/rn-local-db';

import { ruleOccursOn, type NewRecurringRule } from '../../../domain/recurrence';
import { COLLECTIONS, MIGRATIONS, SCHEMA_VERSION } from '../schema';
import { createRecurrenceRepository } from '../recurrenceRepository';

/**
 * The fields added in schema v2 have to survive a write-and-read cycle
 * (change.md §2, §4).
 *
 * Both are encoded into strings, because the field type set has no array — and
 * an encoding that loses a value on the way back is the kind of bug that shows
 * up as "my monthly task stopped repeating" a month after the release.
 */

const draft = (patch: Partial<NewRecurringRule> = {}): NewRecurringRule => ({
	title: 'Đóng tiền nhà',
	note: null,
	startDate: '2026-01-01',
	endDate: null,
	frequency: 'monthlyByDay',
	daysOfWeek: [],
	daysOfMonth: [1, 15],
	defaultStartTime: '09:00',
	defaultEndTime: null,
	timeHistory: [],
	reminderEnabled: false,
	reminderOffsetMinutes: 0,
	...patch,
});

async function openHandle(): Promise<DatabaseHandle> {
	return createMemoryAdapter().open({
		name: 'timeline_recurrence_test',
		scope: { kind: 'guest' },
		schemaVersion: SCHEMA_VERSION,
		collections: COLLECTIONS,
		migrations: MIGRATIONS,
	});
}

describe('recurrence repository round trip', () => {
	let handle: DatabaseHandle;

	beforeEach(async () => {
		await resetMemoryAdapter();
		handle = await openHandle();
	});

	afterEach(async () => {
		await handle.close();
	});

	it('keeps the frequency and the days of the month', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(draft());

		const read = await repository.findRule(created.id);
		expect(read?.frequency).toBe('monthlyByDay');
		expect(read?.daysOfMonth).toEqual([1, 15]);
		expect(read?.daysOfWeek).toEqual([]);
	});

	it('keeps a last-day-of-month series with no day list', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(
			draft({ frequency: 'monthlyLastDay', daysOfMonth: [] }),
		);

		const read = await repository.findRule(created.id);
		expect(read?.frequency).toBe('monthlyLastDay');
		expect(read?.daysOfMonth).toEqual([]);
	});

	it('keeps a time history, including an entry with no end time', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(
			draft({
				timeHistory: [
					{ until: '2026-03-01', startTime: '07:00', endTime: '07:30' },
					{ until: '2026-06-01', startTime: '08:00', endTime: null },
				],
			}),
		);

		const read = await repository.findRule(created.id);
		expect(read?.timeHistory).toEqual([
			{ until: '2026-03-01', startTime: '07:00', endTime: '07:30' },
			{ until: '2026-06-01', startTime: '08:00', endTime: null },
		]);
	});

	it('keeps the weekday encoding working alongside the new fields', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(
			draft({ frequency: 'weekly', daysOfWeek: [1, 3, 5], daysOfMonth: [] }),
		);

		const read = await repository.findRule(created.id);
		expect(read?.daysOfWeek).toEqual([1, 3, 5]);
	});

	/**
	 * Ending a series is a date change, not a delete (change.md §5).
	 *
	 * The rule stays on disk precisely so the days it already produced still
	 * produce them — this is the read the timeline does for a past day.
	 */
	it('still produces past sessions after the series is ended', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(
			draft({ frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }),
		);

		await repository.updateRule(created.id, { endDate: '2026-06-14' });
		const ended = await repository.findRule(created.id);

		expect(ended).not.toBeNull();
		expect(ruleOccursOn(ended!, '2026-06-10')).toBe(true);
		expect(ruleOccursOn(ended!, '2026-06-14')).toBe(true);
		expect(ruleOccursOn(ended!, '2026-06-15')).toBe(false);
	});

	it('leaves an ended series out of the reads for a later day', async () => {
		const repository = createRecurrenceRepository(handle);
		const created = await repository.createRule(
			draft({ frequency: 'weekly', daysOfWeek: [1, 2, 3, 4, 5, 6, 7] }),
		);
		await repository.updateRule(created.id, { endDate: '2026-06-14' });

		expect(await repository.listRulesEffectiveOn('2026-06-10')).toHaveLength(1);
		expect(await repository.listRulesEffectiveOn('2026-06-20')).toHaveLength(0);
	});
});
