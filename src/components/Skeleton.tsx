import React, { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { appTheme } from '../theme/theme';

const BREATH_MS = 1400;
const MIN_OPACITY = 0.55;

export interface SkeletonProps {
	width?: ViewStyle['width'];
	height?: number;
	style?: ViewStyle;
}

/**
 * A single skeleton block.
 *
 * Skeletons must carry the shape of the real content, never a spinner on a
 * blank screen (Principle IV). Composition is the caller's job — see
 * TaskRowSkeleton, which mirrors the clock column, checkbox and two text runs.
 */
export function Skeleton({ width = '100%', height = 12, style }: SkeletonProps) {
	const { theme: rawTheme } = useUnistyles();
	const theme = appTheme(rawTheme);
	const opacity = useRef(new Animated.Value(MIN_OPACITY)).current;

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 1,
					duration: BREATH_MS / 2,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: MIN_OPACITY,
					duration: BREATH_MS / 2,
					useNativeDriver: true,
				}),
			]),
		);
		loop.start();
		// Principle VII: the animation must not outlive the screen that started it.
		return () => loop.stop();
	}, [opacity]);

	return (
		<Animated.View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants"
			style={[
				styles.block,
				{ width, height, backgroundColor: theme.appColor.skeletonFrom, opacity },
				style,
			]}
		/>
	);
}

/** Wrapper that hides a whole skeleton group from screen readers. */
export function SkeletonGroup({ children }: { children: React.ReactNode }) {
	return (
		<View
			accessibilityElementsHidden
			importantForAccessibility="no-hide-descendants">
			{children}
		</View>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw); return ({
		block: {
			borderRadius: theme.radius.sm,
		},
	});
});
