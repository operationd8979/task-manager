import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { byTone } from '@chipmobilesdk/rn-theme';

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
 * The theme tone each notice tone is drawn in. "warning" names the caller's
 * intent; the colour is the app's accent (specs/003 plan D-4).
 */
const THEME_TONE = { warning: 'accent', neutral: 'neutral' } as const;

/**
 * A block that stays put, not a toast that disappears (design/ux-ui-spec.md
 * §4). Every state it shows carries words, never colour alone (Principle V).
 */
export function Notice({ tone, label, title, body, action }: NoticeProps) {
	styles.useVariants({ tone: THEME_TONE[tone] });
	return (
		<View style={styles.container} accessibilityRole="summary">
			{label ? (
				<Text style={[styles.label, styles.toneText]}>{label}</Text>
			) : null}
			{title ? (
				<Text style={[styles.title, styles.toneText]}>{title}</Text>
			) : null}
			<Text style={[styles.body, styles.toneText]}>{body}</Text>
			{action ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={action.label}
					onPress={action.onPress}
					style={styles.action}>
					<Text style={[styles.actionLabel, styles.toneText]}>
						{action.label}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

/*
 * One tone-colour style for every text, combined by array. `variants` is
 * written literally with `byTone` called right under it: the Unistyles Babel
 * plugin reads theme and variant dependencies statically, and a variants
 * object built elsewhere or spread in kept its first colour on a theme change
 * (dark-on-dark in dark mode, found on a device).
 */
const styles = StyleSheet.create(theme => ({
	container: {
		borderWidth: theme.borderWidth.thin,
		padding: theme.spacing.sm,
		gap: theme.spacing.xs,
		variants: {
			tone: byTone(theme, t => ({
				borderColor: t.border,
				backgroundColor: t.container,
			})),
		},
	},
	toneText: {
		variants: {
			tone: byTone(theme, t => ({ color: t.onContainer })),
		},
	},
	label: theme.typography.caption,
	title: theme.typography.body,
	body: theme.typography.label,
	action: theme.box.touchTarget,
	actionLabel: {
		...theme.typography.body,
		...theme.font.heavy,
	},
}));
