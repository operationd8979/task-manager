import type { ReminderRequest, ReminderTone } from '../../domain/reminder';

export type PermissionState = 'granted' | 'denied' | 'not-determined';

export interface ExactAlarmState {
	/** Whether the platform demands a separate permission at all. iOS: false. */
	required: boolean;
	granted: boolean;
}

/**
 * A notification the OS is already holding.
 *
 * Reconciliation needs more than the id: the id is derived from the task, so it
 * stays the same when the time or the tone changes, and an id-only comparison
 * would report a moved task as already correct and never re-register it.
 */
export interface ScheduledReminder {
	id: string;
	fireAt: Date;
	tone: ReminderTone;
}

/** Where a notification tap points. */
export interface ReminderTarget {
	taskDate: string;
	taskId?: string;
	ruleId?: string;
	occurrenceDate?: string;
}

/**
 * The whole surface the app uses to talk to the OS about reminders.
 *
 * Notifee sits behind this and is imported nowhere else. The reason is not
 * "so the library can be swapped" — it is that FR-041 requires reconciliation
 * to be idempotent, and that property is only testable if the port can be
 * replaced by a fake (research.md R2).
 */
export interface ReminderScheduler {
	/** A tap that launched the app from cold, if any. Consumed once. */
	consumeLaunchTarget(): Promise<ReminderTarget | null>;
	/** Taps while the app is running. Returns an unsubscribe function. */
	onTap(listener: (target: ReminderTarget) => void): () => void;

	getNotificationPermission(): Promise<PermissionState>;
	requestNotificationPermission(): Promise<PermissionState>;

	getExactAlarmState(): Promise<ExactAlarmState>;
	requestExactAlarm(): Promise<ExactAlarmState>;
	openSystemSettings(target: 'notifications' | 'exact-alarm'): Promise<void>;

	/** Registers the notification, replacing any earlier one with the same id. */
	schedule(request: ReminderRequest): Promise<void>;
	cancel(id: string): Promise<void>;
	/** The FUTURE notifications the OS is currently holding. */
	listScheduled(): Promise<readonly ScheduledReminder[]>;
}
