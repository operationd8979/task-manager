import React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '../../../components/Text';

export interface FieldProps {
	label: string;
	/** Already resolved to display text; the domain only carries keys. */
	error?: string;
	children: React.ReactNode;
}

/**
 * Wraps one input with its label and error.
 *
 * The error marks the field with a 3px accent rule on the leading edge and a
 * sentence that says how to fix it — "Giờ kết thúc phải sau 09:00", never
 * "invalid" (design/ux-ui-spec.md §3, FR-009).
 */
export function Field({ label, error, children }: FieldProps) {
	const invalid = error !== undefined;
	styles.useVariants({ invalid });

	return (
		<View style={styles.field}>
			<Text style={styles.label}>{label}</Text>
			{children}
			{invalid ? (
				<Text accessibilityRole="alert" style={styles.error}>
					{error}
				</Text>
			) : null}
		</View>
	);
}

/** The invalid marker: a bar down the field's leading edge. */
const MARKER_WIDTH = 3;

const styles = StyleSheet.create(theme => ({
	field: {
		gap: theme.spacing.xs,
		paddingLeft: theme.spacing.sm,
		borderLeftWidth: MARKER_WIDTH,
		variants: {
			invalid: {
				true: { borderLeftColor: theme.tone.accent.fg },
				false: { borderLeftColor: 'transparent' },
			},
		},
	},
	label: theme.text.caption,
	error: {
		...theme.typography.label,
		color: theme.tone.accent.fg,
	},
}));
