import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { MAX_FONT_SCALE } from '../theme/tokens';

export type TextProps = RNTextProps;

/**
 * The only Text the app renders.
 *
 * The 170% ceiling has to be enforced here, not through the theme's
 * `fontScale`: that value is multiplied once at configuration time and does not
 * track the OS text-size setting, which React Native applies at the Text layer
 * (design-system.md §4, FR-057).
 */
export function Text({ maxFontSizeMultiplier, ...rest }: TextProps) {
	return (
		<RNText
			{...rest}
			maxFontSizeMultiplier={maxFontSizeMultiplier ?? MAX_FONT_SCALE}
		/>
	);
}
