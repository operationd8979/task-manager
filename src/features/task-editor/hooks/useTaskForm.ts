import { useCallback, useMemo, useState } from 'react';

import { useDatabase } from '../../../app/providers/DatabaseProvider';
import {
	DEFAULT_REMINDER_OFFSET,
	type ReminderOffset,
} from '../../../domain/reminder';
import {
	validateTask,
	type FieldError,
	type NewTask,
	type Task,
	type TaskStatus,
} from '../../../domain/task';
import { withTimeFrom, type RecurringRule } from '../../../domain/recurrence';
import { DataError } from '../../../services/db/errors';
import { createRecurrenceRepository } from '../../../services/db/recurrenceRepository';
import { createTaskRepository } from '../../../services/db/taskRepository';
import type { RecurrenceValue } from '../components/RecurrenceSheet';
import {
	nextWholeHour,
	today,
	type LocalDate,
	type LocalTime,
} from '../../../lib/date';

/** 'series' edits the RULE behind a repeating session, not one session. */
export type FormMode = 'create' | 'edit' | 'series';

export interface TaskFormValues {
	title: string;
	note: string;
	taskDate: LocalDate;
	startTime: LocalTime;
	endTime: LocalTime | null;
	status: TaskStatus;
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
	/** null means this is a one-off task rather than a series (FR-008). */
	recurrence: RecurrenceValue | null;
}

export type SaveState =
	| { status: 'idle' }
	| { status: 'saving' }
	| { status: 'failed' };

export interface UseTaskFormOptions {
	/** Absent for a new task. */
	task?: Task;
	/**
	 * The series being edited. Mutually exclusive with `task`.
	 *
	 * Editing one always means editing the whole series, so there is no scope
	 * question on this path (change.md §4): the sheet says as much, and the two
	 * fields that could not honestly apply to the past — the start date, and the
	 * repeat pattern — are shown but not editable.
	 */
	rule?: RecurringRule;
	/** The day the timeline is showing; the default for a new task. */
	viewingDate: LocalDate;
	/**
	 * Reports the date the record landed on, not the record itself: saving may
	 * produce a task or a recurring rule, and the screen only needs to know
	 * whether to follow it to another day (design/ia §5 F-2).
	 */
	onSaved: (savedDate: LocalDate) => void;
}

export function useTaskForm({
	task,
	rule,
	viewingDate,
	onSaved,
}: UseTaskFormOptions) {
	const { handle, errorLog } = useDatabase();
	const repository = useMemo(() => createTaskRepository(handle), [handle]);
	const recurrence = useMemo(
		() => createRecurrenceRepository(handle),
		[handle],
	);

	const mode: FormMode = rule ? 'series' : task ? 'edit' : 'create';

	/**
	 * Read once, when the form opens.
	 *
	 * Re-reading the clock per render would let the default start time step
	 * forward under the user while they are still typing a title, and `dirty`
	 * compares against these initial values — a moving baseline would make a
	 * form the user never touched look edited.
	 */
	const [openedAt] = useState(() => new Date());

	const initial = useMemo<TaskFormValues>(
		() =>
			rule
				? {
					title: rule.title,
					note: rule.note ?? '',
					// The day the series began, shown so the user knows what they are
					// editing. The form disables it: moving it would change which
					// sessions ever existed, which is not an edit, it is a different
					// series (change.md §4).
					taskDate: rule.startDate,
					// The time the series runs at NOW. Past sessions keep their own,
					// which is what `withTimeFrom` records on save.
					startTime: rule.defaultStartTime,
					endTime: rule.defaultEndTime,
					status: 'processing',
					reminderEnabled: rule.reminderEnabled,
					reminderOffsetMinutes: rule.reminderOffsetMinutes,
					recurrence: {
						frequency: rule.frequency,
						daysOfWeek: rule.daysOfWeek,
						daysOfMonth: rule.daysOfMonth,
						startDate: rule.startDate,
						endDate: rule.endDate,
					},
				}
				: task
				? {
					title: task.title,
					note: task.note ?? '',
					taskDate: task.taskDate,
					startTime: task.startTime,
					endTime: task.endTime,
					status: task.status,
					reminderEnabled: task.reminderEnabled,
					reminderOffsetMinutes: task.reminderOffsetMinutes,
					recurrence: null,
				}
				: {
					// Principle I: every field with a predictable value ships a default.
					title: '',
					note: '',
					taskDate: viewingDate,
					startTime: nextWholeHour(openedAt),
					endTime: null,
					// Not offered on any form now (change.md §3): the timeline's
					// checkbox is the only way status changes, so every record starts
					// here and moves from there.
					status: 'processing',
					reminderEnabled: false,
					reminderOffsetMinutes: DEFAULT_REMINDER_OFFSET,
					// A new task does NOT repeat. Most tasks are one-offs, and a
					// default that quietly writes a recurring rule would make the
					// ordinary case the one that has to be undone (FR-008). "Hằng
					// ngày" is what the recurrence sheet opens on once the user has
					// said they want a repeat at all.
					recurrence: null,
				},
		[task, rule, viewingDate, openedAt],
	);

	const [values, setValues] = useState<TaskFormValues>(initial);
	const [save, setSave] = useState<SaveState>({ status: 'idle' });
	/** Errors only appear after a save attempt or after the field is touched. */
	const [touched, setTouched] = useState<ReadonlySet<keyof TaskFormValues>>(
		() => new Set(),
	);
	const [submitted, setSubmitted] = useState(false);

	const dirty = useMemo(
		() => (Object.keys(values) as Array<keyof TaskFormValues>).some(
			key => values[key] !== initial[key],
		),
		[values, initial],
	);

	const toDraft = useCallback(
		(v: TaskFormValues): NewTask => ({
			title: v.title.trim(),
			note: v.note.trim() === '' ? null : v.note.trim(),
			taskDate: v.taskDate,
			startTime: v.startTime,
			endTime: v.endTime,
			status: v.status,
			reminderEnabled: v.reminderEnabled,
			reminderOffsetMinutes: v.reminderOffsetMinutes,
		}),
		[],
	);

	// Validates on every keystroke (Delivery Baselines: forms validate while
	// typing), but only surfaces what the user has already engaged with.
	const allErrors = useMemo(() => validateTask(toDraft(values)), [
		values,
		toDraft,
	]);

	const visibleErrors = useMemo<FieldError[]>(
		() =>
			submitted
				? allErrors
				: allErrors.filter(e =>
					touched.has(e.field as keyof TaskFormValues),
				),
		[allErrors, submitted, touched],
	);

	const errorFor = useCallback(
		(field: keyof TaskFormValues) =>
			visibleErrors.find(e => e.field === field),
		[visibleErrors],
	);

	const setField = useCallback(
		<K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
			setValues(current => ({ ...current, [field]: value }));
			setTouched(current => new Set(current).add(field));
		},
		[],
	);

	const runSubmit = useCallback(async () => {
		setSubmitted(true);
		if (allErrors.length > 0) {
			// The screen scrolls to allErrors[0]; nothing is written.
			return;
		}

		setSave({ status: 'saving' });
		try {
			const draft = toDraft(values);

			if (rule !== undefined) {
				/**
				 * Title, note and reminder go straight onto the rule, so they reach
				 * every session including the ones already past — which is what was
				 * asked for, and is also the only way an edit to a series' name does
				 * not leave its own history reading under the old one.
				 *
				 * The time is the exception: `withTimeFrom` moves it from TODAY
				 * onwards and records what it used to be, so a session that has
				 * already happened is still shown at the hour it happened at.
				 * Per-session overrides are untouched by all of this — a session the
				 * user deliberately gave its own title keeps it (FR-030).
				 */
				await recurrence.updateRule(rule.id, {
					title: draft.title,
					note: draft.note,
					reminderEnabled: draft.reminderEnabled,
					reminderOffsetMinutes: draft.reminderOffsetMinutes,
					...withTimeFrom(rule, today(), draft.startTime, draft.endTime),
				});
				setSave({ status: 'idle' });
				// The day being viewed, NOT the series start date: the user is looking
				// at one session and expects to still be looking at it afterwards.
				onSaved(viewingDate);
				return;
			}

			if (values.recurrence !== null && task === undefined) {
				// A repeating task is a RULE, not a task row. Occurrences are computed
				// when a day is drawn and never stored (FR-023).
				await recurrence.createRule({
					title: draft.title,
					note: draft.note,
					startDate: values.recurrence.startDate,
					endDate: values.recurrence.endDate,
					frequency: values.recurrence.frequency,
					daysOfWeek: values.recurrence.daysOfWeek,
					daysOfMonth: values.recurrence.daysOfMonth,
					defaultStartTime: draft.startTime,
					defaultEndTime: draft.endTime,
					// A brand-new series has never run at another time.
					timeHistory: [],
					reminderEnabled: draft.reminderEnabled,
					reminderOffsetMinutes: draft.reminderOffsetMinutes,
				});
				setSave({ status: 'idle' });
				onSaved(values.recurrence.startDate);
				return;
			}

			const saved =
				task === undefined
					? await repository.create(draft)
					: await repository.update(task.id, draft);
			setSave({ status: 'idle' });
			onSaved(saved.taskDate);
		} catch (error) {
			// Entered values are kept untouched — losing them is the thing that
			// makes a save failure unforgivable (Delivery Baselines).
			errorLog.report({
				code: error instanceof DataError ? error.code : 'UNKNOWN',
				operation: 'task.save',
				recordId: task?.id ?? rule?.id,
			});
			setSave({ status: 'failed' });
		}
	}, [
		allErrors,
		toDraft,
		values,
		task,
		rule,
		viewingDate,
		repository,
		recurrence,
		onSaved,
		errorLog,
	]);

	/**
	 * Exposed synchronously: a button handler should not have to know that saving
	 * is asynchronous, and `runSubmit` already routes every failure into save
	 * state plus the error log, so there is nothing left for a caller to await.
	 */
	const submit = useCallback(() => {
		runSubmit().catch(() => {
			// Unreachable: runSubmit handles its own failures.
		});
	}, [runSubmit]);

	return {
		mode,
		values,
		setField,
		/** All errors, in field order — the screen focuses the first one. */
		errors: allErrors,
		errorFor,
		dirty,
		save,
		submit,
	};
}
