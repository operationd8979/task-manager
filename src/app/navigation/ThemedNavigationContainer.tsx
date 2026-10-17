import React, { type ReactNode } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useUnistyles } from 'react-native-unistyles';
import { toNavigationTheme } from '@chipmobilesdk/rn-theme';

/**
 * The navigator's own colours — the card behind a sliding screen above all —
 * follow the app theme. Without it React Navigation paints its light default
 * there, which flashes during the Cài đặt slide in dark mode (specs/003 AC-1.5).
 *
 * Its own component so that only this subscribes to theme changes: `children`
 * are elements created by `App`, so React bails out of re-rendering them and
 * only navigation-theme consumers update.
 */
export function ThemedNavigationContainer({
	children,
}: Readonly<{ children: ReactNode }>) {
	const { theme, rt } = useUnistyles();
	const scheme = rt.themeName === 'dark' ? 'dark' : 'light';
	return (
		<NavigationContainer theme={toNavigationTheme(theme, scheme)}>
			{children}
		</NavigationContainer>
	);
}
