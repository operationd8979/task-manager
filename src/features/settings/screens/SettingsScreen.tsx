import React from 'react';
import {View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {EmptyState} from '../../../components/EmptyState';
import {t} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';

/**
 * Placeholder. Built in US7 (T109–T118): permission rows, display mode,
 * default reminder offset, week start, data block, destroy-all.
 */
export function SettingsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <EmptyState
          title={t('day.settings')}
          body={t('timeline.emptyBody')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    screen: {
      flex: 1,
      backgroundColor: theme.color.background,
    },
    body: {
      flex: 1,
    },
  };
});
