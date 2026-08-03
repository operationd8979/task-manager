import React from 'react';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Text} from '../../../components/Text';
import {t} from '../../../lib/strings';
import {today, type LocalDate} from '../../../lib/date';
import {appTheme} from '../../../theme/theme';
import {BAR_HEIGHT, DAY_ICON_SIZE, NAV_GLYPH} from '../../../theme/tokens';

/** Placeholders until the icon set is chosen (decisions.md D-06). */
const PREV_GLYPH = '‹';
const NEXT_GLYPH = '›';
/**
 * U+FE0E asks for the TEXT presentation of the gear, so it inherits the bar's
 * colour instead of arriving as a multi-colour emoji that ignores the theme.
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
  const isToday = date === today();

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('day.previous')}
        onPress={onPrevious}
        style={styles.arrow}>
        <Text style={styles.arrowGlyph}>{PREV_GLYPH}</Text>
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
        <Text style={styles.arrowGlyph}>{NEXT_GLYPH}</Text>
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

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    bar: {
      minHeight: BAR_HEIGHT.day,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: theme.color.onBackground,
      backgroundColor: theme.color.background,
    },
    arrow: {
      width: DAY_ICON_SIZE,
      minHeight: DAY_ICON_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowGlyph: {
      ...theme.typography.headline,
      ...NAV_GLYPH,
      color: theme.color.onBackground,
    },
    settingsGlyph: {
      ...theme.typography.title,
      color: theme.color.onBackground,
    },
    title: {
      flex: 1,
      minHeight: DAY_ICON_SIZE,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xs,
    },
    titleText: {
      ...theme.typography.body,
      color: theme.color.onBackground,
      fontWeight: '800',
    },
    todayTag: {
      ...theme.typography.caption,
      color: theme.appColor.textMuted,
    },
    // Outlined rather than filled: it is a shortcut back to a default, not the
    // screen's primary action.
    todayButton: {
      minHeight: DAY_ICON_SIZE - 12,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.appColor.accentInk,
    },
    todayLabel: {
      ...theme.typography.caption,
      color: theme.appColor.accentInk,
    },
  };
});
