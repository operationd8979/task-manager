import type { RoutingPayload } from '@chipmobilesdk/rn-notification';

import type { TargetRef } from '../../domain/reminder';
import type { ReminderTarget } from './types';

/**
 * What a tap needs to reopen the exact thing that was reminded about (FR-043).
 *
 * The SDK round-trips this payload unchanged and hands it back on the
 * interaction event, so it replaces the hand-rolled data bag the Notifee
 * adapter used to encode and decode. Keep it small: 4 KB is the hard limit, and
 * an over-large payload is refused at schedule time rather than discovered at
 * tap time.
 */
export function encodeTarget(
	target: TargetRef,
	taskDate: string,
): RoutingPayload {
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
 * Anything unrecognised returns null and the caller falls back to today's
 * timeline. A notification for a task the user has since deleted is a normal
 * case, not an error to show them (FR-043).
 */
export function decodeTarget(
	routing: RoutingPayload | undefined,
): ReminderTarget | null {
	if (!routing) {
		return null;
	}
	const taskDate = String(routing.taskDate ?? '');
	if (taskDate === '') {
		return null;
	}
	if (routing.kind === 'task' && typeof routing.taskId === 'string') {
		return { taskDate, taskId: routing.taskId };
	}
	if (
		routing.kind === 'occurrence' &&
		typeof routing.ruleId === 'string' &&
		typeof routing.date === 'string'
	) {
		return { taskDate, ruleId: routing.ruleId, occurrenceDate: routing.date };
	}
	return null;
}
