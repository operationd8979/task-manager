import React, { useEffect, useState } from 'react';
import {
	PixelRatio,
	Pressable,
	StyleSheet as RNStyleSheet,
	View,
	type LayoutChangeEvent,
} from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native-unistyles';
import type { PlacementState } from '@chipmobilesdk/rn-ads';
import { layout } from '@chipmobilesdk/rn-theme';

import { useBottomInset } from '../../../app/providers/BottomInsetProvider';
import { useMonetization } from '../../../app/providers/MonetizationProvider';
import { Text } from '../../../components/Text';
import { useT } from '../../../i18n/useT';
import { PLACEMENT } from '../../../services/monetization/catalog';

/** Long enough to read as a slide, short enough never to hold up a tap. */
const SLOT_ANIMATION_MS = 220;

/**
 * Layout reports the content's height with sub-pixel noise (98.99998, then
 * 99.00001 in landscape). Each new value re-ran the slide and re-measured, a
 * loop found on a device; changes smaller than this are not changes.
 */
const MEASURE_TOLERANCE_PT = 1;

/**
 * Plain styles for the Reanimated wrapper: the Unistyles Babel plugin only
 * rewrites components imported from 'react-native', and none of these is a
 * themed value.
 */
const plain = RNStyleSheet.create({
	slot: { overflow: 'hidden' },
	// Pinned to the top rather than flowing: a flowing child of a zero-height
	// wrapper is never laid out on the New Architecture, so it is never measured
	// and the slot could never open. Absolute content keeps its natural height
	// and the wrapper's animated height does the clipping.
	content: { position: 'absolute', top: 0, left: 0, right: 0 },
});

export interface BannerSlotProps {
	/** The system navigation inset, which the slot sits above (FR-9). */
	bottomInset: number;
}

/**
 * The timeline's banner area (SCR-1; design D-1, D-3): a 44 pt strip with the
 * "Remove ads" link, then the banner, stacked under the New-task bar and above
 * the system inset — outside the day-swipe and drag areas, so a day change
 * never remounts it and never asks for a new ad (AC-2.2).
 *
 * Collapsed in every state but `ready`, `undecided` included (plan D-6). The
 * banner host stays mounted regardless: it is what measures the container and
 * starts the load. The state lives here, so the timeline never re-renders when
 * the banner comes or goes (FR-21).
 */
export function BannerSlot({ bottomInset }: BannerSlotProps) {
	const t = useT();
	const monetization = useMonetization();
	const Banner = monetization?.Banner ?? null;
	const extraBottom = useBottomInset();
	const [placement, setPlacement] = useState<PlacementState>('idle');
	const [contentHeight, setContentHeight] = useState(0);
	const height = useSharedValue(0);
	const open = Banner !== null && placement === 'ready';

	useEffect(() => {
		const target = open ? contentHeight : 0;
		height.value = withTiming(target, { duration: SLOT_ANIMATION_MS });
		if (extraBottom) {
			extraBottom.value = withTiming(target, { duration: SLOT_ANIMATION_MS });
		}
	}, [open, contentHeight, height, extraBottom]);

	// The toast must not keep floating over a slot that no longer exists.
	useEffect(
		() => () => {
			if (extraBottom) {
				extraBottom.value = 0;
			}
		},
		[extraBottom],
	);

	const slotStyle = useAnimatedStyle(() => ({ height: height.value }));

	const onContentLayout = (event: LayoutChangeEvent) => {
		const measured = PixelRatio.roundToNearestPixel(event.nativeEvent.layout.height);
		setContentHeight(previous =>
			Math.abs(previous - measured) < MEASURE_TOLERANCE_PT ? previous : measured,
		);
	};

	return (
		<>
			{Banner ? (
				<Animated.View style={[plain.slot, slotStyle]}>
					<View
						style={plain.content}
						onLayout={onContentLayout}
						// Clipped content is still reachable by a screen reader and by
						// touch; while collapsed, it must be neither.
						importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
						accessibilityElementsHidden={!open}
						pointerEvents={open ? 'auto' : 'none'}>
						<View style={styles.strip}>
							<Text style={styles.label}>{t('ads.label')}</Text>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={t('ads.removeA11y')}
								onPress={() => monetization?.openRemoveAds()}
								style={styles.link}>
								<Text style={styles.linkLabel}>{t('ads.remove')}</Text>
							</Pressable>
						</View>
						<Banner placementKey={PLACEMENT.timelineFooter} onStateChange={setPlacement} />
					</View>
				</Animated.View>
			) : null}
			{/* Collapsed, the New-task bar's fill runs on to the screen edge as it
          always has; open, the inset under the banner is plain background. */}
			<View style={[open ? styles.insetOpen : styles.insetCollapsed, { height: bottomInset }]} />
		</>
	);
}

const styles = StyleSheet.create(theme => ({
	strip: {
		...layout.rowBetween,
		...theme.border.top,
		minHeight: theme.size.touchTarget,
		paddingLeft: theme.spacing.md,
		backgroundColor: theme.color.background,
	},
	label: theme.text.caption,
	link: {
		...theme.box.touchTarget,
		paddingHorizontal: theme.spacing.md,
	},
	linkLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.fg,
	},
	insetOpen: {
		backgroundColor: theme.color.background,
	},
	insetCollapsed: {
		backgroundColor: theme.tone.accent.fill,
	},
}));
