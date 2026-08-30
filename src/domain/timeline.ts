import { minutesOf, type LocalDate, type LocalTime, type Weekday } from '../lib/date';
import type { Occurrence } from './occurrence';
import type { RecurringRule } from './recurrence';
import type { ReminderOffset } from './reminder';
import type { Task, TaskStatus } from './task';

/**
 * What a row on the timeline points at.
 *
 * The interface MUST be able to tell these apart, because they have different
 * write paths: editing a `task` never asks about scope, editing an `occurrence`
 * does (FR-026) — except for a status change, which never does (FR-026a).
 * Blurring the two is how a user edits one session and changes 122 of them.
 */
export type TimelineSource =
	| { kind: 'task'; taskId: string }
	| { kind: 'occurrence'; ruleId: string; date: LocalDate };

/**
 * What a row's "⟳ LẶP …" label has to say.
 *
 * A discriminated union rather than three optional arrays: a monthly series has
 * no weekdays, and a row that could hold both would let the label contradict
 * the rule it came from.
 */
export type RepeatSummary =
	| { frequency: 'weekly'; daysOfWeek: readonly Weekday[] }
	| { frequency: 'monthlyByDay'; daysOfMonth: readonly number[] }
	| { frequency: 'monthlyLastDay' };

export function repeatSummaryOf(rule: RecurringRule): RepeatSummary {
	switch (rule.frequency) {
		case 'weekly':
			return { frequency: 'weekly', daysOfWeek: rule.daysOfWeek };
		case 'monthlyByDay':
			return { frequency: 'monthlyByDay', daysOfMonth: rule.daysOfMonth };
		case 'monthlyLastDay':
			return { frequency: 'monthlyLastDay' };
	}
}

export interface TimelineItem {
	/** Stable list key. Occurrences have no record id, so it is derived. */
	key: string;
	source: TimelineSource;
	title: string;
	note: string | null;
	taskDate: LocalDate;
	startTime: LocalTime;
	endTime: LocalTime | null;
	status: TaskStatus;
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	/** Present only for occurrences; drives the "⟳ LẶP T2–T6" label. */
	repeats?: RepeatSummary;
	/** Occurrence has content edited for this session only (FR-029). */
	hasOverride: boolean;
	/** This session was skipped. Always false for a one-off task. */
	isSkipped: boolean;
}

export function fromTask(task: Task): TimelineItem {
	return {
		key: `task:${task.id}`,
		source: { kind: 'task', taskId: task.id },
		title: task.title,
		note: task.note,
		taskDate: task.taskDate,
		startTime: task.startTime,
		endTime: task.endTime,
		status: task.status,
		reminderEnabled: task.reminderEnabled,
		reminderOffsetMinutes: task.reminderOffsetMinutes,
		hasOverride: false,
		isSkipped: false,
	};
}

export function fromOccurrence(
	occurrence: Occurrence,
	rule: RecurringRule,
): TimelineItem {
	return {
		key: `occurrence:${occurrence.ruleId}:${occurrence.date}`,
		source: {
			kind: 'occurrence',
			ruleId: occurrence.ruleId,
			date: occurrence.date,
		},
		title: occurrence.title,
		note: occurrence.note,
		taskDate: occurrence.date,
		startTime: occurrence.startTime,
		endTime: occurrence.endTime,
		status: occurrence.status,
		reminderEnabled: occurrence.reminderEnabled,
		reminderOffsetMinutes: occurrence.reminderOffsetMinutes,
		repeats: repeatSummaryOf(rule),
		hasOverride: occurrence.hasOverride,
		isSkipped: occurrence.isSkipped,
	};
}

/** Start time, then end time, then title — deterministic on every read. */
export function compareItems(a: TimelineItem, b: TimelineItem): number {
	const byStart = minutesOf(a.startTime) - minutesOf(b.startTime);
	if (byStart !== 0) {
		return byStart;
	}
	const aEnd = a.endTime === null ? -1 : minutesOf(a.endTime);
	const bEnd = b.endTime === null ? -1 : minutesOf(b.endTime);
	if (aEnd !== bEnd) {
		return aEnd - bEnd;
	}
	return a.title.localeCompare(b.title);
}
