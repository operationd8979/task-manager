import React from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Text } from './Text';

export interface SegmentedOption<T extends string> {
	value: T;
	label: string;
	/** Shown under the label — used by "Tự động" to say it follows the OS. */
	hint?: string;
}

export interface SegmentedProps<T extends string> {
	options: ReadonlyArray<SegmentedOption<T>>;
	value: T;
	onChange: (value: T) => void;
	accessibilityLabel: string;
}

/**
 * Two- or three-way exclusive choice with short labels. Same rule as Chip:
 * selection is never carried by colour alone. Options that need a sentence to
 * tell apart belong in a list instead (task-editor's ChoiceList).
 */
export function Segmented<T extends string>({
	options,
	value,
	onChange,
	accessibilityLabel,
}: SegmentedProps<T>) {
	return (
		<View
			accessibilityRole="radiogroup"
			accessibilityLabel={accessibilityLabel}
			style={styles.container}>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<SegmentedItem
						key={option.value}
						option={option}
						selected={selected}
						divided={index > 0}
						// Same reason as Chip: choosing a segment means typing is over.
						onPress={() => {
							Keyboard.dismiss();
							onChange(option.value);
						}}
					/>
				);
			})}
		</View>
	);
}

function SegmentedItem<T extends string>({
	option,
	selected,
	divided,
	onPress,
}: {
	option: SegmentedOption<T>;
	selected: boolean;
	/** Every segment after the first draws the line between it and the last. */
	divided: boolean;
	onPress: () => void;
}) {
	styles.useVariants({ selected, divided });
	return (
		<Pressable
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			accessibilityLabel={
				option.hint ? `${option.label}. ${option.hint}` : option.label
			}
			onPress={onPress}
			style={styles.item}>
			<Text style={styles.label}>{option.label}</Text>
			{option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
		</Pressable>
	);
}

const styles = StyleSheet.create(theme => ({
	container: {
		...layout.row,
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.color.outline,
		borderRadius: theme.radius.sm,
	},
	item: {
		...theme.box.touchTarget,
		...layout.center,
		...layout.fill,
		paddingVertical: theme.spacing.xs,
		paddingHorizontal: theme.spacing.sm,
		variants: {
			selected: {
				true: { backgroundColor: theme.tone.accent.fill },
				false: { backgroundColor: 'transparent' },
			},
			// Without it two unselected segments run together into one stretch
			// of text, and only the filled one reads as something to tap.
			divided: {
				true: {
					borderLeftWidth: theme.borderWidth.thick,
					borderLeftColor: theme.color.outline,
				},
			},
		},
	},
	label: {
		...theme.typography.label,
		textAlign: 'center',
		variants: {
			selected: {
				true: { color: theme.tone.accent.onFill, ...theme.font.heavy },
				false: { color: theme.color.onBackground, ...theme.font.regular },
			},
		},
	},
	hint: {
		...theme.typography.caption,
		textAlign: 'center',
		variants: {
			selected: {
				true: { color: theme.tone.accent.onFill },
				false: { color: theme.color.onSurfaceVariant },
			},
		},
	},
}));
