import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Sheet } from '../../../components/Sheet';
import { Skeleton } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { countOccurrences, type RecurringRule } from '../../../domain/recurrence';
import { useT } from '../../../i18n/useT';
import { addDays, compareDate, type LocalDate } from '../../../lib/date';
import { appTheme } from '../../../theme/theme';
import { TAP_TARGET_MIN } from '../../../theme/tokens';

/** The counting window for an unbounded series (FR-026c, decisions.md D-05). */
const WINDOW_DAYS = 365;

type CountState =
	| { status: 'counting' }
	| { status: 'ready'; count: number }
	| { status: 'failed' };

export interface DeleteSeriesSheetProps {
	rule: RecurringRule;
	/** Today. The first date the delete removes; everything before it stays. */
	from: LocalDate;
	onConfirm: () => void;
	onCancel: () => void;
}

/**
 * The warning behind "Xóa" on a repeating session (change.md §1).
 *
 * Blocking, like the apply-scope sheet and for the same reason: a stray tap
 * must never end a series. It is a warning rather than a choice — the scope is
 * already decided, and offering "chỉ lần này" here would duplicate "Bỏ qua buổi
 * này", which is one line up in the sheet the user just came from.
 *
 * The count is the part that does the work. "Ảnh hưởng 122 buổi" makes the
 * consequence concrete in a way no wording of a warning does.
 */
export function DeleteSeriesSheet({
	rule,
	from,
	onConfirm,
	onCancel,
}: Readonly<DeleteSeriesSheetProps>) {
	const t = useT();
	const [count, setCount] = useState<CountState>({ status: 'counting' });

	useEffect(() => {
		let cancelled = false;
		try {
			// Counted from `from`, never from the rule's start: the sessions already
			// behind us are precisely the ones this delete leaves alone, so counting
			// them would overstate the damage by the entire life of the series.
			const total = countOccurrences(rule, from, addDays(from, WINDOW_DAYS));
			if (!cancelled) {
				setCount({ status: 'ready', count: total });
			}
		} catch {
			if (!cancelled) {
				setCount({ status: 'failed' });
			}
		}
		return () => {
			cancelled = true;
		};
	}, [rule, from]);

	// The button stays locked until the consequence is known. Ending a series
	// before the number arrives defeats the whole sheet.
	const locked = count.status === 'counting';

	const effect = () => {
		if (count.status === 'failed') {
			// Say so rather than showing a number that might be wrong.
			return t('scope.countFailed');
		}
		if (count.status === 'counting') {
			return t('scope.counting');
		}
		return rule.endDate === null
			? t('deleteSeries.effectOpen', undefined, { count: count.count })
			: t('deleteSeries.effect', undefined, { count: count.count });
	};

	/**
	 * Only said when it is true.
	 *
	 * A series that starts today has no past to keep, and promising the user
	 * their history is safe when there is none to be safe is the kind of
	 * reassurance that costs trust the first time someone checks.
	 */
	const keepsPast = compareDate(rule.startDate, from) < 0;

	return (
		<Sheet title={t('deleteSeries.title')} blocking onClose={onCancel}>
			<Text style={styles.subject}>
				{t('deleteSeries.subject', { title: rule.title })}
			</Text>

			{locked ? (
				<Skeleton height={16} />
			) : (
				<Text style={styles.effect}>{effect()}</Text>
			)}

			{keepsPast ? (
				<Text style={styles.keeps}>{t('deleteSeries.keepsPast')}</Text>
			) : null}

			<Pressable
				accessibilityRole="button"
				accessibilityState={{ disabled: locked }}
				accessibilityLabel={t('deleteSeries.confirm')}
				disabled={locked}
				onPress={onConfirm}
				style={styles.danger}>
				<Text style={styles.dangerLabel}>{t('deleteSeries.confirm')}</Text>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('scope.cancel')}
				onPress={onCancel}
				style={styles.cancel}>
				<Text style={styles.cancelLabel}>{t('scope.cancel')}</Text>
			</Pressable>
		</Sheet>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		subject: {
			...theme.typography.body,
			color: theme.color.onBackground,
			fontWeight: '800',
		},
		effect: {
			...theme.typography.label,
			color: theme.appColor.accentInk,
			backgroundColor: theme.appColor.accentSoft,
			paddingHorizontal: theme.spacing.xs,
			paddingVertical: 2,
		},
		keeps: {
			...theme.typography.label,
			color: theme.appColor.textMuted,
		},
		// Outlined, never filled: this is the irreversible half of the sheet, so
		// it must not also be the easiest thing to hit.
		danger: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 2,
			borderColor: theme.appColor.accentInk,
			paddingHorizontal: theme.spacing.sm,
		},
		dangerLabel: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
			fontWeight: '800',
		},
		cancel: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
		},
		cancelLabel: {
			...theme.typography.body,
			color: theme.color.onBackground,
		},
	};
});
