import type {
	NotificationRequest,
	ReconcileResult,
} from '@chipmobilesdk/rn-notification';

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
import { toNotificationRequest } from './requests';

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
	/**
	 * Entries the SDK refused — a duplicate id, or a moment that passed between
	 * building the desired set and applying it. A rejection is NOT a
	 * cancellation: anything already scheduled under that id is left in place.
	 */
	rejected: number;
	/**
	 * Entries dropped for exceeding the platform's pending ceiling — 64 on iOS.
	 * The furthest-out ones go first and come back as nearer ones deliver, so
	 * this is a number worth watching rather than an error.
	 */
	dropped: number;
}

/** The one thing reconciliation needs from the SDK runtime. */
export interface ReminderReconciler {
	reconcile(
		desired: readonly NotificationRequest[],
	): Promise<ReconcileResult>;
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

/**
 * Bring the OS into agreement with the data (FR-041, FR-042).
 *
 * The diffing itself belongs to the SDK, and that is the point: anything
 * already correct is left alone, so no window opens in which a reminder does
 * not exist. "Correct" means more than "present" there — the SDK fingerprints
 * the firing instant, the tone, the content and the routing payload, so moving
 * a task to another hour or switching its reminder on replaces the entry in
 * place under the same id, while a second pass over unchanged data issues zero
 * platform operations.
 *
 * What stays here is the part only this app can know: which notifications its
 * data implies. The SDK never guesses that, which is why every write path has
 * to reach this function.
 */
export async function reconcileReminders(
	reconciler: ReminderReconciler,
	input: ReconcileInput,
): Promise<ReconcileReport> {
	const result = await reconciler.reconcile(
		desiredReminders(input).map(toNotificationRequest),
	);

	return {
		// Created and replaced are one number to the app: both mean the OS now
		// holds something it did not hold before this pass.
		scheduled: result.created.length + result.replaced.length,
		cancelled: result.cancelled.length,
		unchanged: result.unchanged.length,
		rejected: result.rejected.length,
		dropped: result.truncated?.droppedCount ?? 0,
	};
}
