import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

export interface EmptyStateProps {
	title: string;
	body: string;
	actionLabel?: string;
	onAction?: () => void;
}

/**
 * Empty is a designed state, not an absence (Principle IV): it says what is
 * missing for the day being viewed, and offers the action that resolves it.
 */
export function EmptyState({
	title,
	body,
	actionLabel,
	onAction,
}: EmptyStateProps) {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.body}>{body}</Text>
			{actionLabel && onAction ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={actionLabel}
					onPress={onAction}
					style={styles.action}>
					<Text style={styles.actionLabel}>{actionLabel}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create(theme => ({
	container: {
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.xl,
		gap: theme.spacing.sm,
	},
	title: theme.text.title,
	body: theme.text.labelMuted,
	action: {
		...theme.box.touchTarget,
		marginTop: theme.spacing.sm,
	},
	actionLabel: {
		...theme.typography.body,
		color: theme.tone.accent.fg,
	},
}));
