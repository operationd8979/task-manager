import React from 'react';
import {Keyboard, Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {appTheme} from '../theme/theme';
import {TAP_TARGET_MIN} from '../theme/tokens';
import {Text} from './Text';

export interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

/**
 * Used wherever the value domain is finite — reminder offsets, durations,
 * weekday presets (Principle I: prefer selection over typing).
 *
 * Selection is carried by fill, inverted text colour AND weight, plus
 * `accessibilityState.selected`. Colour alone would fail Principle V.
 */
export function Chip({label, selected, onPress, accessibilityLabel}: ChipProps) {
  styles.useVariants({selected});
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      accessibilityLabel={accessibilityLabel ?? label}
      // The sheet keeps taps alive while the keyboard is open, so the press
      // lands — but the keyboard would stay up over the rest of the form. The
      // user has moved on from typing; put it away.
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({children}: {children: React.ReactNode}) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create(raw => { const theme = appTheme(raw); return ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    // 44pt even when the label is short — the tap target is the point.
    minHeight: TAP_TARGET_MIN,
    minWidth: TAP_TARGET_MIN,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: theme.radius.sm,
    variants: {
      selected: {
        true: {
          backgroundColor: theme.appColor.accentFill,
          borderColor: theme.appColor.accentFill,
        },
        false: {
          backgroundColor: 'transparent',
          borderColor: theme.color.border,
        },
      },
    },
  },
  label: {
    ...theme.typography.label,
    variants: {
      selected: {
        true: {color: theme.appColor.onAccent, fontWeight: '800'},
        false: {color: theme.color.onBackground, fontWeight: '400'},
      },
    },
  },
}); });
