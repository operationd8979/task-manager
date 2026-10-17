import type { ThemeMode } from '@chipmobilesdk/rn-theme';

import type { DisplayMode } from '../domain/settings';

/**
 * The stored preference in the theme package's vocabulary (FR-052c).
 *
 * The stored value stays `auto` — renaming it would need a settings migration
 * for no user benefit. Hand the result to `applyThemeMode`, which switches
 * adaptive themes off before setting a manual one.
 */
export function toThemeMode(mode: DisplayMode): ThemeMode {
	return mode === 'auto' ? 'system' : mode;
}
