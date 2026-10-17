import { Appearance } from 'react-native';
import { applyThemeMode } from '@chipmobilesdk/rn-theme';

import type { DisplayMode } from '../domain/settings';

/** The OS's own vocabulary: a fixed scheme, or none to follow the system. */
export type OsColorScheme = 'light' | 'dark' | 'unspecified';

/** The slice of React Native's `Appearance` this needs. */
export interface AppearanceApi {
	setColorScheme(scheme: OsColorScheme): void;
	getColorScheme(): OsColorScheme | null | undefined;
	addChangeListener(
		listener: (preferences: { colorScheme: OsColorScheme }) => void,
	): { remove(): void };
}

/**
 * What the native layer is told (FR-052c). The stored value stays `auto` —
 * renaming it would need a settings migration for no user benefit.
 */
export function toOsColorScheme(mode: DisplayMode): OsColorScheme {
	return mode === 'auto' ? 'unspecified' : mode;
}

/** The app theme for a scheme the OS reports: anything not dark is light. */
export function themeFor(
	scheme: OsColorScheme | null | undefined,
): 'light' | 'dark' {
	return scheme === 'dark' ? 'dark' : 'light';
}

/**
 * Builds `applyDisplayMode`; the dependencies are parameters only so tests can
 * hand in fakes.
 */
export function createDisplayModeApplier(
	appearance: AppearanceApi,
	setTheme: (theme: 'light' | 'dark') => void,
): (mode: DisplayMode) => void {
	let followingSystem: { remove(): void } | null = null;

	return mode => {
		followingSystem?.remove();
		followingSystem = null;

		appearance.setColorScheme(toOsColorScheme(mode));

		if (mode !== 'auto') {
			setTheme(mode);
			return;
		}
		setTheme(themeFor(appearance.getColorScheme()));
		followingSystem = appearance.addChangeListener(({ colorScheme }) =>
			setTheme(themeFor(colorScheme)),
		);
	};
}

/**
 * Applies the Hiển thị preference to the app AND to everything the OS draws
 * for it.
 *
 * Native pieces — the date and time picker dialogs above all — take their
 * light/dark from the activity, which follows the SYSTEM unless told
 * otherwise. With the phone dark and the app on Sáng, the pickers opened dark
 * over a light form. `Appearance.setColorScheme` tells the activity the app's
 * choice instead (on Android it sets AppCompat's night mode).
 *
 * "Tự động" no longer uses the theme package's adaptive mode
 * (`applyThemeMode('system')`). That mode reads the OS scheme at the instant it
 * is switched on, but `setColorScheme('unspecified')` lands a moment later on
 * the UI thread — so coming back from Sáng/Tối it could read the scheme the app
 * had just forced, and nothing would ever correct it: the theme library only
 * re-reads on system-wide configuration broadcasts, which an in-app override
 * does not send. React Native's `Appearance` IS told about both kinds of
 * change, so "Tự động" follows that instead, and lands on the system's scheme
 * once the override is lifted.
 *
 * One listener at most: every call removes the previous one first.
 */
export const applyDisplayMode = createDisplayModeApplier(
	Appearance,
	applyThemeMode,
);
