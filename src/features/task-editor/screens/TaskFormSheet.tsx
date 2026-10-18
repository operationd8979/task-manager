import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { useReminders } from '../../../app/providers/ReminderProvider';
import { Chip, ChipRow } from '../../../components/Chip';
import { ErrorState } from '../../../components/ErrorState';
import { Notice } from '../../../components/Notice';
import { Sheet } from '../../../components/Sheet';
import { SheetTextInput } from '../../../components/SheetTextInput';
import { Text } from '../../../components/Text';
import { Toggle } from '../../../components/Toggle';
import {
	isInPast,
	notificationPlan,
	REMINDER_OFFSETS,
} from '../../../domain/reminder';
import type { RecurringRule } from '../../../domain/recurrence';
import type { Task } from '../../../domain/task';
import type { RepeatSummary } from '../../../domain/timeline';
import type { AppI18nKey, Translate } from '../../../i18n';
import { useT } from '../../../i18n/useT';
import { minutesOf, timeFromMinutes, type LocalDate } from '../../../lib/date';
import { repeatPatternLabel } from '../../../lib/format';
import { BAR_HEIGHT, NOTE_FIELD_HEIGHT } from '../../../theme/tokens';
import { DateTimeField } from '../components/DateTimeField';
import { Field } from '../components/Field';
import {
	RecurrenceSheet,
	type RecurrenceValue,
} from '../components/RecurrenceSheet';
import { useTaskForm } from '../hooks/useTaskForm';

/** Durations offered as one-tap end times (Principle I: selection over typing). */
const DURATION_CHIPS: ReadonlyArray<{ minutes: number; labelKey: AppI18nKey }> = [
	{ minutes: 30, labelKey: 'form.plus30' },
	{ minutes: 45, labelKey: 'form.plus45' },
	{ minutes: 60, labelKey: 'form.plus60' },
];

/** dp at text size 100%: a `YYYY-MM-DD` value plus the field's padding and border. */
const DATE_CELL_BASIS = 112;

export interface TaskFormSheetProps {
	task?: Task;
	/** The series being edited. Mutually exclusive with `task`. */
	rule?: RecurringRule;
	viewingDate: LocalDate;
	onSaved: (savedDate: LocalDate, meta: { created: boolean }) => void;
	onClose: () => void;
}

export function TaskFormSheet({
	task,
	rule,
	viewingDate,
	onSaved,
	onClose,
}: Readonly<TaskFormSheetProps>) {
	const t = useT();
	const form = useTaskForm({ task, rule, viewingDate, onSaved });
	const series = form.mode === 'series';
	// The sheet owns the scrolling now, so this reaches into it rather than
	// wrapping the fields in a second scroll view.
	const scroll = useRef<BottomSheetScrollViewMethods>(null);
	const saving = form.save.status === 'saving';
	const [confirmDiscard, setConfirmDiscard] = useState(false);
	const [editingRepeat, setEditingRepeat] = useState(false);
	const reminders = useReminders();

	/**
	 * Turning the switch on is the ONE moment permission is requested (FR-036a).
	 * A refusal never blocks the save — the app does what it can and says plainly
	 * what it cannot guarantee (FR-039).
	 */
	const setReminderEnabled = useCallback(
		(next: boolean) => {
			Keyboard.dismiss();
			form.setField('reminderEnabled', next);
			if (next) {
				reminders.ensurePermission().catch(() => undefined);
			}
		},
		[form, reminders],
	);

	/**
	 * Saving is what commits the app to notifying about this task, so it is also
	 * where permission is asked when the reminder switch never was (FR-036a still
	 * holds: nothing is asked at first launch, only once the user has written a
	 * task down). Deliberately not awaited — a refusal must not delay or block
	 * the save (FR-039).
	 */
	const submitAndNotify = useCallback(() => {
		reminders.ensurePermission().catch(() => undefined);
		form.submit();
	}, [form, reminders]);

	const plan = notificationPlan({
		reminderEnabled: form.values.reminderEnabled,
		reminderOffsetMinutes: form.values.reminderOffsetMinutes,
		taskDate: form.values.taskDate,
		startTime: form.values.startTime,
	});
	/**
	 * Now worth saying for a task with no reminder too: the silent notice is
	 * still a notification, and a moment already gone still gets none (FR-038).
	 *
	 * Never said for a series. `plan` is built from the form's date, which for a
	 * series is the day the whole thing STARTED — so an ongoing daily habit set
	 * up last year would greet every edit with "thời điểm nhắc đã qua" while its
	 * next session is tomorrow morning. A series' reminders are derived per
	 * session at reconcile time; this screen has nothing true to say about them.
	 */
	const notifyInPast = !series && isInPast(plan.fireAt, new Date());
	const mayBeLate =
		form.values.reminderEnabled &&
		reminders.exactAlarm.required &&
		!reminders.exactAlarm.granted;

	/**
	 * FR-013: leaving with unsaved edits has to be a decision, not an accident.
	 * Three ways out, because "save" and "discard" alone force a choice the user
	 * may not be ready to make.
	 */
	const requestClose = useCallback(() => {
		if (form.dirty) {
			setConfirmDiscard(true);
			return;
		}
		onClose();
	}, [form.dirty, onClose]);

	// Delivery Baselines: scroll to the first invalid field on submit rather
	// than leaving the user to hunt for what went wrong.
	useEffect(() => {
		if (form.errors.length > 0 && form.save.status === 'idle') {
			scroll.current?.scrollTo({ y: 0, animated: true });
		}
	}, [form.errors.length, form.save.status]);

	const setEndFromDuration = useCallback(
		(minutes: number) => {
			form.setField(
				'endTime',
				timeFromMinutes(minutesOf(form.values.startTime) + minutes),
			);
		},
		[form],
	);

	const message = (
		key: AppI18nKey | undefined,
		params?: Record<string, string>,
	) => (key === undefined ? undefined : t(key, params));

	const endError = form.errorFor('endTime');

	return (
		<Sheet
			title={seriesOrTaskTitle(t, series, task !== undefined)}
			onClose={requestClose}
			scrollRef={scroll}
			footer={
				<Pressable
					accessibilityRole="button"
					accessibilityState={{ disabled: saving }}
					accessibilityLabel={saveLabel(t, saving, task !== undefined || series)}
					disabled={saving}
					onPress={submitAndNotify}
					style={styles.primary}>
					<Text style={styles.primaryLabel}>
						{saveLabel(t, saving, task !== undefined || series)}
					</Text>
				</Pressable>
			}>
			{confirmDiscard ? (
				<View accessibilityRole="alert" style={styles.unsaved}>
					<Text style={styles.unsavedTitle}>{t('unsaved.title')}</Text>
					{/* Three buttons, not three lines of text. They ask for a decision,
              and a row that only looks like a label does not read as one of
              them — which is how people end up tapping nothing at all. */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t('unsaved.saveAndClose')}
						onPress={() => {
							setConfirmDiscard(false);
							submitAndNotify();
						}}
						style={styles.unsavedPrimary}>
						<Text style={styles.unsavedPrimaryLabel}>
							{t('unsaved.saveAndClose')}
						</Text>
					</Pressable>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t('unsaved.keepEditing')}
						onPress={() => setConfirmDiscard(false)}
						style={styles.unsavedSecondary}>
						<Text style={styles.unsavedSecondaryLabel}>
							{t('unsaved.keepEditing')}
						</Text>
					</Pressable>
					{/* Outlined, never filled: losing the edits is the one irreversible
              choice here, so it must not be the easiest thing to hit. */}
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t('unsaved.discard')}
						onPress={onClose}
						style={styles.unsavedDanger}>
						<Text style={styles.unsavedDangerLabel}>
							{t('unsaved.discard')}
						</Text>
					</Pressable>
				</View>
			) : null}

			<>
				{form.save.status === 'failed' ? (
					<ErrorState
						title={t('save.failedTitle')}
						body={t('timeline.errorBody')}
						retryLabel={t('save.retry')}
						onRetry={form.submit}
					/>
				) : null}

				<View style={styles.fields}>
					<Field
						label={t('form.name')}
						error={message(form.errorFor('title')?.messageKey)}>
						<SheetTextInput
							accessibilityLabel={t('form.name')}
							initialValue={form.values.title}
							onChangeText={next => form.setField('title', next)}
							style={styles.input}
							autoFocus={task === undefined && !series}
						/>
					</Field>

					<View style={styles.row}>
						<View style={styles.dateCell}>
							{/* For a series this is the day the whole thing began, and it
                  is read-only: moving it would change which sessions ever
                  existed, which is a different series rather than an edit. */}
							<Field label={series ? t('form.seriesStart') : t('form.date')}>
								{series ? (
									<View style={styles.readOnly}>
										<Text style={styles.readOnlyValue}>
											{form.values.taskDate}
										</Text>
									</View>
								) : (
									<DateTimeField
										mode="date"
										accessibilityLabel={t('form.date')}
										value={form.values.taskDate}
										onChange={next => form.setField('taskDate', next)}
									/>
								)}
							</Field>
						</View>
						<View style={styles.cell}>
							<Field label={t('form.start')}>
								<DateTimeField
									mode="time"
									accessibilityLabel={t('form.start')}
									date={form.values.taskDate}
									value={form.values.startTime}
									onChange={next => form.setField('startTime', next)}
								/>
							</Field>
						</View>
						<View style={styles.cell}>
							<Field
								label={t('form.end')}
								error={message(endError?.messageKey, endError?.params)}>
								{form.values.endTime === null ? (
									<Pressable
										accessibilityRole="button"
										accessibilityLabel={t('form.end')}
										onPress={() => setEndFromDuration(60)}
										style={styles.emptyEnd}>
										<Text style={styles.emptyEndLabel}>{t('form.endUnset')}</Text>
									</Pressable>
								) : (
									<DateTimeField
										mode="time"
										accessibilityLabel={t('form.end')}
										date={form.values.taskDate}
										value={form.values.endTime}
										onChange={next => form.setField('endTime', next)}
									/>
								)}
							</Field>
						</View>
					</View>

					<ChipRow>
						{DURATION_CHIPS.map(chip => (
							<Chip
								key={chip.labelKey}
								label={t(chip.labelKey)}
								selected={false}
								onPress={() => setEndFromDuration(chip.minutes)}
							/>
						))}
						<Chip
							label={t('form.noEndTime')}
							selected={form.values.endTime === null}
							onPress={() => form.setField('endTime', null)}
						/>
					</ChipRow>

					{/* Status is deliberately NOT a field here (change.md §3). It has
              exactly one gesture now — the checkbox on the timeline row — so
              it cannot disagree with itself between two places, and nobody can
              mark something done inside a form they then close without
              saving. */}

					{/* Creating a series is a different write path, so the row is only
              offered on a new task. Converting an existing task into a series
              is not specified anywhere and would silently move its data.

              On a series it is shown but not pressable: changing which days
              repeat would delete sessions out of the past, which is the one
              thing this screen exists to avoid (change.md §4, §5). */}
					{series ? (
						<Field label={t('form.repeat')}>
							<View style={styles.readOnly}>
								<Text style={styles.readOnlyValue}>
									{repeatSummary(t, form.values.recurrence, form.values.startTime)}
								</Text>
							</View>
							<Text style={styles.appliesAll}>{t('form.seriesScope')}</Text>
						</Field>
					) : task === undefined ? (
						<Field label={t('form.repeat')}>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={t('form.repeat')}
								onPress={() => {
									Keyboard.dismiss();
									setEditingRepeat(true);
								}}
								style={styles.repeatRow}>
								<Text style={styles.repeatValue}>
									{repeatSummary(
										t,
										form.values.recurrence,
										form.values.startTime,
									)}
								</Text>
							</Pressable>
						</Field>
					) : null}

					<Field label={t('form.reminder')}>
						<View style={styles.switchRow}>
							{/* A word, not just a knob position (design/ux-ui-spec.md §4). */}
							<Text style={styles.switchLabel}>
								{form.values.reminderEnabled
									? t('form.reminderOn')
									: t('form.reminderOff')}
							</Text>
							<Toggle
								accessibilityLabel={t('form.reminder')}
								value={form.values.reminderEnabled}
								onValueChange={setReminderEnabled}
							/>
						</View>
						{/* Off no longer means silence — it means a notification without
                the chime. Said here because a switch labelled "tắt" otherwise
                promises nothing will happen. */}
						{form.values.reminderEnabled ? null : (
							<Text style={styles.reminderHint}>{t('form.reminderOffHint')}</Text>
						)}

						{/* A block that stays put, not a toast that disappears
                (design/ux-ui-spec.md §4). */}
						{mayBeLate ? (
							<Notice
								tone="warning"
								body={t('permission.inexactBody')}
								action={{
									label: t('permission.grant'),
									onPress: () => {
										reminders
											.openSettings('exact-alarm')
											.catch(() => undefined);
									},
								}}
							/>
						) : null}

						{/* FR-038: the app will not schedule a moment that has passed, and
                says so rather than letting the OS fire it immediately. */}
						{notifyInPast ? (
							<Text style={styles.reminderWarningText}>
								{plan.tone === 'alert'
									? t('validate.reminderInPast')
									: t('validate.startInPast')}
							</Text>
						) : null}

						{form.values.reminderEnabled ? (
							<ChipRow>
								{REMINDER_OFFSETS.map(offset => (
									<Chip
										key={offset}
										label={
											offset === 0
												? t('form.reminderOnTime')
												: t('form.reminderBefore', { minutes: offset })
										}
										selected={form.values.reminderOffsetMinutes === offset}
										onPress={() =>
											form.setField('reminderOffsetMinutes', offset)
										}
									/>
								))}
							</ChipRow>
						) : null}
					</Field>

					<Field label={t('form.note')}>
						<SheetTextInput
							accessibilityLabel={t('form.note')}
							initialValue={form.values.note}
							onChangeText={next => form.setField('note', next)}
							multiline
							style={styles.textarea}
						/>
					</Field>
				</View>
			</>

			{editingRepeat ? (
				<RecurrenceSheet
					value={form.values.recurrence}
					startTime={form.values.startTime}
					defaultStartDate={form.values.taskDate}
					onDone={next => {
						form.setField('recurrence', next);
						setEditingRepeat(false);
					}}
					onClose={() => setEditingRepeat(false)}
				/>
			) : null}
		</Sheet>
	);
}

/**
 * What the Lặp lại row reads.
 *
 * All seven weekdays get their own sentence: since a new task now defaults to
 * repeating daily, the literal listing — "Lặp T2, T3, T4, T5, T6, T7, CN" — is
 * the first thing most people would see, and it takes a second read to work out
 * that it just means every day.
 */
function repeatSummary(
	t: Translate,
	value: RecurrenceValue | null,
	startTime: string,
): string {
	if (value === null) {
		return t('form.noRepeat');
	}
	if (value.frequency === 'weekly' && value.daysOfWeek.length === 7) {
		return t('repeat.summaryDaily', { time: startTime });
	}
	return t('repeat.summary', {
		days: repeatPatternLabel(patternOf(value)),
		time: startTime,
	});
}

function patternOf(value: RecurrenceValue): RepeatSummary {
	switch (value.frequency) {
		case 'weekly':
			return { frequency: 'weekly', daysOfWeek: value.daysOfWeek };
		case 'monthlyByDay':
			return { frequency: 'monthlyByDay', daysOfMonth: value.daysOfMonth };
		case 'monthlyLastDay':
			return { frequency: 'monthlyLastDay' };
	}
}

/** Which of the three things this sheet can be doing, in its header. */
function seriesOrTaskTitle(
	t: Translate,
	series: boolean,
	editing: boolean,
): string {
	if (series) {
		return t('form.editSeriesTitle');
	}
	return editing ? t('form.editTitle') : t('form.newTitle');
}

function saveLabel(t: Translate, saving: boolean, editing: boolean): string {
	if (saving) {
		return t('form.saving');
	}
	return editing ? t('form.saveEdit') : t('form.save');
}

const styles = StyleSheet.create((theme, rt) => ({
	fields: {
		gap: theme.spacing.md,
		paddingBottom: theme.spacing.lg,
	},
	row: {
		// Wraps rather than clipping when the OS text size is turned up.
		...layout.wrap,
		gap: theme.spacing.sm,
	},
	cell: {
		flexGrow: 1,
		flexBasis: 96,
	},
	dateCell: {
		flexGrow: 1,
		// Room for a whole `YYYY-MM-DD` at the current text size. At the shared
		// 96 the date broke in two inside its box on a 393 dp phone; this way a
		// narrow screen or a large font moves it onto a line of its own instead.
		flexBasis: DATE_CELL_BASIS * rt.fontScale,
	},
	input: {
		...theme.typography.body,
		minHeight: theme.size.touchTarget,
		borderWidth: theme.borderWidth.thin,
		borderColor: theme.color.outline,
		backgroundColor: theme.color.surfaceContainerHigh,
		color: theme.color.onSurface,
		paddingHorizontal: theme.spacing.sm,
	},
	textarea: {
		...theme.typography.label,
		minHeight: NOTE_FIELD_HEIGHT.min,
		// Past this it scrolls inside itself, so the whole field — and the line
		// being typed — always fits in the gap above the keyboard.
		maxHeight: NOTE_FIELD_HEIGHT.max,
		borderWidth: theme.borderWidth.thin,
		borderColor: theme.color.outline,
		backgroundColor: theme.color.surfaceContainerHigh,
		color: theme.color.onSurface,
		padding: theme.spacing.sm,
		textAlignVertical: 'top',
	},
	emptyEnd: {
		...theme.box.touchTarget,
		paddingHorizontal: theme.spacing.sm,
		borderWidth: theme.borderWidth.thin,
		borderStyle: 'dashed',
		borderColor: theme.color.outline,
	},
	emptyEndLabel: theme.text.bodyMuted,
	switchRow: {
		...layout.rowBetween,
		minHeight: theme.size.touchTarget,
	},
	switchLabel: theme.text.body,
	reminderHint: theme.text.labelMuted,
	reminderWarningText: {
		...theme.typography.label,
		color: theme.tone.accent.fg,
	},
	repeatRow: {
		...theme.box.touchTarget,
		borderWidth: theme.borderWidth.thin,
		borderColor: theme.color.outline,
		paddingHorizontal: theme.spacing.sm,
	},
	repeatValue: theme.text.body,
	/**
	 * A value the user can read but not change.
	 *
	 * Dashed rather than solid, on the divider colour and the muted ink:
	 * legible enough to answer "which series am I editing", and plainly not an
	 * input — otherwise people tap it, nothing opens, and they conclude the
	 * screen is broken.
	 */
	readOnly: {
		...theme.box.touchTarget,
		paddingHorizontal: theme.spacing.sm,
		borderWidth: theme.borderWidth.thin,
		borderStyle: 'dashed',
		borderColor: theme.color.outlineVariant,
		backgroundColor: theme.color.surfaceContainerHigh,
	},
	readOnlyValue: theme.text.bodyMuted,
	appliesAll: theme.text.labelMuted,
	unsaved: {
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.tone.accent.fg,
		padding: theme.spacing.sm,
		gap: theme.spacing.sm,
		marginBottom: theme.spacing.md,
	},
	unsavedTitle: {
		...theme.text.body,
		...theme.font.heavy,
	},
	unsavedPrimary: {
		...theme.box.touchTarget,
		alignItems: 'center',
		paddingHorizontal: theme.spacing.sm,
		backgroundColor: theme.tone.accent.fill,
	},
	unsavedPrimaryLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.onFill,
	},
	unsavedSecondary: {
		...theme.box.touchTarget,
		alignItems: 'center',
		paddingHorizontal: theme.spacing.sm,
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.color.onBackground,
	},
	unsavedSecondaryLabel: {
		...theme.text.body,
		...theme.font.heavy,
	},
	unsavedDanger: {
		...theme.box.touchTarget,
		alignItems: 'center',
		paddingHorizontal: theme.spacing.sm,
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.tone.accent.fg,
	},
	unsavedDangerLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.fg,
	},
	primary: {
		...layout.center,
		minHeight: BAR_HEIGHT.action,
		paddingHorizontal: theme.spacing.md,
		backgroundColor: theme.tone.accent.fill,
	},
	primaryLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.onFill,
	},
}));
