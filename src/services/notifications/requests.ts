import type { NotificationRequest } from '@chipmobilesdk/rn-notification';

import type { ReminderRequest } from '../../domain/reminder';
import { encodeTarget } from './routing';
import { REMINDER_DOMAIN, TONE_ALERT, TONE_SILENT } from './tones';

/**
 * The body carries the task's own time, not the moment the reminder fires.
 * FR-035 asks for the task time, and "09:00" is what the user is being reminded
 * about — "08:45" would just describe the notification itself.
 */
function formatBody(request: ReminderRequest): string {
	return `${request.startTime} · ${request.taskDate}`;
}

/**
 * Turns one domain reminder into the SDK's request shape.
 *
 * Three things here are load-bearing:
 *
 * - `id` stays the domain id (`task:t_abc`, `recurring:r1:2026-08-10`). The SDK
 *   never generates or normalizes one, so identity remains derived from the
 *   data and a second reconcile finds the same notification already present.
 * - `groupTag` is the domain. Without it the entry is invisible to
 *   reconciliation and can never be cancelled again.
 * - `moment` is left at the default wall-clock anchoring. A 09:00 reminder is a
 *   09:00 reminder after the user changes time zone; the SDK re-anchors it on
 *   the next maintenance pass.
 */
export function toNotificationRequest(
	request: ReminderRequest,
): NotificationRequest {
	return {
		id: request.id,
		content: { title: request.title, body: formatBody(request) },
		tone: request.tone === 'alert' ? TONE_ALERT : TONE_SILENT,
		moment: { at: request.fireAt.getTime() },
		routing: encodeTarget(request.targetRef, request.taskDate),
		groupTag: REMINDER_DOMAIN,
	};
}
