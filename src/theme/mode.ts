import {UnistylesRuntime} from 'react-native-unistyles';

import type {DisplayMode} from '../domain/settings';

/**
 * Applies the stored preference at runtime (FR-052c).
 *
 * Order matters: adaptive themes must be switched off BEFORE setting a theme,
 * otherwise the OS colour scheme overrides the manual choice on its next change.
 */
export function applyDisplayMode(mode: DisplayMode): void {
  if (mode === 'auto') {
    UnistylesRuntime.setAdaptiveThemes(true);
    return;
  }

  UnistylesRuntime.setAdaptiveThemes(false);
  UnistylesRuntime.setTheme(mode);
}
