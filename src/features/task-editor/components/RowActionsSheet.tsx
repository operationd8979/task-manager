import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Sheet } from '../../../components/Sheet';
import { Text } from '../../../components/Text';
import type { Translate } from '../../../i18n';
import { useT } from '../../../i18n/useT';
import { appTheme } from '../../../theme/theme';
import { TAP_TARGET_MIN } from '../../../theme/tokens';

export type RowAction = 'move' | 'edit' | 'skip' | 'delete';

export interface RowActionsSheetProps {
	title: string;
	/**
	 * A session of a series gets one extra action, not a different one.
	 *
	 * "Bỏ qua buổi này" and "Xóa" are both offered because they are genuinely
	 * different jobs — drop this one session, or end the series — and a single
	 * button that asked which one afterwards made the common case (skip) pay for
	 * the rare one (change.md §1). It also decides what "Di chuyển" opens: a
	 * session belongs to its own date, so only its time is on offer.
	 */
	isOccurrence: boolean;
	/**
	 * A session that has already been skipped has nothing left to skip. The row
	 * keeps its own restore button, so the way back is still one tap away; what
	 * goes is the entry that would write the state the session is already in.
	 * Always false for a one-off task.
	 */
	isSkipped: boolean;
	onAction: (action: RowAction) => void;
	onClose: () => void;
}

/**
 * "Đổi giờ trong ngày" used to sit above this list, but Di chuyển already
 * offers the time — the two differed only in whether the date field was there
 * as well. Two entries for one job made the sheet longer and the choice
 * harder, so the narrower one is gone.
 *
 * "Xóa" is last for both kinds and reads the same in both, which is the point:
 * a user who has learned where delete lives on an ordinary task finds it in the
 * same place on a repeating one. What differs is what it does — for a session
 * it opens a warning naming the sessions it would end (change.md §1).
 */
function actionsFor(
	t: Translate,
	isOccurrence: boolean,
	isSkipped: boolean,
): ReadonlyArray<{ action: RowAction; label: string }> {
	return [
		{ action: 'move', label: t('actions.move') },
		{ action: 'edit', label: t('actions.edit') },
		...(isOccurrence && !isSkipped
			? [{ action: 'skip' as const, label: t('scope.skipThisSession') }]
			: []),
		{ action: 'delete', label: t('actions.delete') },
	];
}

/**
 * Every per-row action lives here (S-06).
 *
 * There is no swipe shortcut: the horizontal gesture belongs to day navigation
 * (FR-003b), and a gesture-only action would have no screen-reader equivalent.
 * That makes this sheet the single path, not a fallback.
 */
export function RowActionsSheet({
	title,
	isOccurrence,
	isSkipped,
	onAction,
	onClose,
}: RowActionsSheetProps) {
	const t = useT();
	const actions = actionsFor(t, isOccurrence, isSkipped);
	return (
		<Sheet title={t('actions.title')} onClose={onClose}>
			<Text style={styles.subject} numberOfLines={2}>
				{title}
			</Text>
			<View>
				{actions.map(item => (
					<Pressable
						key={item.action}
						accessibilityRole="button"
						accessibilityLabel={item.label}
						onPress={() => onAction(item.action)}
						style={styles.row}>
						<Text
							style={
								item.action === 'delete' ? styles.destructive : styles.label
							}>
							{item.label}
						</Text>
					</Pressable>
				))}
			</View>
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
		row: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
			borderBottomWidth: 1,
			borderBottomColor: theme.color.border,
		},
		label: {
			...theme.typography.body,
			color: theme.color.onBackground,
		},
		destructive: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
		},
	};
});
