import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Chevron } from '../../../components/Chevron';
import { Sheet } from '../../../components/Sheet';
import { Text } from '../../../components/Text';
import { useT } from '../../../i18n/useT';
import {
	addDays,
	parseLocalDate,
	today,
	toLocalDate,
	weekdayOf,
	type LocalDate,
	type Weekday,
} from '../../../lib/date';
import { monthStandalone, weekdayShort } from '../../../lib/format';
import { BAR_HEIGHT, SHEET_CHEVRON_SIZE } from '../../../theme/tokens';
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
	const t = useT();
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
						month: monthStandalone(anchorMonth),
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
	const t = useT();
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

/** The busy-day mark under a date. */
const DOT_SIZE = 4;

const styles = StyleSheet.create(theme => ({
	header: layout.rowBetween,
	monthArrow: {
		...layout.center,
		width: theme.size.touchTarget,
		height: theme.size.touchTarget,
	},
	monthLabel: {
		...theme.text.body,
		...theme.font.heavy,
	},
	footerAction: {
		...layout.center,
		minHeight: BAR_HEIGHT.action,
		paddingHorizontal: theme.spacing.md,
		backgroundColor: theme.tone.accent.fill,
	},
	footerLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.onFill,
	},
	busyFailed: {
		...theme.typography.label,
		color: theme.tone.accent.fg,
	},
	weekHeader: layout.row,
	weekHeaderCell: {
		...theme.text.caption,
		...layout.fill,
		textAlign: 'center',
	},
	grid: layout.wrap,
	cell: {
		...layout.center,
		width: `${100 / WEEK_LENGTH}%`,
		minHeight: theme.size.touchTarget,
		borderWidth: theme.borderWidth.thick,
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
				false: { color: theme.color.onSurfaceVariant, opacity: 0.4 },
			},
		},
	},
	dot: {
		width: DOT_SIZE,
		height: DOT_SIZE,
		marginTop: theme.spacing.xxs,
		variants: {
			isBusy: {
				true: { backgroundColor: theme.color.primary },
				false: { backgroundColor: 'transparent' },
			},
			isCounting: {
				true: { backgroundColor: theme.appColor.skeleton },
			},
		},
	},
}));
