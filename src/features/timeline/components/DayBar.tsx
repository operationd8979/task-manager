import React from 'react';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Text} from '../../../components/Text';
import {t} from '../../../lib/strings';
import {today, type LocalDate} from '../../../lib/date';
import {appTheme} from '../../../theme/theme';
import {BAR_HEIGHT, TAP_TARGET_MIN} from '../../../theme/tokens';

/** Placeholders until the icon set is chosen (decisions.md D-06). */
const PREV_GLYPH = '‹';
const NEXT_GLYPH = '›';
const SETTINGS_GLYPH = 'CĐ';

export interface DayBarProps {
  date: LocalDate;
  /** Formatted elsewhere so this component holds no locale logic. */
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

export function DayBar({
  date,
  label,
  onPrevious,
  onNext,
  onOpenCalendar,
  onOpenSettings,
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
      width: TAP_TARGET_MIN,
      minHeight: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowGlyph: {
      ...theme.typography.title,
      color: theme.color.onBackground,
    },
    settingsGlyph: {
      ...theme.typography.caption,
      color: theme.color.onBackground,
    },
    title: {
      flex: 1,
      minHeight: TAP_TARGET_MIN,
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
  };
});
