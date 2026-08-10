import type { LocalDate, LocalTime } from '../lib/date';
import type { ReminderOffset } from './reminder';
import {
	overridesContent,
	ruleOccursOn,
	type RecurrenceOverride,
	type RecurringRule,
} from './recurrence';
import type { TaskStatus } from './task';

/**
 * One session of a recurring rule on one date.
 *
 * NOT a stored record (FR-023). It is computed when the day is drawn, which is
 * also the single most misunderstood thing about this feature: the user sees an
 * Occurrence and thinks "task", so the interface has to keep the boundary
 * visible or they will edit one session and change the whole series.
 */
export interface Occurrence {
	ruleId: string;
	date: LocalDate;
	title: string;
	note: string | null;
	startTime: LocalTime;
	endTime: LocalTime | null;
	status: TaskStatus;
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	/** Drives the "✎ ĐÃ CHỈNH RIÊNG" label. Status-only edits do not set it. */
	hasOverride: boolean;
	/**
	 * "Chỉ lần này" on a delete: this session is off, the series is not.
	 *
	 * It is still produced, and still drawn — greyed out, so the day reads as
	 * "this was going to happen and is not" rather than as a gap the user has to
	 * remember the reason for. Nothing may schedule a reminder for it.
	 */
	isSkipped: boolean;
}

/**
 * Build the occurrences for EXACTLY ONE day.
 *
 * There is deliberately no range-taking variant: one existing would be an
 * invitation for a screen to call it while scrolling, which is the thing
 * FR-023 and SC-004 are trying to prevent.
 */
export function buildOccurrences(
	rules: readonly RecurringRule[],
	overrides: readonly RecurrenceOverride[],
	date: LocalDate,
): Occurrence[] {
	const byRule = new Map<string, RecurrenceOverride>();
	for (const override of overrides) {
		if (override.occurrenceDate === date) {
			byRule.set(override.ruleId, override);
		}
	}

	const out: Occurrence[] = [];
	for (const rule of rules) {
		if (!ruleOccursOn(rule, date)) {
			continue;
		}
		out.push(merge(rule, date, byRule.get(rule.id)));
	}
	return out;
}

/**
 * Presence is tested with `in`, never with `!== undefined`.
 *
 * The two differ when a key is written with an explicit `undefined`, and the
 * difference is exactly "this session has no end time" versus "inherit 10:00
 * from the rule". Getting it wrong hands the user back a value they removed.
 */
function merge(
	rule: RecurringRule,
	date: LocalDate,
	override: RecurrenceOverride | undefined,
): Occurrence {
	const base: Occurrence = {
		ruleId: rule.id,
		date,
		title: rule.title,
		note: rule.note,
		startTime: rule.defaultStartTime,
		endTime: rule.defaultEndTime,
		status: 'processing',
		reminderEnabled: rule.reminderEnabled,
		reminderOffsetMinutes: rule.reminderOffsetMinutes,
		hasOverride: false,
		isSkipped: false,
	};

	if (!override) {
		return base;
	}

	return {
		...base,
		title: 'title' in override ? (override.title as string) : base.title,
		note: 'note' in override ? (override.note as string | null) : base.note,
		startTime:
			'startTime' in override
				? (override.startTime as LocalTime)
				: base.startTime,
		endTime:
			'endTime' in override
				? (override.endTime as LocalTime | null)
				: base.endTime,
		status: 'status' in override ? (override.status as TaskStatus) : base.status,
		reminderEnabled:
			'reminderEnabled' in override
				? (override.reminderEnabled as boolean)
				: base.reminderEnabled,
		reminderOffsetMinutes:
			'reminderOffsetMinutes' in override
				? (override.reminderOffsetMinutes as ReminderOffset)
				: base.reminderOffsetMinutes,
		hasOverride: overridesContent(override),
		isSkipped: override.isSkipped,
	};
}
