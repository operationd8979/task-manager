import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Text } from './Text';

export interface ErrorStateProps {
	title: string;
	/** Reassurance in plain words. Never an exception name or a status code. */
	body: string;
	retryLabel: string;
	/** Required: Principle IV has no error state without a way forward. */
	onRetry: () => void;
	secondaryLabel?: string;
	onSecondary?: () => void;
}

export function ErrorState({
	title,
	body,
	retryLabel,
	onRetry,
	secondaryLabel,
	onSecondary,
}: ErrorStateProps) {
	return (
		<View accessibilityRole="alert" style={styles.container}>
			<View style={styles.rule} />
			<Text style={styles.title}>{title}</Text>
			<Text style={styles.body}>{body}</Text>
			<View style={styles.actions}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={retryLabel}
					onPress={onRetry}
					style={styles.action}>
					<Text style={styles.actionLabel}>{retryLabel}</Text>
				</Pressable>
				{secondaryLabel && onSecondary ? (
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={secondaryLabel}
						onPress={onSecondary}
						style={styles.action}>
						<Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}

const styles = StyleSheet.create(theme => ({
	container: {
		backgroundColor: theme.tone.accent.container,
		padding: theme.spacing.md,
		gap: theme.spacing.xs,
	},
	rule: {
		height: theme.borderWidth.thick,
		backgroundColor: theme.tone.accent.onContainer,
		marginBottom: theme.spacing.sm,
	},
	title: {
		...theme.typography.body,
		color: theme.tone.accent.onContainer,
	},
	body: {
		...theme.typography.label,
		color: theme.tone.accent.onContainer,
	},
	actions: {
		...layout.row,
		gap: theme.spacing.md,
		marginTop: theme.spacing.sm,
	},
	action: theme.box.touchTarget,
	actionLabel: {
		...theme.typography.body,
		color: theme.tone.accent.onContainer,
	},
	secondaryLabel: {
		...theme.typography.label,
		color: theme.tone.accent.onContainer,
	},
}));
