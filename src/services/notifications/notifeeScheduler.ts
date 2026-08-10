import { Platform } from 'react-native';
import notifee, {
	AlarmType,
	EventType,
	AndroidCategory,
	AndroidImportance,
	AndroidNotificationSetting,
	AuthorizationStatus,
	TriggerType,
	type TimestampTrigger,
} from '@notifee/react-native';

import type {
	ReminderRequest,
	ReminderTone,
	TargetRef,
} from '../../domain/reminder';
import type {
	PermissionState,
	ReminderScheduler,
	ReminderTarget,
	ScheduledReminder,
} from './scheduler';

/**
 * Bumped from `task-reminders` when the sound was added.
 *
 * An Android channel is immutable once created: `createChannel` on an existing
 * id silently keeps the original settings, so anyone who had already run the
 * app would go on getting a silent reminder forever. A new id is the only way
 * the change reaches them, and the old channel is removed so it does not sit in
 * system settings as a second, dead entry.
 */
const CHANNEL_ID = 'task-reminders-alarm';
const RETIRED_CHANNEL_IDS = ['task-reminders', 'task-reminders-sound'];
const CHANNEL_NAME = 'Nhắc nhở công việc';

/**
 * The channel for tasks with no reminder set.
 *
 * Separate from the alarm channel on purpose, and not just because it is
 * silent: channel settings are the user's, and one channel would force "stop
 * ringing for the quiet ones" and "stop ringing for the reminders" to be the
 * same switch in system settings.
 *
 * Importance HIGH so it still appears as a heads-up banner — the point is that
 * the task is not missed — with no sound and no vibration, which is what makes
 * it a notice rather than an alarm.
 */
const SILENT_CHANNEL_ID = 'task-notices';
const SILENT_CHANNEL_NAME = 'Thông báo công việc';

/**
 * The device's own notification tone.
 *
 * Notifee resolves this field one of exactly two ways: the literal `'default'`,
 * or the name of a file bundled in `android/app/src/main/res/raw`. It does NOT
 * accept a system URI, so the alarm ringtone cannot be named here — reaching it
 * would mean shipping an audio file with the app. Everything below is what
 * makes a notification tone behave like an alarm without one.
 */
const REMINDER_SOUND = 'default';

/**
 * Repeat the tone instead of playing it once.
 *
 * This is the part that answers "the sound is too small": a single short chirp
 * is easy to miss across a room, and the tone itself is fixed by the platform.
 */
const LOOP_SOUND = true;

/** Insistent rather than polite: two long buzzes, like a clock going off. */
const VIBRATION_PATTERN = [300, 600, 300, 600];

/**
 * Creates the reminder channel, and drops anything scheduled against an older
 * one.
 *
 * That second half is the part that matters. A trigger notification stores the
 * `channelId` it was created with, and reconciliation deliberately leaves an
 * already-scheduled id alone — so adding a sound to the channel changed nothing
 * for reminders that were scheduled before it, which is every reminder an
 * existing user has. Cancelling them makes the next reconcile re-create them
 * against the channel that rings.
 *
 * Runs once per app run, and only does the cancelling when a retired channel is
 * actually still on the device.
 */
async function migrateChannel(): Promise<void> {
	const retired = await Promise.all(
		RETIRED_CHANNEL_IDS.map(id =>
			notifee
				.getChannel(id)
				.then(channel => (channel ? id : null))
				.catch(() => null),
		),
	);

	await notifee.createChannel({
		id: CHANNEL_ID,
		name: CHANNEL_NAME,
		importance: AndroidImportance.HIGH,
		sound: REMINDER_SOUND,
		vibration: true,
		vibrationPattern: VIBRATION_PATTERN,
		// A missed reminder is the failure this feature exists to prevent, so it
		// is allowed through Do Not Disturb the way an alarm is.
		bypassDnd: true,
	});

	// No `sound` key at all — an omitted sound is what makes the channel silent;
	// passing 'default' and hoping the importance keeps it quiet would not.
	await notifee.createChannel({
		id: SILENT_CHANNEL_ID,
		name: SILENT_CHANNEL_NAME,
		importance: AndroidImportance.HIGH,
		vibration: false,
		// A task the user did not ask to be reminded about has no business
		// interrupting Do Not Disturb.
		bypassDnd: false,
	});

	const stale = retired.filter((id): id is string => id !== null);
	if (stale.length === 0) {
		return;
	}

	// Order matters: drop the notifications while their channel still exists,
	// then remove the channel so it stops appearing in system settings.
	await notifee.cancelTriggerNotifications();
	for (const id of stale) {
		await notifee.deleteChannel(id).catch(() => undefined);
	}
}

/**
 * The only place Notifee is imported.
 *
 * Everything above this file talks to `ReminderScheduler`, which is what lets
 * reconciliation be tested against a fake (research.md R2).
 */
export function createNotifeeScheduler(): ReminderScheduler {
	let channelReady: Promise<void> | null = null;

	const ensureChannel = async (): Promise<void> => {
		if (Platform.OS !== 'android') {
			return;
		}
		// The failure is deliberately not cached. Holding a rejected promise here
		// would mean one bad call leaves the app unable to schedule anything for
		// the rest of the run, with no way back short of a restart.
		channelReady ??= migrateChannel().catch((error: unknown) => {
			channelReady = null;
			throw error;
		});
		await channelReady;
	};

	return {
		async consumeLaunchTarget() {
			const initial = await notifee.getInitialNotification();
			return initial ? toTarget(initial.notification.data) : null;
		},

		onTap(listener) {
			return notifee.onForegroundEvent(({ type, detail }) => {
				if (type !== EventType.PRESS) {
					return;
				}
				const target = toTarget(detail.notification?.data);
				if (target) {
					listener(target);
				}
			});
		},

		async getNotificationPermission() {
			const settings = await notifee.getNotificationSettings();
			return toPermissionState(settings.authorizationStatus);
		},

		async requestNotificationPermission() {
			// Asked only when the user first turns a reminder on, never at first
			// launch (FR-036a) — asking before they state the intent is the surest
			// way to be refused.
			const settings = await notifee.requestPermission();
			return toPermissionState(settings.authorizationStatus);
		},

		async getExactAlarmState() {
			if (Platform.OS !== 'android') {
				// iOS has no separate exact-alarm permission.
				return { required: false, granted: true };
			}
			const settings = await notifee.getNotificationSettings();
			return {
				required: true,
				granted: settings.android.alarm === AndroidNotificationSetting.ENABLED,
			};
		},

		async requestExactAlarm() {
			if (Platform.OS !== 'android') {
				return { required: false, granted: true };
			}
			// The platform offers no in-app grant; it opens a settings screen, so the
			// caller has to re-read the state when the app resumes.
			await notifee.openAlarmPermissionSettings();
			const settings = await notifee.getNotificationSettings();
			return {
				required: true,
				granted: settings.android.alarm === AndroidNotificationSetting.ENABLED,
			};
		},

		async openSystemSettings(target) {
			if (target === 'exact-alarm' && Platform.OS === 'android') {
				await notifee.openAlarmPermissionSettings();
				return;
			}
			await notifee.openNotificationSettings();
		},

		async schedule(request) {
			await ensureChannel();
			const alerting = request.tone === 'alert';
			const { granted } = await this.getExactAlarmState();

			const trigger: TimestampTrigger = {
				type: TriggerType.TIMESTAMP,
				timestamp: request.fireAt.getTime(),
				// Without the exact-alarm permission the OS still delivers, just
				// loosely. FR-036b says schedule anyway and tell the user it may be
				// late — refusing to schedule would be worse for them, not safer.
				alarmManager: granted
					? { type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE }
					: { type: AlarmType.SET_AND_ALLOW_WHILE_IDLE },
			};

			await notifee.createTriggerNotification(
				{
					id: request.id,
					title: request.title,
					body: formatBody(request),
					// Enough to reopen the exact thing that was reminded about (FR-043),
					// plus the tone, which is how reconciliation later recognises that a
					// notification the OS holds no longer matches the task.
					data: {
						...encodeTarget(request.targetRef, request.taskDate),
						tone: request.tone,
					},
					android: alerting
						? {
							channelId: CHANNEL_ID,
							pressAction: { id: 'default' },
							// The channel decides this from Android 8 on; the field still
							// carries it on anything older.
							sound: REMINDER_SOUND,
							loopSound: LOOP_SOUND,
							vibrationPattern: VIBRATION_PATTERN,
							// Tells the system this is a time-critical alert rather than a
							// message, which is what earns it alarm-like treatment.
							category: AndroidCategory.ALARM,
							// Stops looping the moment the user acts on it — without this
							// the tone would keep going after it has been dealt with.
							autoCancel: true,
						}
						: {
							channelId: SILENT_CHANNEL_ID,
							pressAction: { id: 'default' },
							// Every alarm-ish field is omitted, not set to a quiet value:
							// on pre-Android 8 the notification itself still decides, and
							// an empty vibration pattern is not a valid one.
							category: AndroidCategory.REMINDER,
							autoCancel: true,
						},
					// iOS has no channels, so the sound is stated per notification —
					// and omitting it is what posts the notice silently.
					ios: alerting
						? { sound: REMINDER_SOUND, critical: false }
						: { critical: false },
				},
				trigger,
			);
		},

		async cancel(id) {
			await notifee.cancelTriggerNotification(id);
		},

		async listScheduled() {
			// Reconciliation reads this FIRST and then leaves everything it finds
			// correct alone, so the channel migration has to have finished
			// cancelling by the time this answers — otherwise it reports the stale
			// reminders as fine and they are never rebuilt.
			await ensureChannel();
			const pending = await notifee.getTriggerNotifications();

			const out: ScheduledReminder[] = [];
			for (const { notification, trigger } of pending) {
				// Anything without an id or without a timestamp is not ours; there is
				// no way to reconcile it, so it is left exactly where it is.
				if (
					notification.id === undefined ||
					trigger.type !== TriggerType.TIMESTAMP
				) {
					continue;
				}
				out.push({
					id: notification.id,
					fireAt: new Date(trigger.timestamp),
					tone: toTone(notification.data),
				});
			}
			return out;
		},
	};
}

function toPermissionState(status: AuthorizationStatus): PermissionState {
	switch (status) {
		case AuthorizationStatus.AUTHORIZED:
		case AuthorizationStatus.PROVISIONAL:
			return 'granted';
		case AuthorizationStatus.DENIED:
			return 'denied';
		default:
			return 'not-determined';
	}
}

/**
 * The body carries the task's own time, not the moment the reminder fires.
 * FR-035 asks for the task time, and "09:00" is what the user is being reminded
 * about — "08:45" would just describe the notification itself.
 */
function formatBody(request: ReminderRequest): string {
	return `${request.startTime} · ${request.taskDate}`;
}

/**
 * Reads the tone back off a notification the OS is holding.
 *
 * Missing means `alert`, and that default is deliberate: builds before the
 * silent notice existed only ever scheduled ringing reminders, so reading their
 * absent field as `alert` lets reconciliation recognise them as still correct
 * and leave them be, instead of re-registering every reminder on the device the
 * first time the updated app runs.
 */
function toTone(data: Record<string, unknown> | undefined): ReminderTone {
	return data?.tone === 'silent' ? 'silent' : 'alert';
}

function encodeTarget(
	target: TargetRef,
	taskDate: string,
): Record<string, string> {
	return target.kind === 'task'
		? { kind: 'task', taskId: target.taskId, taskDate }
		: {
			kind: 'occurrence',
			ruleId: target.ruleId,
			date: target.date,
			taskDate,
		};
}

/**
 * Reads back what `encodeTarget` wrote.
 *
 * Anything unrecognised returns null, and the caller falls back to today's
 * timeline. A notification for a task the user has since deleted is a normal
 * case, not an error to show them (FR-043).
 */
function toTarget(data: Record<string, unknown> | undefined): ReminderTarget | null {
	if (!data) {
		return null;
	}
	const taskDate = String(data.taskDate ?? '');
	if (taskDate === '') {
		return null;
	}
	if (data.kind === 'task' && typeof data.taskId === 'string') {
		return { taskDate, taskId: data.taskId };
	}
	if (
		data.kind === 'occurrence' &&
		typeof data.ruleId === 'string' &&
		typeof data.date === 'string'
	) {
		return { taskDate, ruleId: data.ruleId, occurrenceDate: data.date };
	}
	return null;
}
