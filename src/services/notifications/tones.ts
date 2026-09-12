import type { ToneDeclaration } from '@chipmobilesdk/rn-notification';

import { t } from '../../i18n';

/**
 * The reconciliation domain, carried on every request as its `groupTag`.
 *
 * It is what bounds cancellation: the SDK never touches a pending notification
 * whose group tag is not this one, so anything another library — or a future
 * feature of this app — schedules is invisible to a reminder reconcile pass
 * rather than a stray to be cleaned up.
 *
 * Every request MUST carry it. A request without it is scheduled but never
 * seen again by reconciliation, which is how a notification becomes impossible
 * to cancel.
 */
export const REMINDER_DOMAIN = 'task-manager';

/**
 * Tone ids, not channel ids.
 *
 * The SDK derives the Android channel id from the tone id AND its version
 * (`task-reminder.v1`), which is what makes a settings change a migration
 * rather than a silently-ignored re-declaration. Bump `version` below when any
 * field of a declaration changes; never edit a declaration in place.
 */
export const TONE_ALERT = 'task-reminder';
export const TONE_SILENT = 'task-notice';

/**
 * The two tones the app has.
 *
 * They stay separate for the reason the SDK states: channel settings belong to
 * the user, and merging these would make "stop ringing for the reminders" and
 * "stop showing the quiet ones" the same switch in system settings.
 *
 * `name` and `description` are what a person reads when they open notification
 * settings to turn one of these down — the only part of a tone a user ever
 * sees. Correcting either costs no version bump: the SDK updates the label of
 * an existing channel in place (0.2.0+).
 *
 * Which is also what makes these two fields translatable. They are read from
 * the catalogue at call time rather than frozen into a constant, and the
 * runtime re-applies the declarations when the language changes, so the two
 * entries a user finds in the system's own settings screen are in the language
 * they chose in this app — not the one their phone happened to boot in.
 */
export function reminderTones(): readonly ToneDeclaration[] {
	return [
		{
			id: TONE_ALERT,
			name: t('notify.alertName'),
			description: t('notify.alertDescription'),
			// `max` is the loudest the SDK offers: Android importance HIGH plus the
			// DND bypass below, iOS `timeSensitive`. A missed reminder is the failure
			// this feature exists to prevent, so it is allowed through Do Not Disturb
			// the way an alarm is.
			urgency: 'max',
			// The device's own notification tone. The SDK passes this name straight to
			// the platform, which resolves either the literal 'default' or a file in
			// `android/app/src/main/res/raw` — a system alarm URI is not reachable.
			sound: { name: 'default' },
			vibration: true,
			bypassDoNotDisturb: true,
			/**
			 * Repeat the tone instead of playing it once.
			 *
			 * This is what answers "the sound is too small": a single short chirp is
			 * easy to miss across a room, and that is exactly the situation a reminder
			 * exists for. The sound stops when the user handles the notification, or
			 * when this window elapses — and the notification itself STAYS either way,
			 * so someone who was out still sees what they missed.
			 *
			 * Fifteen minutes is the floor of what is useful, not a promise: the entry
			 * that ends the alert is scheduled like any other notification, so without
			 * the exact-alarm grant it overruns rather than cuts off on time.
			 *
			 * Android only. iOS has no looping API at all and reports the refusal
			 * through `repeatUnavailable`; the notification still sounds once.
			 */
			repeatAlert: { forMs: 15 * 60 * 1000 },
			// Asks the platform to treat this as a time-critical alert rather than a
			// message. On iOS this needs the app's own Time Sensitive Notifications
			// capability, which it does not have — it degrades to `active`.
			timeSensitive: true,
			// Unchanged: `repeatAlert` and `timeSensitive` are realized per
			// notification, not frozen into the channel, so neither obliges a bump.
			version: 1,
		},
		{
			id: TONE_SILENT,
			name: t('notify.silentName'),
			description: t('notify.silentDescription'),
			// Still `high` so it appears as a heads-up banner — the point is that the
			// task is not missed — but with no sound and no vibration, which is what
			// makes it a notice rather than an alarm.
			urgency: 'high',
			// `enabled: false` is what makes the tone silent. A name with a low
			// urgency would still ring.
			sound: { enabled: false },
			vibration: false,
			// A task the user did not ask to be reminded about has no business
			// interrupting Do Not Disturb.
			bypassDoNotDisturb: false,
			version: 1,
		},
	];
}

/**
 * Channels created by the pre-SDK build, deleted on first run of this one.
 *
 * An Android channel outlives the code that created it: left alone, these would
 * sit in system settings forever as dead entries the user can still toggle,
 * next to the SDK's `task-reminder.v1` and `task-notice.v1`.
 */
export const LEGACY_CHANNEL_IDS = [
	'task-reminders',
	'task-reminders-sound',
	'task-reminders-alarm',
	'task-notices',
] as const;
