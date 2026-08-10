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

export interface ReminderRequest {
	id: string;
	title: string;
	/** Absolute instant, already offset from the start time. */
	fireAt: Date;
	taskDate: LocalDate;
	/** The task's own start time — FR-035 requires it in the notification. */
	startTime: LocalTime;
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

/** The instant a reminder should fire, or null when it has no reminder. */
export function reminderFireAt(input: {
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	taskDate: LocalDate;
	startTime: LocalTime;
}): Date | null {
	if (!input.reminderEnabled) {
		return null;
	}
	const start = toDateTime(input.taskDate, input.startTime);
	return new Date(start.getTime() - input.reminderOffsetMinutes * 60_000);
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
