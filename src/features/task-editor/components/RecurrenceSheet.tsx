import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Chip, ChipRow } from '../../../components/Chip';
import { Segmented } from '../../../components/Segmented';
import { Sheet } from '../../../components/Sheet';
import { Text } from '../../../components/Text';
import { compareDate, type LocalDate, type LocalTime, type Weekday } from '../../../lib/date';
import { weekdayShort } from '../../../lib/format';
import { t } from '../../../lib/strings';
import { appTheme } from '../../../theme/theme';
import { BAR_HEIGHT, TAP_TARGET_MIN } from '../../../theme/tokens';
import { DateTimeField } from './DateTimeField';
import { Field } from './Field';

const ALL_WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7];

const PRESETS = [
	{ key: 'repeat.presetWeekdays' as const, days: [1, 2, 3, 4, 5] as Weekday[] },
	{ key: 'repeat.presetWeekend' as const, days: [6, 7] as Weekday[] },
	{ key: 'repeat.presetDaily' as const, days: [...ALL_WEEKDAYS] as Weekday[] },
];

export interface RecurrenceValue {
	daysOfWeek: readonly Weekday[];
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
}: RecurrenceSheetProps) {
	const [repeats, setRepeats] = useState(value !== null);
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
	const [startDate, setStartDate] = useState(
		value?.startDate ?? defaultStartDate,
	);
	const [endDate, setEndDate] = useState<LocalDate | null>(
		value?.endDate ?? null,
	);

	const noDaysChosen = repeats && days.length === 0;
	const endBeforeStart =
		endDate !== null && compareDate(endDate, startDate) < 0;

	const preview = useMemo(() => {
		if (!repeats || noDaysChosen || endBeforeStart) {
			return t('repeat.previewNone');
		}
		const sorted = [...days].sort((a, b) => a - b);
		return t('repeat.preview', {
			days: sorted.map(weekdayShort).join(', '),
			time: startTime,
			start: startDate,
			end:
				endDate === null
					? t('repeat.previewOpenEnded')
					: t('repeat.previewUntil', { end: endDate }),
		});
	}, [
		repeats,
		noDaysChosen,
		endBeforeStart,
		days,
		startTime,
		startDate,
		endDate,
	]);

	const toggleDay = (day: Weekday) =>
		setDays(current =>
			current.includes(day)
				? current.filter(d => d !== day)
				: [...current, day],
		);

	const confirm = () => {
		if (!repeats) {
			onDone(null);
			return;
		}
		if (noDaysChosen || endBeforeStart) {
			// The button stays live and the errors are already visible; swallowing
			// the tap silently is what makes a form feel broken.
			return;
		}
		onDone({ daysOfWeek: days, startDate, endDate });
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
			<Segmented<'none' | 'weekly'>
				accessibilityLabel={t('repeat.title')}
				value={repeats ? 'weekly' : 'none'}
				onChange={next => {
					// Turning the repeat back on after clearing every chip lands on
					// daily again rather than on the empty-selection error.
					if (next === 'weekly' && days.length === 0) {
						setDays(ALL_WEEKDAYS);
					}
					setRepeats(next === 'weekly');
				}}
				options={[
					{ value: 'none', label: t('repeat.none') },
					{ value: 'weekly', label: t('repeat.byWeekday') },
				]}
			/>

			{/* Hidden outright rather than dimmed: nothing to read should take up no
          room (design/ux-ui-spec.md §3). */}
			{repeats ? (
				<>
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
									key={preset.key}
									label={t(preset.key)}
									selected={sameDays(days, preset.days)}
									onPress={() => setDays(preset.days)}
								/>
							))}
						</ChipRow>
					</Field>

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
			) : null}
		</Sheet>
	);
}

function sameDays(a: readonly Weekday[], b: readonly Weekday[]): boolean {
	return a.length === b.length && b.every(day => a.includes(day));
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		preview: {
			borderWidth: 1,
			borderStyle: 'dashed',
			borderColor: theme.appColor.accentInk,
			padding: theme.spacing.sm,
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
		},
		previewText: {
			...theme.typography.label,
			color: theme.appColor.accentInk,
		},
		primary: {
			minHeight: BAR_HEIGHT.action,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: theme.spacing.md,
			backgroundColor: theme.appColor.accentFill,
		},
		primaryLabel: {
			...theme.typography.body,
			color: theme.appColor.onAccent,
			fontWeight: '800',
		},
	};
});
