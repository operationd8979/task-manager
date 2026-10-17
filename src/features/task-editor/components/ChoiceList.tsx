import React from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import { Text } from '../../../components/Text';

export interface Choice<T extends string> {
	value: T;
	label: string;
	/** One line under the label saying what picking it actually does. */
	description: string;
}

export interface ChoiceListProps<T extends string> {
	choices: ReadonlyArray<Choice<T>>;
	value: T;
	onChange: (value: T) => void;
	accessibilityLabel: string;
}

/**
 * One choice among a few options that a word each cannot tell apart.
 *
 * The repeat modes used to be a 2×2 segmented grid. Inside one shared frame,
 * the three unselected cells had no edges of their own and read as loose text
 * rather than as things to tap, and the labels alone left the real question
 * open — "the last day" of what? Each option is now its own full-width row: a
 * radio mark, the label, and a line that answers that question.
 *
 * Selection is never colour alone (Principle V): the radio fills, the label
 * turns heavy, the row takes the accent frame, and the row reports `checked`.
 */
export function ChoiceList<T extends string>({
	choices,
	value,
	onChange,
	accessibilityLabel,
}: Readonly<ChoiceListProps<T>>) {
	return (
		<View
			accessibilityRole="radiogroup"
			accessibilityLabel={accessibilityLabel}
			style={styles.list}>
			{choices.map(choice => (
				<ChoiceRow
					key={choice.value}
					choice={choice}
					selected={choice.value === value}
					// Same as Chip: picking an option means typing is over.
					onPress={() => {
						Keyboard.dismiss();
						onChange(choice.value);
					}}
				/>
			))}
		</View>
	);
}

function ChoiceRow<T extends string>({
	choice,
	selected,
	onPress,
}: Readonly<{ choice: Choice<T>; selected: boolean; onPress: () => void }>) {
	styles.useVariants({ selected });
	return (
		<Pressable
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			accessibilityLabel={`${choice.label}. ${choice.description}`}
			onPress={onPress}
			style={styles.row}>
			<View style={styles.radio}>
				{selected ? <View style={styles.dot} /> : null}
			</View>
			<View style={styles.text}>
				<Text style={styles.label}>{choice.label}</Text>
				<Text style={styles.description}>{choice.description}</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create(theme => ({
	list: {
		gap: theme.spacing.sm,
	},
	row: {
		...layout.rowCenter,
		minHeight: theme.size.touchTarget,
		gap: theme.spacing.smPlus,
		paddingVertical: theme.spacing.sm,
		paddingHorizontal: theme.spacing.md,
		borderWidth: theme.borderWidth.thick,
		borderRadius: theme.radius.sm,
		variants: {
			selected: {
				true: {
					borderColor: theme.tone.accent.fg,
					backgroundColor: theme.tone.accent.container,
				},
				false: {
					borderColor: theme.color.outline,
					backgroundColor: 'transparent',
				},
			},
		},
	},
	// Round although every other corner in the app is square: a circle is what
	// says "pick one of these", the way a box says "tick any".
	radio: {
		...layout.center,
		width: theme.size.icon.md,
		height: theme.size.icon.md,
		borderWidth: theme.borderWidth.thick,
		borderRadius: theme.radius.full,
		variants: {
			selected: {
				true: { borderColor: theme.tone.accent.fg },
				false: { borderColor: theme.color.outline },
			},
		},
	},
	dot: {
		width: theme.size.icon.md / 2,
		height: theme.size.icon.md / 2,
		borderRadius: theme.radius.full,
		backgroundColor: theme.tone.accent.fg,
	},
	text: {
		...layout.fill,
		gap: theme.spacing.xxs,
	},
	label: {
		...theme.typography.body,
		variants: {
			selected: {
				true: { color: theme.tone.accent.onContainer, ...theme.font.heavy },
				false: { color: theme.color.onSurface },
			},
		},
	},
	description: {
		...theme.typography.label,
		variants: {
			selected: {
				true: { color: theme.tone.accent.onContainer },
				false: { color: theme.color.onSurfaceVariant },
			},
		},
	},
}));
