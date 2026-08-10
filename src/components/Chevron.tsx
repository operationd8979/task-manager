import React from 'react';
import { View } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { appTheme } from '../theme/theme';

export interface ChevronProps {
	direction: 'left' | 'right';
	/**
	 * Side of the square the arrow is cut from. The drawn arrow is about 0.7×
	 * this wide and 1.4× this tall — sizes are chosen against that, not against
	 * the number itself.
	 */
	size?: number;
	/** Draw in the muted text colour instead of the foreground. */
	muted?: boolean;
}

/**
 * A chevron drawn from borders rather than typed as `‹`.
 *
 * Text glyphs are positioned by the font's ascent and descent, which are not
 * symmetric and differ per glyph, so a chevron centred in its box still LOOKS
 * off centre — and it lands differently again next to a gear or a title. That
 * is not something padding can fix reliably; the only way to be sure two icons
 * sit on the same line is to stop asking a font where they go.
 *
 * A square with two adjacent borders, rotated 45°, gives an exact arrow. The
 * translate re-centres it: the visible ink of that shape sits in the left half
 * of the square, so without it the arrow drifts toward the leading edge.
 */
export function Chevron({ direction, size = 18, muted = false }: ChevronProps) {
	const { theme: raw } = useUnistyles();
	const theme = appTheme(raw);
	const stroke = Math.max(2, Math.round(size / 7));
	const recentre = size * 0.35;

	return (
		<View
			// A plain style, not a Unistyles one: the geometry is computed per call
			// and only the colour comes from the theme.
			style={{
				width: size,
				height: size,
				borderLeftWidth: stroke,
				borderBottomWidth: stroke,
				borderColor: muted ? theme.appColor.textMuted : theme.color.onBackground,
				transform: [
					{ translateX: direction === 'left' ? recentre : -recentre },
					{ rotate: direction === 'left' ? '45deg' : '-135deg' },
				],
			}}
		/>
	);
}
