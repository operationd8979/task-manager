import React, { useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Sheet } from '../../../components/Sheet';
import { Skeleton } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { countOccurrences, type RecurringRule } from '../../../domain/recurrence';
import { addDays, type LocalDate } from '../../../lib/date';
import { t } from '../../../lib/strings';
import { appTheme } from '../../../theme/theme';
import { TAP_TARGET_MIN } from '../../../theme/tokens';

/** The counting window for an unbounded series (FR-026c, decisions.md D-05). */
const WINDOW_DAYS = 365;

export type ApplyScope = 'thisOnly' | 'wholeSeries';

type CountState =
	| { status: 'counting' }
	| { status: 'ready'; count: number }
	| { status: 'failed' };

export interface ScopeSheetProps {
	rule: RecurringRule;
	/** The session the user acted on. */
	date: LocalDate;
	title: string;
	onChoose: (scope: ApplyScope) => void;
	onCancel: () => void;
}

/**
 * Apply-scope sheet (S-05 / W-04).
 *
 * Blocking on purpose: it cannot be swiped away or dismissed by tapping the
 * scrim, because a stray tap must never write data. It appears AFTER the user
 * commits an edit and immediately before the write — asking earlier would ask
 * before they know what they are about to change (design/ia §5 F-3).
 *
 * The count is the part that does the work. A sentence like "affects 122
 * sessions" makes the consequence concrete in a way no warning wording does.
 */
export function ScopeSheet({
	rule,
	date,
	title,
	onChoose,
	onCancel,
}: ScopeSheetProps) {
	const [count, setCount] = useState<CountState>({ status: 'counting' });

	useEffect(() => {
		let cancelled = false;
		try {
			// Arithmetic, not a 365-iteration walk — the user is waiting on this.
			const total = countOccurrences(rule, date, addDays(date, WINDOW_DAYS));
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
	}, [rule, date]);

	// Choices stay locked until the consequence is known. Offering a button that
	// rewrites 122 sessions before the number arrives defeats the whole sheet.
	const locked = count.status === 'counting';

	const seriesEffect = () => {
		if (count.status === 'counting') {
			return t('scope.counting');
		}
		if (count.status === 'failed') {
			// Say so rather than showing a number that might be wrong.
			return t('scope.countFailed');
		}
		return rule.endDate === null
			? t('scope.seriesEffectOpen', { count: count.count })
			: t('scope.seriesEffect', { count: count.count });
	};

	// `onClose` is what back triggers. It cancels, exactly as the Huỷ button
	// does, and writes nothing — so it does not weaken the rule that a stray tap
	// must never commit a scope.
	return (
		<Sheet title={t('scope.title')} blocking onClose={onCancel}>
			<Text style={styles.subject}>{t('scope.subject', { title, date })}</Text>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('scope.thisOnly')}
				onPress={() => onChoose('thisOnly')}
				style={styles.choice}>
				<Text style={styles.choiceLabel}>{t('scope.thisOnly')}</Text>
				<Text style={styles.effect}>{t('scope.thisOnlyEffect')}</Text>
			</Pressable>

			<Pressable
				accessibilityRole="button"
				accessibilityState={{ disabled: locked }}
				accessibilityLabel={t('scope.wholeSeries')}
				disabled={locked}
				onPress={() => onChoose('wholeSeries')}
				style={styles.choice}>
				<Text style={styles.choiceLabel}>{t('scope.wholeSeries')}</Text>
				{locked ? (
					<Skeleton height={16} />
				) : (
					<Text style={styles.effect}>{seriesEffect()}</Text>
				)}
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
			...theme.typography.label,
			color: theme.appColor.textMuted,
		},
		choice: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
			borderWidth: 2,
			borderColor: theme.color.onBackground,
			padding: theme.spacing.sm,
			gap: theme.spacing.xs,
		},
		choiceLabel: {
			...theme.typography.body,
			color: theme.color.onBackground,
			fontWeight: '800',
		},
		effect: {
			...theme.typography.caption,
			color: theme.appColor.accentInk,
			backgroundColor: theme.appColor.accentSoft,
			paddingHorizontal: theme.spacing.xs,
			paddingVertical: 2,
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
