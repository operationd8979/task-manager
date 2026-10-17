import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Chip, ChipRow } from '../../../components/Chip';
import { Segmented } from '../../../components/Segmented';
import { Sheet } from '../../../components/Sheet';
import { Text } from '../../../components/Text';
import {
	monthsWithoutDay,
	type RecurrenceFrequency,
} from '../../../domain/recurrence';
import type { RepeatSummary } from '../../../domain/timeline';
import {
	compareDate,
	type LocalDate,
	type LocalTime,
	type Weekday,
} from '../../../lib/date';
import type { AppI18nKey } from '../../../i18n';
import { useT } from '../../../i18n/useT';
import { monthList, repeatPatternLabel, weekdayShort } from '../../../lib/format';
import { BAR_HEIGHT } from '../../../theme/tokens';
import { ChoiceList } from './ChoiceList';
import { DateTimeField } from './DateTimeField';
import { Field } from './Field';

const ALL_WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

const DAYS_OF_MONTH: readonly number[] = Array.from(
	{ length: 31 },
	(_, i) => i + 1,
);

const PRESETS: ReadonlyArray<{ labelKey: AppI18nKey; days: Weekday[] }> = [
	{ labelKey: 'repeat.presetWeekdays', days: [1, 2, 3, 4, 5] as Weekday[] },
	{ labelKey: 'repeat.presetWeekend', days: [6, 7] as Weekday[] },
	{ labelKey: 'repeat.presetDaily', days: [...ALL_WEEKDAYS] as Weekday[] },
];

/** What the segmented control holds — 'none' is the absence of a rule. */
type RepeatMode = 'none' | RecurrenceFrequency;

export interface RecurrenceValue {
	frequency: RecurrenceFrequency;
	/** Read only when `frequency` is 'weekly'. */
	daysOfWeek: readonly Weekday[];
	/** Read only when `frequency` is 'monthlyByDay'. */
	daysOfMonth: readonly number[];
	startDate: LocalDate;
	endDate: LocalDate | null;
}

export interface RecurrenceSheetProps {
	/** null means the task does not repeat. */
	value: RecurrenceValue | null;
	/** Shown in the preview so the sentence is complete. */
	startTime: LocalTime;
	defaultStartDate: LocalDate;
	onDone: (next: RecurrenceValue | null) => void;
	onClose: () => void;
}

/**
 * Recurrence setup (S-04 / W-05).
 *
 * The plain-language preview sits directly above the confirm button on purpose:
 * it is where people notice they picked the wrong weekday, and it only works if
 * they read it on the way out (FR-024).
 */
export function RecurrenceSheet({
	value,
	startTime,
	defaultStartDate,
	onDone,
	onClose,
}: Readonly<RecurrenceSheetProps>) {
	const t = useT();
	const [mode, setMode] = useState<RepeatMode>(value?.frequency ?? 'none');
	/**
	 * Every weekday is the starting point for a repeat that has not been set up
	 * yet (`value === null`).
	 *
	 * Someone who has just said "Lặp theo thứ" wants a repeat; handing them seven
	 * empty chips and the "Chọn ít nhất một thứ" error makes the first thing they
	 * see a validation failure. Daily is the most common answer and the easiest
	 * to subtract from — deselecting the two weekend chips is two taps.
	 */
	const [days, setDays] = useState<readonly Weekday[]>(
		value?.daysOfWeek ?? ALL_WEEKDAYS,
	);
	/**
	 * The same argument lands on the OPPOSITE default for days of the month:
	 * "every day of the month" is not a thing anyone means by "lặp theo ngày", so
	 * the sensible starting point is the day the task is already on.
	 */
	const [monthDays, setMonthDays] = useState<readonly number[]>(
		value?.daysOfMonth ?? [Number(defaultStartDate.slice(8, 10))],
	);
	const [startDate, setStartDate] = useState(
		value?.startDate ?? defaultStartDate,
	);
	const [endDate, setEndDate] = useState<LocalDate | null>(
		value?.endDate ?? null,
	);

	const noDaysChosen = mode === 'weekly' && days.length === 0;
	const noMonthDaysChosen = mode === 'monthlyByDay' && monthDays.length === 0;
	const nothingChosen = noDaysChosen || noMonthDaysChosen;
	const endBeforeStart =
		endDate !== null && compareDate(endDate, startDate) < 0;

	/** The months a day-of-month choice will silently produce nothing for. */
	const emptyMonths = useMemo(
		() =>
			mode === 'monthlyByDay' ? monthsWithoutDay(monthDays, startDate) : [],
		[mode, monthDays, startDate],
	);

	const preview = useMemo(() => {
		if (mode === 'none' || nothingChosen || endBeforeStart) {
			return t('repeat.previewNone');
		}
		return t('repeat.preview', {
			days: repeatPatternLabel(summaryOf(mode, days, monthDays)),
			time: startTime,
			start: startDate,
			end:
				endDate === null
					? t('repeat.previewOpenEnded')
					: t('repeat.previewUntil', { end: endDate }),
		});
	}, [
		mode,
		nothingChosen,
		endBeforeStart,
		days,
		monthDays,
		startTime,
		startDate,
		endDate,
		t,
	]);

	const toggleDay = (day: Weekday) =>
		setDays(current =>
			current.includes(day)
				? current.filter(d => d !== day)
				: [...current, day],
		);

	const toggleMonthDay = (day: number) =>
		setMonthDays(current =>
			current.includes(day)
				? current.filter(d => d !== day)
				: [...current, day],
		);

	const confirm = () => {
		if (mode === 'none') {
			onDone(null);
			return;
		}
		if (nothingChosen || endBeforeStart) {
			// The button stays live and the errors are already visible; swallowing
			// the tap silently is what makes a form feel broken.
			return;
		}
		onDone({
			frequency: mode,
			daysOfWeek: mode === 'weekly' ? days : [],
			daysOfMonth: mode === 'monthlyByDay' ? monthDays : [],
			startDate,
			endDate,
		});
	};

	return (
		<Sheet
			title={t('repeat.title')}
			onClose={onClose}
			footer={
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('common.done')}
					onPress={confirm}
					style={styles.primary}>
					<Text style={styles.primaryLabel}>{t('common.done')}</Text>
				</Pressable>
			}>
			{/* A list, not a segmented grid: four labels need a sentence each to
          be told apart, and a sentence does not fit in a segment. */}
			<ChoiceList<RepeatMode>
				accessibilityLabel={t('repeat.title')}
				value={mode}
				onChange={next => {
					// Turning the repeat back on after clearing every chip lands on
					// daily again rather than on the empty-selection error.
					if (next === 'weekly' && days.length === 0) {
						setDays(ALL_WEEKDAYS);
					}
					if (next === 'monthlyByDay' && monthDays.length === 0) {
						setMonthDays([Number(startDate.slice(8, 10))]);
					}
					setMode(next);
				}}
				choices={[
					{
						value: 'none',
						label: t('repeat.none'),
						description: t('repeat.noneDescription'),
					},
					{
						value: 'weekly',
						label: t('repeat.byWeekday'),
						description: t('repeat.byWeekdayDescription'),
					},
					{
						value: 'monthlyByDay',
						label: t('repeat.byMonthDay'),
						description: t('repeat.byMonthDayDescription'),
					},
					{
						value: 'monthlyLastDay',
						label: t('repeat.byLastDay'),
						description: t('repeat.byLastDayDescription'),
					},
				]}
			/>

			{/* Hidden outright rather than dimmed: nothing to read should take up no
          room (design/ux-ui-spec.md §3). */}
			{mode === 'none' ? null : (
				<>
					{mode === 'weekly' ? (
						<Field
							label={t('repeat.weekdays')}
							error={noDaysChosen ? t('validate.weekdayRequired') : undefined}>
							<ChipRow>
								{ALL_WEEKDAYS.map(day => (
									<Chip
										key={day}
										label={weekdayShort(day)}
										selected={days.includes(day)}
										onPress={() => toggleDay(day)}
									/>
								))}
							</ChipRow>
							<ChipRow>
								{PRESETS.map(preset => (
									<Chip
										key={preset.labelKey}
										label={t(preset.labelKey)}
										selected={sameDays(days, preset.days)}
										onPress={() => setDays(preset.days)}
									/>
								))}
							</ChipRow>
						</Field>
					) : null}

					{mode === 'monthlyByDay' ? (
						<Field
							label={t('repeat.monthDays')}
							error={
								noMonthDaysChosen ? t('validate.monthDayRequired') : undefined
							}>
							<ChipRow>
								{DAYS_OF_MONTH.map(day => (
									<Chip
										key={day}
										label={String(day)}
										accessibilityLabel={t('repeat.dayOfMonth', { day })}
										selected={monthDays.includes(day)}
										onPress={() => toggleMonthDay(day)}
									/>
								))}
							</ChipRow>
							{/* Said before the series exists, not discovered in February.
                  A month with no session reads as a bug unless the app told
                  the user it would happen. */}
							{emptyMonths.length > 0 ? (
								<Text style={styles.warning}>
									{/* Số ít và số nhiều là hai câu khác nhau: "vì các tháng đó"
                      với đúng một tháng đọc như một lỗi dịch. */}
									{emptyMonths.length === 1
										? t('repeat.skipsMonth', {
											months: monthList(emptyMonths),
										})
										: t('repeat.skipsMonths', {
											months: monthList(emptyMonths),
										})}
								</Text>
							) : null}
						</Field>
					) : null}

					{mode === 'monthlyLastDay' ? (
						<Text style={styles.hint}>{t('repeat.lastDayHint')}</Text>
					) : null}

					<Field label={t('repeat.startDate')}>
						<DateTimeField
							mode="date"
							accessibilityLabel={t('repeat.startDate')}
							value={startDate}
							onChange={setStartDate}
						/>
					</Field>

					<Field
						label={t('repeat.endDate')}
						error={
							endBeforeStart
								? t('validate.endDateBeforeStart', { start: startDate })
								: undefined
						}>
						<Segmented<'open' | 'until'>
							accessibilityLabel={t('repeat.endDate')}
							value={endDate === null ? 'open' : 'until'}
							onChange={next =>
								setEndDate(next === 'open' ? null : startDate)
							}
							options={[
								{ value: 'open', label: t('repeat.noEndDate') },
								{ value: 'until', label: t('repeat.untilDate') },
							]}
						/>
						{/* In-sheet, not a fourth level (design/ia §2 "Trần ba cấp"). */}
						{endDate !== null ? (
							<DateTimeField
								mode="date"
								accessibilityLabel={t('repeat.untilDate')}
								value={endDate}
								onChange={setEndDate}
							/>
						) : null}
					</Field>

					<View style={styles.preview}>
						<Text style={styles.previewText}>{preview}</Text>
					</View>
				</>
			)}
		</Sheet>
	);
}

/**
 * The sheet's three separate pieces of state, collapsed into the one shape the
 * label formatter takes — so the preview here and the row on the timeline are
 * built by the same code and cannot drift apart.
 */
function summaryOf(
	mode: RecurrenceFrequency,
	days: readonly Weekday[],
	monthDays: readonly number[],
): RepeatSummary {
	switch (mode) {
		case 'weekly':
			return { frequency: 'weekly', daysOfWeek: days };
		case 'monthlyByDay':
			return { frequency: 'monthlyByDay', daysOfMonth: monthDays };
		case 'monthlyLastDay':
			return { frequency: 'monthlyLastDay' };
	}
}

function sameDays(a: readonly Weekday[], b: readonly Weekday[]): boolean {
	return a.length === b.length && b.every(day => a.includes(day));
}

const styles = StyleSheet.create(theme => ({
	preview: {
		...theme.box.touchTarget,
		borderWidth: theme.borderWidth.thin,
		borderStyle: 'dashed',
		borderColor: theme.tone.accent.fg,
		padding: theme.spacing.sm,
	},
	previewText: {
		...theme.typography.label,
		color: theme.tone.accent.fg,
	},
	warning: {
		...theme.typography.label,
		color: theme.tone.accent.onContainer,
		backgroundColor: theme.tone.accent.container,
		paddingHorizontal: theme.spacing.xs,
		paddingVertical: theme.spacing.xxs,
	},
	hint: theme.text.labelMuted,
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
