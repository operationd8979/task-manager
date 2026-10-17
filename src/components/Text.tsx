import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

export type TextProps = RNTextProps;

/**
 * The only Text the app renders.
 *
 * The 170% ceiling (`theme.maxFontScale`) has to be enforced here, not through
 * the theme's `fontScale`: that value is multiplied once at configuration time
 * and does not track the OS text-size setting, which React Native applies at
 * the Text layer (FR-057).
 */
export function Text({ maxFontSizeMultiplier, ...rest }: TextProps) {
	const { theme } = useUnistyles();
	return (
		<RNText
			{...rest}
			maxFontSizeMultiplier={maxFontSizeMultiplier ?? theme.maxFontScale}
		/>
	);
}
