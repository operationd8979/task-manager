import React from 'react';
import { Pressable, StyleSheet as RNStyleSheet, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { appTheme } from '../theme/theme';
import { BAR_HEIGHT, TAP_TARGET_MIN } from '../theme/tokens';
import { Text } from './Text';

export interface ToastProps {
	message: string;
	actionLabel: string;
	onAction: () => void;
	/**
	 * More chrome stacked under the action bar, in points, animated on the UI
	 * thread — so the toast rides above it rather than covering it.
	 */
	extraBottom?: SharedValue<number> | null;
}

/**
 * Plain styles for the Reanimated anchor: the Unistyles Babel plugin only
 * rewrites components imported from 'react-native', so Animated.View gets no
 * themed value. The themed surface is the View inside it.
 */
const plain = RNStyleSheet.create({
	anchor: { position: 'absolute', left: 0, right: 0 },
});

/**
 * Floats above the primary action bar. It is rendered by UndoProvider at the
 * app root rather than by a screen, because FR-011a requires it to survive a
 * day change or a push to Settings.
 */
export function Toast({ message, actionLabel, onAction, extraBottom }: ToastProps) {
	const insets = useSafeAreaInsets();
	const base = insets.bottom + BAR_HEIGHT.action;
	const offset = useAnimatedStyle(() => ({
		bottom: base + (extraBottom?.value ?? 0),
	}));
	return (
		<Animated.View style={[plain.anchor, offset]}>
			<View accessibilityLiveRegion="polite" style={styles.container}>
				<View style={styles.rule} />
				<View style={styles.row}>
					<Text style={styles.message} numberOfLines={2}>
						{message}
					</Text>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={actionLabel}
						onPress={onAction}
						style={styles.action}>
						<Text style={styles.actionLabel}>{actionLabel}</Text>
					</Pressable>
				</View>
			</View>
		</Animated.View>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		container: {
			backgroundColor: theme.color.surface,
		},
		rule: {
			height: 2,
			backgroundColor: theme.appColor.accentFill,
		},
		row: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingLeft: theme.spacing.md,
			gap: theme.spacing.sm,
		},
		message: {
			...theme.typography.label,
			color: theme.color.onSurface,
			flexShrink: 1,
		},
		action: {
			// A 44pt target, not small text — the undo affordance replaced a
			// confirmation dialog and has to be as easy to hit.
			minHeight: TAP_TARGET_MIN,
			paddingHorizontal: theme.spacing.md,
			justifyContent: 'center',
		},
		actionLabel: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
			fontWeight: '800',
		},
	};
});
