import { toDateTime, type LocalDate, type LocalTime } from '../lib/date';

/** Reminder offsets the app supports, in minutes before the start (FR-036). */
export const REMINDER_OFFSETS = [0, 5, 10, 15, 30, 60] as const;

export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

/**
 * Where the reminder chips start on a new task.
 *
 * A constant rather than a setting: the reminder is chosen ON the create screen
 * and nowhere else, so a second place to configure its default would be a
 * preference for a value the user is already looking at.
 */
export const DEFAULT_REMINDER_OFFSET: ReminderOffset = 5;

export function isReminderOffset(value: number): value is ReminderOffset {
	return (REMINDER_OFFSETS as readonly number[]).includes(value);
}

/** What a reminder points back at, so a tap can open the right thing. */
export type TargetRef =
	| { kind: 'task'; taskId: string }
	| { kind: 'occurrence'; ruleId: string; date: LocalDate };

/**
 * How loudly a scheduled notification arrives.
 *
 * Every task notifies; the reminder switch decides whether it also RINGS.
 * `silent` posts at the start time with no sound and no vibration, so a task the
 * user never asked to be nagged about still shows up on the lock screen instead
 * of passing unnoticed. `alert` is the reminder proper: offset ahead of the
 * start, with the alarm-like tone.
 */
export type ReminderTone = 'alert' | 'silent';

export interface ReminderRequest {
	id: string;
	title: string;
	/** Absolute instant, already offset from the start time. */
	fireAt: Date;
	taskDate: LocalDate;
	/** The task's own start time — FR-035 requires it in the notification. */
	startTime: LocalTime;
	tone: ReminderTone;
	targetRef: TargetRef;
}

/**
 * Identifiers are COMPUTED from the data, never generated and stored.
 *
 * That is what makes cancel-and-reschedule idempotent (FR-041): the same task
 * always yields the same id, so a second reconcile finds it already present. A
 * random id kept in a column would be a second source of truth, and it would
 * drift (contracts/reminders.md).
 */
export function reminderId(target: TargetRef): string {
	return target.kind === 'task'
		? `task:${target.taskId}`
		: `recurring:${target.ruleId}:${target.date}`;
}

export interface NotificationPlan {
	fireAt: Date;
	tone: ReminderTone;
}

/**
 * When a task should reach the user, and how.
 *
 * There is no "no notification" answer any more. Turning the reminder off used
 * to mean silence, which made a task the user had written down behave exactly
 * like one they had not — the OS said nothing at the hour it was due. Off now
 * means a silent notice AT the start time; on means the alarm-toned reminder,
 * ahead of it by the chosen offset.
 */
export function notificationPlan(input: {
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	taskDate: LocalDate;
	startTime: LocalTime;
}): NotificationPlan {
	const start = toDateTime(input.taskDate, input.startTime);
	if (!input.reminderEnabled) {
		return { fireAt: start, tone: 'silent' };
	}
	return {
		fireAt: new Date(start.getTime() - input.reminderOffsetMinutes * 60_000),
		tone: 'alert',
	};
}

/**
 * The instant the RINGING reminder should fire, or null when the task only gets
 * the silent notice. The form asks this to decide what to say about the
 * reminder; scheduling asks `notificationPlan`, which covers both cases.
 */
export function reminderFireAt(input: {
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	taskDate: LocalDate;
	startTime: LocalTime;
}): Date | null {
	const plan = notificationPlan(input);
	return plan.tone === 'alert' ? plan.fireAt : null;
}

/**
 * Whether the moment has already passed.
 *
 * FR-038: a reminder in the past is NOT scheduled, and the user is told. The
 * alternative — scheduling it anyway — makes the OS fire it immediately, which
 * reads as a bug.
 */
export function isInPast(fireAt: Date, now: Date): boolean {
	return fireAt.getTime() <= now.getTime();
}
