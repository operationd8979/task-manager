import React from 'react';
import { Platform, Switch } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export interface ToggleProps {
	value: boolean;
	onValueChange: (next: boolean) => void;
	accessibilityLabel: string;
}

/**
 * The only switch the app renders.
 *
 * A bare `Switch` takes its colours from the platform theme, which follows the
 * SYSTEM light/dark setting, not the app's. On a phone in dark mode that meant
 * Material's pale teal (#80CBC4) on the app's light form, and an "off" state
 * whose track was white at 30% — invisible against the sheet. The colours are
 * now the app's own, from the active theme:
 *
 * - on: the accent thumb on its container track — the same red as the
 *   primary action, 6:1 against the background;
 * - off: the `outline` thumb (the interactive-boundary colour, ≥3:1 by the
 *   theme's guarantee) on the divider-coloured track.
 *
 * iOS keeps its white thumb, which is how a native switch is recognised there;
 * only the tracks change.
 */
export function Toggle({
	value,
	onValueChange,
	accessibilityLabel,
}: Readonly<ToggleProps>) {
	const { theme } = useUnistyles();
	const ios = Platform.OS === 'ios';
	const offThumb = ios ? undefined : theme.color.outline;
	const onThumb = ios ? undefined : theme.tone.accent.fill;

	return (
		<Switch
			accessibilityLabel={accessibilityLabel}
			value={value}
			onValueChange={onValueChange}
			trackColor={{
				false: theme.color.outlineVariant,
				true: ios ? theme.tone.accent.fill : theme.tone.accent.container,
			}}
			thumbColor={value ? onThumb : offThumb}
			ios_backgroundColor={theme.color.outlineVariant}
		/>
	);
}
