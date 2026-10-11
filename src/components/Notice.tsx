import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { appTheme } from '../theme/theme';
import { TAP_TARGET_MIN } from '../theme/tokens';
import { Text } from './Text';

export interface NoticeProps {
	/**
	 * `warning`: something the user should know before acting (soft red,
	 * outlined). `neutral`: a plain answer, such as "nothing found".
	 */
	tone: 'warning' | 'neutral';
	/** Uppercase caption naming the state, e.g. "PAYMENT PENDING". */
	label?: string;
	title?: string;
	body: string;
	action?: { label: string; onPress: () => void };
}

/**
 * A block that stays put, not a toast that disappears (design/ux-ui-spec.md
 * §4). Every state it shows carries words, never colour alone (Principle V).
 */
export function Notice({ tone, label, title, body, action }: NoticeProps) {
	styles.useVariants({ tone });
	return (
		<View style={styles.container} accessibilityRole="summary">
			{label ? <Text style={styles.label}>{label}</Text> : null}
			{title ? <Text style={styles.title}>{title}</Text> : null}
			<Text style={styles.body}>{body}</Text>
			{action ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={action.label}
					onPress={action.onPress}
					style={styles.action}>
					<Text style={styles.actionLabel}>{action.label}</Text>
				</Pressable>
			) : null}
		</View>
	);
}

/*
 * Each text style spells out its own `variants`. Spreading one shared variants
 * object hid them from the Unistyles Babel plugin, which reads a style's theme
 * and variant dependencies statically: the text kept its first colour and went
 * dark-on-dark in dark mode (found on a device).
 */
const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		container: {
			borderWidth: 1,
			padding: theme.spacing.sm,
			gap: theme.spacing.xs,
			variants: {
				tone: {
					warning: {
						borderColor: theme.appColor.accentInk,
						backgroundColor: theme.appColor.accentSoft,
					},
					neutral: {
						borderColor: theme.color.onBackground,
						backgroundColor: theme.color.background,
					},
				},
			},
		},
		label: {
			...theme.typography.caption,
			variants: {
				tone: {
					warning: { color: theme.appColor.accentInk },
					neutral: { color: theme.color.onBackground },
				},
			},
		},
		title: {
			...theme.typography.body,
			variants: {
				tone: {
					warning: { color: theme.appColor.accentInk },
					neutral: { color: theme.color.onBackground },
				},
			},
		},
		body: {
			...theme.typography.label,
			variants: {
				tone: {
					warning: { color: theme.appColor.accentInk },
					neutral: { color: theme.color.onBackground },
				},
			},
		},
		action: {
			minHeight: TAP_TARGET_MIN,
			justifyContent: 'center',
		},
		actionLabel: {
			...theme.typography.body,
			fontWeight: '800',
			variants: {
				tone: {
					warning: { color: theme.appColor.accentInk },
					neutral: { color: theme.color.onBackground },
				},
			},
		},
	};
});
