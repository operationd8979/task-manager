import {
	createReconciler,
	createToneResolver,
	REPEAT_STOP_PREFIX,
	type NotificationRequest,
	type PendingEntry,
} from '@chipmobilesdk/rn-notification';
import { createFakeEngine } from '@chipmobilesdk/rn-notification/testing';

import type { RecurringRule } from '../../../domain/recurrence';
import type { Task } from '../../../domain/task';
import { reconcileReminders, type ReconcileInput } from '../reconcile';
import { REMINDER_DOMAIN, REMINDER_TONES, TONE_ALERT, TONE_SILENT } from '../tones';

const NOW = new Date('2026-08-03T06:00:00');

/**
 * The real SDK reconciler over the SDK's own fake engine.
 *
 * The property FR-041 actually asks for — running reconciliation twice must not
 * touch the OS the second time — is a property of the SDK's diffing, so the
 * test drives the real thing. A hand-written fake reconciler would assert that
 * the fake is idempotent, which is worth nothing.
 *
 * The clock is fixed at NOW: the reconciler refuses a moment more than 60s in
 * the past, so a wall-clock `Date.now()` would reject every entry the moment the
 * fixture date is behind the machine's.
 */
function harness() {
	const engine = createFakeEngine({
		now: NOW.getTime(),
		timeZone: 'Asia/Ho_Chi_Minh',
		initialPermissions: { display: 'granted', exactAlarm: 'granted' },
	});

	const reconciler = createReconciler({
		engine,
		resolveTone: createToneResolver(REMINDER_TONES),
		// Anchoring never converts the instant at schedule time — it only records
		// the zone the entry was anchored against — so a fixed zone keeps the test
		// independent of where it runs.
		timeZone: () => 'Asia/Ho_Chi_Minh',
		now: () => NOW.getTime(),
		canScheduleExactly: () => true,
	});

	const service = {
		reconcile: (desired: readonly NotificationRequest[]) =>
			reconciler.reconcile({ domain: REMINDER_DOMAIN, desired }),
	};

	/**
	 * The alert tone repeats, and a repeating notification costs a second entry:
	 * the SDK schedules a `cms.stop:` marker that ends the sound once the
	 * declared window elapses.
	 *
	 * `getPending()` already hides markers — that is what keeps a consumer's diff
	 * (and therefore idempotence) blind to them — but the raw operation log does
	 * not, so the assertions below filter it there. Markers are read back through
	 * the port that exists for them.
	 */
	const ids = (kind: 'schedule' | 'cancel') =>
		engine.operations
			.filter(
				op =>
					op.kind === kind &&
					!(op.id ?? '').startsWith(REPEAT_STOP_PREFIX),
			)
			.map(op => op.id);

	return {
		service,
		engine,
		scheduled: () => ids('schedule'),
		cancelled: () => ids('cancel'),
		reset: () => engine.clearOperations(),
		stops: () => engine.listRepeatStops(),
		held: async () => {
			const pending = await engine.getPending();
			return new Map(pending.map(entry => [entry.id, entry] as const));
		},
	};
}

async function heldEntry(
	fake: ReturnType<typeof harness>,
	id: string,
): Promise<PendingEntry | undefined> {
	return (await fake.held()).get(id);
}

const task = (over: Partial<Task> = {}): Task => ({
	id: 't1',
	title: 'Gọi khách hàng',
	note: null,
	taskDate: '2026-08-03',
	startTime: '09:00',
	endTime: null,
	status: 'processing',
	reminderEnabled: true,
	reminderOffsetMinutes: 15,
	...over,
});

const rule = (over: Partial<RecurringRule> = {}): RecurringRule => ({
	id: 'r1',
	title: 'Tập thể dục',
	note: null,
	startDate: '2026-08-03',
	endDate: null,
	daysOfWeek: [1],
	defaultStartTime: '07:00',
	defaultEndTime: null,
	reminderEnabled: true,
	reminderOffsetMinutes: 10,
	...over,
});

const input = (over: Partial<ReconcileInput> = {}): ReconcileInput => ({
	tasks: [task()],
	rules: [],
	overrides: [],
	now: NOW,
	...over,
});

describe('reconcileReminders', () => {
	it('schedules what is missing on the first run', async () => {
		const fake = harness();
		const report = await reconcileReminders(fake.service, input());
		expect(report.scheduled).toBe(1);
		expect(fake.scheduled()).toEqual(['task:t1']);
	});

	it('IS IDEMPOTENT: a second run touches nothing', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		fake.reset();

		const report = await reconcileReminders(fake.service, input());
		expect(fake.scheduled()).toEqual([]);
		expect(fake.cancelled()).toEqual([]);
		expect(report.scheduled).toBe(0);
		expect(report.cancelled).toBe(0);
		expect(report.unchanged).toBe(1);
	});

	it('cancels reminders the data no longer wants', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		fake.reset();

		await reconcileReminders(fake.service, input({ tasks: [] }));
		expect(fake.cancelled()).toEqual(['task:t1']);
	});

	it('keeps no reminder for a completed task', async () => {
		const fake = harness();
		await reconcileReminders(
			fake.service,
			input({ tasks: [task({ status: 'done' })] }),
		);
		expect((await fake.held()).size).toBe(0);
	});

	it('skips a reminder whose moment has already passed', async () => {
		const fake = harness();
		await reconcileReminders(
			fake.service,
			input({ tasks: [task({ startTime: '05:00' })] }),
		);
		expect((await fake.held()).size).toBe(0);
	});

	/**
	 * The reminder switch chooses the TONE, not whether the user hears about the
	 * task at all: a task with no reminder still has to surface, or writing it
	 * down bought nothing.
	 */
	it('still notifies a task with no reminder, silently and at the start time', async () => {
		const fake = harness();
		await reconcileReminders(
			fake.service,
			input({ tasks: [task({ reminderEnabled: false })] }),
		);
		const entry = await heldEntry(fake, 'task:t1');
		expect(entry?.tone).toBe(TONE_SILENT);
		expect(entry?.resolvedAt).toBe(new Date('2026-08-03T09:00:00').getTime());
	});

	it('offsets and rings when the reminder is on', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		const entry = await heldEntry(fake, 'task:t1');
		expect(entry?.tone).toBe(TONE_ALERT);
		expect(entry?.resolvedAt).toBe(new Date('2026-08-03T08:45:00').getTime());
	});

	/**
	 * Every entry carries the domain as its group tag. Without it the SDK cannot
	 * see the notification on a later pass — it would never be cancelled, and no
	 * amount of correct data would fix it.
	 */
	it('tags every entry with the reconciliation domain', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		expect((await heldEntry(fake, 'task:t1'))?.groupTag).toBe(REMINDER_DOMAIN);
	});

	/** A tap has to be able to reopen the exact thing that was reminded about. */
	it('carries the tap target on the entry', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		expect((await heldEntry(fake, 'task:t1'))?.routing).toEqual({
			kind: 'task',
			taskId: 't1',
			taskDate: '2026-08-03',
		});
	});

	/**
	 * The whole point of a bounded repeat: something has to end the sound. The
	 * marker IS that something, so its absence would mean a phone that rings for
	 * fifteen minutes only because nobody was there to hear it stop.
	 */
	it('bounds a ringing reminder with a stop, and leaves a silent one alone', async () => {
		const ringing = harness();
		await reconcileReminders(ringing.service, input());
		const stops = await ringing.stops();
		expect(stops).toHaveLength(1);
		expect(stops[0].targetId).toBe('task:t1');
		// Fifteen minutes after the reminder sounds, not after the task starts.
		expect(stops[0].dueAt).toBe(
			new Date('2026-08-03T08:45:00').getTime() + 15 * 60 * 1000,
		);

		const quiet = harness();
		await reconcileReminders(
			quiet.service,
			input({ tasks: [task({ reminderEnabled: false })] }),
		);
		expect(await quiet.stops()).toEqual([]);
	});

	/**
	 * Ids are derived from the task, so they survive an edit unchanged. Comparing
	 * ids alone would leave the user being alerted at the time they moved away
	 * from — the failure this pair of tests exists to catch.
	 */
	it('re-registers a task whose time moved', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		fake.reset();

		await reconcileReminders(
			fake.service,
			input({ tasks: [task({ startTime: '11:00' })] }),
		);
		expect(fake.scheduled()).toEqual(['task:t1']);
		expect(fake.cancelled()).toEqual([]);
		expect((await heldEntry(fake, 'task:t1'))?.resolvedAt).toBe(
			new Date('2026-08-03T10:45:00').getTime(),
		);
	});

	it('re-registers a task whose reminder was switched off', async () => {
		const fake = harness();
		await reconcileReminders(fake.service, input());
		fake.reset();

		await reconcileReminders(
			fake.service,
			input({ tasks: [task({ reminderEnabled: false })] }),
		);
		expect(fake.scheduled()).toEqual(['task:t1']);
		expect((await heldEntry(fake, 'task:t1'))?.tone).toBe(TONE_SILENT);
	});

	it('pre-schedules a series across the window, one session per date', async () => {
		const fake = harness();
		await reconcileReminders(
			fake.service,
			input({ tasks: [], rules: [rule()], overrides: [] }),
		);
		// Mondays inside the next 30 days, minus today's 06:50 which has passed.
		const held = await fake.held();
		expect(held.size).toBeGreaterThan(0);
		for (const id of held.keys()) {
			expect(id.startsWith('recurring:r1:')).toBe(true);
		}
	});

	it('honours a skipped session', async () => {
		const fake = harness();
		await reconcileReminders(
			fake.service,
			input({ tasks: [], rules: [rule()], overrides: [] }),
		);
		const before = (await fake.held()).size;
		fake.reset();

		await reconcileReminders(
			fake.service,
			input({
				tasks: [],
				rules: [rule()],
				overrides: [
					{ ruleId: 'r1', occurrenceDate: '2026-08-10', isSkipped: true },
				],
			}),
		);
		expect((await fake.held()).size).toBe(before - 1);
		expect(fake.cancelled()).toEqual(['recurring:r1:2026-08-10']);
	});
});
