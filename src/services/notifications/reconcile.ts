import { buildOccurrences } from '../../domain/occurrence';
import type { RecurrenceOverride, RecurringRule } from '../../domain/recurrence';
import {
	isInPast,
	notificationPlan,
	reminderId,
	type ReminderRequest,
} from '../../domain/reminder';
import type { Task } from '../../domain/task';
import { addDays, today, type LocalDate } from '../../lib/date';
import type { ReminderScheduler, ScheduledReminder } from './scheduler';

/**
 * How far ahead reminders for a series are registered (FR-040).
 *
 * Long enough that an ordinary user never reaches the edge, short enough that
 * the number of pending OS notifications stays well under platform limits.
 */
export const PRESCHEDULE_DAYS = 30;

export interface ReconcileInput {
	tasks: readonly Task[];
	rules: readonly RecurringRule[];
	overrides: readonly RecurrenceOverride[];
	now?: Date;
}

export interface ReconcileReport {
	scheduled: number;
	cancelled: number;
	/** Ids already correct, left untouched. This is what makes it idempotent. */
	unchanged: number;
}

/**
 * Builds the set of notifications that SHOULD exist in the window.
 *
 * Every task that is still to happen gets one — the reminder switch only picks
 * the tone (see `notificationPlan`). Occurrences are generated one day at a
 * time, exactly as the timeline does — there is no range-taking generator to
 * reach for (FR-023).
 */
export function desiredReminders(input: ReconcileInput): ReminderRequest[] {
	const now = input.now ?? new Date();
	const from = today(now);
	const out: ReminderRequest[] = [];

	for (const task of input.tasks) {
		if (task.status === 'done') {
			// A completed task keeps no pending reminder (FR-037).
			continue;
		}
		const plan = notificationPlan(task);
		if (isInPast(plan.fireAt, now)) {
			continue;
		}
		const targetRef = { kind: 'task' as const, taskId: task.id };
		out.push({
			id: reminderId(targetRef),
			title: task.title,
			fireAt: plan.fireAt,
			taskDate: task.taskDate,
			startTime: task.startTime,
			tone: plan.tone,
			targetRef,
		});
	}

	for (let offset = 0; offset <= PRESCHEDULE_DAYS; offset++) {
		const date: LocalDate = addDays(from, offset);
		for (const occurrence of buildOccurrences(
			input.rules,
			input.overrides,
			date,
		)) {
			// A skipped session still comes out of buildOccurrences — it has to, or
			// the timeline could not draw it greyed out — so it is filtered HERE.
			// Nothing about a session the user cancelled may reach the OS (FR-037).
			if (occurrence.isSkipped || occurrence.status === 'done') {
				continue;
			}
			const plan = notificationPlan({
				reminderEnabled: occurrence.reminderEnabled,
				reminderOffsetMinutes: occurrence.reminderOffsetMinutes,
				taskDate: occurrence.date,
				startTime: occurrence.startTime,
			});
			if (isInPast(plan.fireAt, now)) {
				continue;
			}
			const targetRef = {
				kind: 'occurrence' as const,
				ruleId: occurrence.ruleId,
				date: occurrence.date,
			};
			out.push({
				id: reminderId(targetRef),
				title: occurrence.title,
				fireAt: plan.fireAt,
				taskDate: occurrence.date,
				startTime: occurrence.startTime,
				tone: plan.tone,
				targetRef,
			});
		}
	}

	return out;
}

/** Whether what the OS holds already says what the data wants it to say. */
function isCurrent(
	held: ScheduledReminder,
	wanted: ReminderRequest,
): boolean {
	return (
		held.fireAt.getTime() === wanted.fireAt.getTime() &&
		held.tone === wanted.tone
	);
}

/**
 * Bring the OS into agreement with the data (FR-041, FR-042).
 *
 * Anything already correct is LEFT ALONE. Cancelling everything and
 * rescheduling is simpler to write but opens a window in which no reminder
 * exists at all — and on a device that reclaims the process mid-run, that
 * window is permanent.
 *
 * "Correct" has to mean more than "present", though. Ids are derived from the
 * task, so moving a task to another hour, or switching its reminder on, leaves
 * the id untouched — comparing ids alone would call the stale notification fine
 * and the user would be alerted at the old time forever. Re-scheduling replaces
 * in place under the same id, so nothing is cancelled and no gap opens.
 */
export async function reconcileReminders(
	scheduler: ReminderScheduler,
	input: ReconcileInput,
): Promise<ReconcileReport> {
	const desired = desiredReminders(input);
	const desiredById = new Map(desired.map(r => [r.id, r]));
	const existing = new Map(
		(await scheduler.listScheduled()).map(held => [held.id, held]),
	);

	let cancelled = 0;
	for (const id of existing.keys()) {
		if (!desiredById.has(id)) {
			await scheduler.cancel(id);
			cancelled += 1;
		}
	}

	let scheduled = 0;
	let unchanged = 0;
	for (const request of desired) {
		const held = existing.get(request.id);
		if (held && isCurrent(held, request)) {
			unchanged += 1;
			continue;
		}
		await scheduler.schedule(request);
		scheduled += 1;
	}

	return { scheduled, cancelled, unchanged };
}
