import React from 'react';
import { StatusBar } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

/**
 * Status-bar icons in the APP's theme, not the system's.
 *
 * Edge-to-edge sets the icon colour once, from the system light/dark mode. With
 * the phone dark and the app set to Sáng, that left white clock and battery
 * icons on the app's light background — the same mismatch as the switch. The
 * bar itself is transparent edge-to-edge, so only the icon style is ours.
 */
export function ThemedStatusBar() {
	const { rt } = useUnistyles();
	return (
		<StatusBar
			barStyle={rt.themeName === 'dark' ? 'light-content' : 'dark-content'}
		/>
	);
}
