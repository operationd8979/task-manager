import React from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Text } from './Text';

export interface ChipProps {
	label: string;
	selected: boolean;
	onPress: () => void;
	accessibilityLabel?: string;
}

/**
 * Used wherever the value domain is finite — reminder offsets, durations,
 * weekday presets (Principle I: prefer selection over typing).
 *
 * Selection is carried by fill, inverted text colour AND weight, plus
 * `accessibilityState.selected`. Colour alone would fail Principle V.
 */
export function Chip({ label, selected, onPress, accessibilityLabel }: ChipProps) {
	styles.useVariants({ selected });
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ selected }}
			accessibilityLabel={accessibilityLabel ?? label}
			// The sheet keeps taps alive while the keyboard is open, so the press
			// lands — but the keyboard would stay up over the rest of the form. The
			// user has moved on from typing; put it away.
			onPress={() => {
				Keyboard.dismiss();
				onPress();
			}}
			style={styles.chip}>
			{/*
        One line, always.

        A chip is measured from its own label, so the text can never legitimately
        need a second line — and when Android disagreed with that measurement by
        a hair it broke "Đúng giờ" at the space and drew only "Đúng", with "giờ"
        on a second line clipped out of a 44pt box. Pinning the line count means
        a disagreement shows up as an ellipsis, which is a visible bug, instead
        of a missing word, which reads as a missing translation.
      */}
			<Text numberOfLines={1} style={styles.label}>
				{label}
			</Text>
		</Pressable>
	);
}

export function ChipRow({ children }: { children: React.ReactNode }) {
	return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create(theme => ({
	row: {
		...layout.wrap,
		gap: theme.spacing.sm,
	},
	chip: {
		// 44pt even when the label is short — the tap target is the point.
		...theme.box.touchTarget,
		// A wrapping row must never buy a line by squeezing a chip narrower than
		// its own label. RN already defaults to 0; it is written out because the
		// failure it prevents is silent — the label just loses its last word.
		flexShrink: 0,
		paddingHorizontal: theme.spacing.md,
		alignItems: 'center',
		borderWidth: theme.borderWidth.thick,
		borderRadius: theme.radius.sm,
		variants: {
			selected: {
				true: {
					backgroundColor: theme.tone.accent.fill,
					borderColor: theme.tone.accent.fill,
				},
				false: {
					backgroundColor: 'transparent',
					borderColor: theme.color.outline,
				},
			},
		},
	},
	label: {
		...theme.typography.label,
		variants: {
			selected: {
				true: { color: theme.tone.accent.onFill, ...theme.font.heavy },
				false: { color: theme.color.onBackground, ...theme.font.regular },
			},
		},
	},
}));
