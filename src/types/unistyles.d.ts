import type { AppColors, APP_SPACING, APP_TYPE } from '../theme/tokens';

/**
 * `@chipmobilesdk/rn-theme` already ships its own
 * `declare module 'react-native-unistyles'` augmentation (src/unistyles/types.ts)
 * even though its README asks the host app to write one. Repeating it collides,
 * and it pins `UnistylesTheme` to the SDK's `StyleTheme`.
 *
 * So the extra token groups are declared on `StyleTheme` itself. They are
 * OPTIONAL here because the SDK builds a `StyleTheme` internally without them;
 * requiring them would break the package's own compilation. `src/theme/theme.ts`
 * narrows them back to required at the single point where that is safe.
 */
declare module '@chipmobilesdk/rn-theme' {
	interface StyleTheme {
		appColor?: AppColors;
		appSpacing?: typeof APP_SPACING;
		appType?: typeof APP_TYPE;
	}
}
