import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout, presets } from '@chipmobilesdk/rn-theme';

import { Chevron } from '../../../components/Chevron';
import { Text } from '../../../components/Text';
import { useT } from '../../../i18n/useT';
import { today, type LocalDate } from '../../../lib/date';
import {
	BAR_HEIGHT,
	DAY_ICON_SIZE,
	NAV_CHEVRON_SIZE,
} from '../../../theme/tokens';

/**
 * U+FE0E asks for the TEXT presentation of the gear, so it inherits the bar's
 * colour instead of arriving as a multi-colour emoji that ignores the theme.
 * The arrows are drawn rather than typed — see Chevron for why.
 */
const SETTINGS_GLYPH = '⚙︎';

export interface DayBarProps {
	date: LocalDate;
	/** Formatted elsewhere so this component holds no locale logic. */
	label: string;
	onPrevious: () => void;
	onNext: () => void;
	onOpenCalendar: () => void;
	onOpenSettings: () => void;
	/** Jump straight back to today from any other day. */
	onToday: () => void;
}

export function DayBar({
	date,
	label,
	onPrevious,
	onNext,
	onOpenCalendar,
	onOpenSettings,
	onToday,
}: DayBarProps) {
	const t = useT();
	const isToday = date === today();

	return (
		<View style={styles.bar}>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('day.previous')}
				onPress={onPrevious}
				style={styles.arrow}>
				<Chevron direction="left" size={NAV_CHEVRON_SIZE} />
			</Pressable>

			{/* Tapping the title opens the month sheet (S-02). */}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('day.openCalendar')}
				onPress={onOpenCalendar}
				style={styles.title}>
				<Text style={styles.titleText} numberOfLines={1}>
					{label}
				</Text>
				{isToday ? <Text style={styles.todayTag}>{t('day.today')}</Text> : null}
			</Pressable>

			{/* Only offered when it would do something. On today it would be a live
          control that changes nothing, which is worse than an absent one. */}
			{isToday ? null : (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('day.backToToday')}
					onPress={onToday}
					style={styles.todayButton}>
					<Text style={styles.todayLabel} numberOfLines={1}>
						{t('day.backToToday')}
					</Text>
				</Pressable>
			)}

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('day.next')}
				onPress={onNext}
				style={styles.arrow}>
				<Chevron direction="right" size={NAV_CHEVRON_SIZE} />
			</Pressable>

			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('day.settings')}
				onPress={onOpenSettings}
				style={styles.arrow}>
				<Text style={styles.settingsGlyph}>{SETTINGS_GLYPH}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create(theme => ({
	bar: {
		...layout.rowCenter,
		minHeight: BAR_HEIGHT.day,
		borderBottomWidth: theme.borderWidth.thick,
		borderBottomColor: theme.color.onBackground,
		backgroundColor: theme.color.background,
	},
	arrow: {
		...layout.center,
		width: DAY_ICON_SIZE,
		minHeight: DAY_ICON_SIZE,
	},
	settingsGlyph: {
		...theme.text.title,
		...presets.glyphAlign,
	},
	title: {
		...layout.fill,
		minHeight: DAY_ICON_SIZE,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.xs,
	},
	titleText: {
		...theme.text.body,
		...theme.font.heavy,
		...presets.glyphAlign,
	},
	todayTag: {
		...theme.text.caption,
		...presets.glyphAlign,
	},
	// Outlined rather than filled: it is a shortcut back to a default, not the
	// screen's primary action.
	todayButton: {
		minHeight: DAY_ICON_SIZE - theme.spacing.smPlus,
		justifyContent: 'center',
		paddingHorizontal: theme.spacing.sm,
		borderWidth: theme.borderWidth.thick,
		borderColor: theme.tone.accent.fg,
	},
	todayLabel: {
		...theme.typography.caption,
		color: theme.tone.accent.fg,
	},
}));
