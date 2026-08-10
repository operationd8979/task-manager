import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Chevron } from '../../../components/Chevron';
import { Sheet } from '../../../components/Sheet';
import { Text } from '../../../components/Text';
import {
	addDays,
	parseLocalDate,
	today,
	toLocalDate,
	weekdayOf,
	type LocalDate,
	type Weekday,
} from '../../../lib/date';
import { weekdayShort } from '../../../lib/format';
import { t } from '../../../lib/strings';
import { appTheme } from '../../../theme/theme';
import {
	BAR_HEIGHT,
	SHEET_CHEVRON_SIZE,
	TAP_TARGET_MIN,
} from '../../../theme/tokens';
import { useBusyDays } from '../hooks/useBusyDays';

const WEEK_LENGTH = 7;

export interface DatePickerSheetProps {
	selected: LocalDate;
	/** From settings; the grid starts the week where the user expects (FR-052). */
	firstDayOfWeek: Weekday;
	onSelect: (date: LocalDate) => void;
	onClose: () => void;
}

/**
 * Month grid (S-02 / W-07).
 *
 * The grid is usable the moment it opens. Busy-day dots arrive separately and
 * their failure never blocks picking a date — the dots are information, the
 * grid is the task.
 */
export function DatePickerSheet({
	selected,
	firstDayOfWeek,
	onSelect,
	onClose,
}: DatePickerSheetProps) {
	const [anchor, setAnchor] = useState(selected);
	const busy = useBusyDays(anchor);

	const grid = useMemo(() => buildGrid(anchor, firstDayOfWeek), [
		anchor,
		firstDayOfWeek,
	]);
	const anchorDate = parseLocalDate(anchor);
	const anchorMonth = anchorDate.getMonth() + 1;

	const weekdayHeaders = useMemo(
		() =>
			Array.from({ length: WEEK_LENGTH }, (_unused, index) => {
				const day = (((firstDayOfWeek - 1 + index) % WEEK_LENGTH) + 1) as Weekday;
				return { day, label: weekdayShort(day) };
			}),
		[firstDayOfWeek],
	);

	return (
		<Sheet
			title={t('calendar.title')}
			onClose={onClose}
			footer={
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('calendar.backToToday')}
					onPress={() => onSelect(today())}
					style={styles.footerAction}>
					<Text style={styles.footerLabel}>{t('calendar.backToToday')}</Text>
				</Pressable>
			}>
			<View style={styles.header}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('calendar.previousMonth')}
					onPress={() => setAnchor(shiftMonth(anchor, -1))}
					style={styles.monthArrow}>
					<Chevron direction="left" size={SHEET_CHEVRON_SIZE} />
				</Pressable>
				<Text style={styles.monthLabel}>
					{t('calendar.month', {
						month: anchorMonth,
						year: anchorDate.getFullYear(),
					})}
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('calendar.nextMonth')}
					onPress={() => setAnchor(shiftMonth(anchor, 1))}
					style={styles.monthArrow}>
					<Chevron direction="right" size={SHEET_CHEVRON_SIZE} />
				</Pressable>
			</View>

			{/* Reported, not blocking: the user can still pick any date. */}
			{busy.status === 'failed' ? (
				<Text style={styles.busyFailed}>{t('calendar.busyFailed')}</Text>
			) : null}

			<View style={styles.weekHeader}>
				{weekdayHeaders.map(header => (
					<Text key={header.day} style={styles.weekHeaderCell}>
						{header.label}
					</Text>
				))}
			</View>

			<View style={styles.grid}>
				{grid.map(date => (
					<DayCell
						key={date}
						date={date}
						inMonth={parseLocalDate(date).getMonth() + 1 === anchorMonth}
						isSelected={date === selected}
						isBusy={busy.status === 'ready' && busy.days.has(date)}
						isCounting={busy.status === 'counting'}
						onPress={() => onSelect(date)}
					/>
				))}
			</View>
		</Sheet>
	);
}

function DayCell({
	date,
	inMonth,
	isSelected,
	isBusy,
	isCounting,
	onPress,
}: {
	date: LocalDate;
	inMonth: boolean;
	isSelected: boolean;
	isBusy: boolean;
	isCounting: boolean;
	onPress: () => void;
}) {
	styles.useVariants({ inMonth, isSelected, isBusy, isCounting });
	const dayNumber = parseLocalDate(date).getDate();

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected: isSelected }}
			accessibilityLabel={
				isBusy ? t('calendar.dayBusy', { date }) : t('calendar.day', { date })
			}
			onPress={onPress}
			style={styles.cell}>
			<Text style={styles.cellLabel}>{String(dayNumber)}</Text>
			<View style={styles.dot} />
		</Pressable>
	);
}

/** Six full weeks, so the grid height never jumps between months. */
function buildGrid(anchor: LocalDate, firstDayOfWeek: Weekday): LocalDate[] {
	const d = parseLocalDate(anchor);
	const firstOfMonth = toLocalDate(new Date(d.getFullYear(), d.getMonth(), 1));
	const offset =
		(weekdayOf(firstOfMonth) - firstDayOfWeek + WEEK_LENGTH) % WEEK_LENGTH;
	const start = addDays(firstOfMonth, -offset);
	return Array.from({ length: WEEK_LENGTH * 6 }, (_unused, i) => addDays(start, i));
}

function shiftMonth(anchor: LocalDate, delta: number): LocalDate {
	const d = parseLocalDate(anchor);
	return toLocalDate(new Date(d.getFullYear(), d.getMonth() + delta, 1));
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
		},
		monthArrow: {
			width: TAP_TARGET_MIN,
			height: TAP_TARGET_MIN,
			alignItems: 'center',
			justifyContent: 'center',
		},
		monthLabel: {
			...theme.typography.body,
			color: theme.color.onBackground,
			fontWeight: '800',
		},
		footerAction: {
			minHeight: BAR_HEIGHT.action,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: theme.spacing.md,
			backgroundColor: theme.appColor.accentFill,
		},
		footerLabel: {
			...theme.typography.body,
			color: theme.appColor.onAccent,
			fontWeight: '800',
		},
		busyFailed: {
			...theme.typography.label,
			color: theme.appColor.accentInk,
		},
		weekHeader: {
			flexDirection: 'row',
		},
		weekHeaderCell: {
			...theme.typography.caption,
			color: theme.appColor.textMuted,
			flex: 1,
			textAlign: 'center',
		},
		grid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
		},
		cell: {
			width: `${100 / WEEK_LENGTH}%`,
			minHeight: TAP_TARGET_MIN,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 2,
			variants: {
				isSelected: {
					true: { borderColor: theme.color.onBackground },
					false: { borderColor: 'transparent' },
				},
			},
		},
		cellLabel: {
			...theme.typography.label,
			variants: {
				inMonth: {
					true: { color: theme.color.onBackground, opacity: 1 },
					false: { color: theme.appColor.textMuted, opacity: 0.4 },
				},
			},
		},
		dot: {
			width: 4,
			height: 4,
			marginTop: 2,
			variants: {
				isBusy: {
					true: { backgroundColor: theme.color.primary },
					false: { backgroundColor: 'transparent' },
				},
				isCounting: {
					true: { backgroundColor: theme.appColor.skeletonFrom },
				},
			},
		},
	};
});
