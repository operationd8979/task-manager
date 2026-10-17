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
	/**
	 * Wrap onto two columns instead of one row.
	 *
	 * Four segments in a single row leave about 66pt for a label like "Lặp cuối
	 * tháng", which breaks it across three lines before the OS text size is
	 * touched. Opt-in rather than automatic: the existing two- and three-way
	 * choices are still one row, and nothing about them changes.
	 */
	columns?: 2;
}

/**
 * Two- to four-way exclusive choice. Same rule as Chip: selection is never
 * carried by colour alone.
 */
export function Segmented<T extends string>({
	options,
	value,
	onChange,
	accessibilityLabel,
	columns,
}: SegmentedProps<T>) {
	const grid = columns === 2;
	return (
		<View
			accessibilityRole="radiogroup"
			accessibilityLabel={accessibilityLabel}
			style={grid ? styles.gridContainer : styles.container}>
			{options.map(option => {
				const selected = option.value === value;
				return (
					<SegmentedItem
						key={option.value}
						option={option}
						selected={selected}
						grid={grid}
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
	grid,
	onPress,
}: {
	option: SegmentedOption<T>;
	selected: boolean;
	grid: boolean;
	onPress: () => void;
}) {
	styles.useVariants({ selected, width: grid ? 'half' : 'share' });
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
	gridContainer: {
		...layout.wrap,
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.color.outline,
		borderRadius: theme.radius.sm,
	},
	item: {
		...theme.box.touchTarget,
		...layout.center,
		paddingVertical: theme.spacing.xs,
		paddingHorizontal: theme.spacing.sm,
		variants: {
			selected: {
				true: { backgroundColor: theme.tone.accent.fill },
				false: { backgroundColor: 'transparent' },
			},
			width: {
				// Exactly two per line, so the wrap lands where it is meant to
				// rather than wherever the longest label happens to push it.
				half: { flexGrow: 0, flexShrink: 1, flexBasis: '50%' },
				share: layout.fill,
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
