import type { PermissionState as SdkPermissionState } from '@chipmobilesdk/rn-notification';
import { canDisplay } from '@chipmobilesdk/rn-notification';

/**
 * What the UI asks about a permission.
 *
 * Narrower than the SDK's six states on purpose: the screens show a word and a
 * link to settings, and `provisional` versus `granted` is not a distinction any
 * of them can act on. The mapping happens once, here, rather than each screen
 * inventing its own reading of six states.
 */
export type PermissionState = 'granted' | 'denied' | 'not-determined';

export interface ExactAlarmState {
	/** Whether the platform demands a separate permission at all. iOS: false. */
	required: boolean;
	granted: boolean;
}

/** Where a notification tap points. */
export interface ReminderTarget {
	taskDate: string;
	taskId?: string;
	ruleId?: string;
	occurrenceDate?: string;
}

/**
 * `provisional` and `notRequired` both count as granted.
 *
 * iOS quiet delivery still reaches the user, and a platform version with no
 * runtime permission never refused anything — showing either as "chưa cấp"
 * would send the user to a settings screen with nothing to change.
 */
export function toDisplayPermission(state: SdkPermissionState): PermissionState {
	if (canDisplay(state)) {
		return 'granted';
	}
	return state === 'notAsked' ? 'not-determined' : 'denied';
}

/**
 * `notRequired` is the one state that hides the row entirely.
 *
 * It means this platform version has no exact-alarm concept — iOS, or Android
 * below 12 — so there is nothing to grant and nothing to warn about.
 */
export function toExactAlarmState(state: SdkPermissionState): ExactAlarmState {
	return {
		required: state !== 'notRequired',
		granted: state === 'granted',
	};
}
