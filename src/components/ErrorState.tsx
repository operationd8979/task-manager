import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { appTheme } from '../theme/theme';
import { TAP_TARGET_MIN } from '../theme/tokens';
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

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw); return ({
		container: {
			backgroundColor: theme.appColor.accentSoft,
			padding: theme.spacing.md,
			gap: theme.spacing.xs,
		},
		rule: {
			height: 2,
			backgroundColor: theme.appColor.accentInk,
			marginBottom: theme.spacing.sm,
		},
		title: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
		},
		body: {
			...theme.typography.label,
			color: theme.appColor.accentInk,
		},
		actions: {
			flexDirection: 'row',
			gap: theme.spacing.md,
			marginTop: theme.spacing.sm,
		},
		action: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
		},
		actionLabel: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
		},
		secondaryLabel: {
			...theme.typography.label,
			color: theme.appColor.accentInk,
		},
	});
});
