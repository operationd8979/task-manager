import type { RecurringRule } from '../../../domain/recurrence';
import type { ReminderRequest } from '../../../domain/reminder';
import type { Task } from '../../../domain/task';
import { reconcileReminders, type ReconcileInput } from '../reconcile';
import type {
	ExactAlarmState,
	PermissionState,
	ReminderScheduler,
} from '../scheduler';

/**
 * The property FR-041 actually asks for: running reconciliation twice must not
 * touch the OS the second time. A "cancel everything, reschedule everything"
 * implementation would pass a naive test and still leave a window with no
 * reminders at all — so the assertion here is on the CALLS, not the outcome.
 */
function fakeScheduler() {
	const held = new Map<string, ReminderRequest>();
	const calls = { scheduled: [] as string[], cancelled: [] as string[] };

	const scheduler: ReminderScheduler = {
		consumeLaunchTarget: async () => null,
		onTap: () => () => undefined,
		getNotificationPermission: async (): Promise<PermissionState> => 'granted',
		requestNotificationPermission: async (): Promise<PermissionState> =>
			'granted',
		getExactAlarmState: async (): Promise<ExactAlarmState> => ({
			required: false,
			granted: true,
		}),
		requestExactAlarm: async (): Promise<ExactAlarmState> => ({
			required: false,
			granted: true,
		}),
		openSystemSettings: async () => undefined,
		schedule: async request => {
			held.set(request.id, request);
			calls.scheduled.push(request.id);
		},
		cancel: async id => {
			held.delete(id);
			calls.cancelled.push(id);
		},
		listScheduled: async () => [...held.keys()],
	};

	return {
		scheduler, held, calls, reset: () => {
			calls.scheduled = [];
			calls.cancelled = [];
		}
	};
}

const NOW = new Date('2026-08-03T06:00:00');

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
		const { scheduler, calls } = fakeScheduler();
		const report = await reconcileReminders(scheduler, input());
		expect(report.scheduled).toBe(1);
		expect(calls.scheduled).toEqual(['task:t1']);
	});

	it('IS IDEMPOTENT: a second run touches nothing', async () => {
		const fake = fakeScheduler();
		await reconcileReminders(fake.scheduler, input());
		fake.reset();

		const report = await reconcileReminders(fake.scheduler, input());
		expect(fake.calls.scheduled).toEqual([]);
		expect(fake.calls.cancelled).toEqual([]);
		expect(report.scheduled).toBe(0);
		expect(report.cancelled).toBe(0);
		expect(report.unchanged).toBe(1);
	});

	it('cancels reminders the data no longer wants', async () => {
		const fake = fakeScheduler();
		await reconcileReminders(fake.scheduler, input());
		fake.reset();

		await reconcileReminders(fake.scheduler, input({ tasks: [] }));
		expect(fake.calls.cancelled).toEqual(['task:t1']);
	});

	it('keeps no reminder for a completed task', async () => {
		const { scheduler, held } = fakeScheduler();
		await reconcileReminders(scheduler, input({ tasks: [task({ status: 'done' })] }));
		expect(held.size).toBe(0);
	});

	it('skips a reminder whose moment has already passed', async () => {
		const { scheduler, held } = fakeScheduler();
		await reconcileReminders(
			scheduler,
			input({ tasks: [task({ startTime: '05:00' })] }),
		);
		expect(held.size).toBe(0);
	});

	it('pre-schedules a series across the window, one session per date', async () => {
		const { scheduler, held } = fakeScheduler();
		await reconcileReminders(
			scheduler,
			input({ tasks: [], rules: [rule()], overrides: [] }),
		);
		// Mondays inside the next 30 days, minus today's 06:50 which has passed.
		expect(held.size).toBeGreaterThan(0);
		for (const id of held.keys()) {
			expect(id.startsWith('recurring:r1:')).toBe(true);
		}
	});

	it('honours a skipped session', async () => {
		const fake = fakeScheduler();
		await reconcileReminders(
			fake.scheduler,
			input({ tasks: [], rules: [rule()], overrides: [] }),
		);
		const before = fake.held.size;
		fake.reset();

		await reconcileReminders(
			fake.scheduler,
			input({
				tasks: [],
				rules: [rule()],
				overrides: [
					{ ruleId: 'r1', occurrenceDate: '2026-08-10', isSkipped: true },
				],
			}),
		);
		expect(fake.held.size).toBe(before - 1);
		expect(fake.calls.cancelled).toEqual(['recurring:r1:2026-08-10']);
	});
});
