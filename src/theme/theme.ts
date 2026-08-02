import type {StyleTheme} from '@chipmobilesdk/rn-theme';

import type {AppColors, APP_SPACING, APP_TYPE} from './tokens';

/**
 * The theme as it actually exists at runtime.
 *
 * `setup.ts` attaches `appColor`, `appSpacing` and `appType` to both theme
 * objects before `StyleSheet.configure` is called, so these are always present.
 * They are optional on `StyleTheme` only because the SDK constructs a theme
 * without them internally.
 */
export type AppTheme = StyleTheme & {
  appColor: AppColors;
  appSpacing: typeof APP_SPACING;
  appType: typeof APP_TYPE;
};

/**
 * The one place the app narrows the theme. Every stylesheet goes through it, so
 * if the setup order is ever broken the failure surfaces here rather than as a
 * scattering of `undefined` reads.
 */
export function appTheme(theme: StyleTheme): AppTheme {
  return theme as AppTheme;
}
