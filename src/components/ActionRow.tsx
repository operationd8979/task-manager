import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { BAR_HEIGHT } from '../theme/tokens';
import { Chevron } from './Chevron';
import { Text } from './Text';

export interface ActionRowProps {
	label: string;
	/** A muted line under the label; also read as the accessibility hint. */
	hint?: string;
	/**
	 * Said under the row when the last tap failed. Tapping again is the retry,
	 * so the row stays where it is rather than turning into an error block.
	 */
	failure?: string | null;
	/** `link` for a row that leaves the app, so a screen reader says so. */
	role?: 'button' | 'link';
	/** Draws the top border, for the first row of a section. */
	first?: boolean;
	onPress: () => void;
}

/**
 * A full-width tappable Settings row: label, optional hint and failure line,
 * and a chevron. Bordered top and bottom like a list, at least the action
 * bar's height so it is never under the 44 pt target (plan D-24).
 */
export function ActionRow({
	label,
	hint,
	failure,
	role = 'button',
	first = false,
	onPress,
}: Readonly<ActionRowProps>) {
	return (
		<Pressable
			accessibilityRole={role}
			accessibilityLabel={label}
			accessibilityHint={hint}
			onPress={onPress}
			style={[styles.row, first ? styles.first : null]}>
			<View style={styles.text}>
				<Text style={styles.label}>{label}</Text>
				{hint ? <Text style={styles.hint}>{hint}</Text> : null}
				{failure ? (
					<Text style={styles.failure} accessibilityLiveRegion="polite">
						{failure}
					</Text>
				) : null}
			</View>
			<Chevron direction="right" />
		</Pressable>
	);
}

const styles = StyleSheet.create(theme => ({
	row: {
		...layout.rowCenter,
		...theme.border.bottom,
		gap: theme.spacing.smPlus,
		minHeight: BAR_HEIGHT.action,
		paddingVertical: theme.spacing.sm,
	},
	first: theme.border.top,
	text: {
		...layout.fill,
		gap: theme.spacing.xs,
	},
	label: theme.text.body,
	hint: theme.text.labelMuted,
	failure: {
		...theme.typography.label,
		color: theme.tone.accent.fg,
	},
}));
