import React from 'react';
import {Keyboard, Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {appTheme} from '../theme/theme';
import {TAP_TARGET_MIN} from '../theme/tokens';
import {Text} from './Text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown under the label — used by "Tự động" to say it follows the OS. */
  hint?: string;
}

export interface SegmentedProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/**
 * Two- or three-way exclusive choice. Same rule as Chip: selection is never
 * carried by colour alone.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}>
      {options.map(option => {
        const selected = option.value === value;
        return (
          <SegmentedItem
            key={option.value}
            option={option}
            selected={selected}
            // Same reason as Chip: choosing a segment means typing is over.
            onPress={() => {
              Keyboard.dismiss();
              onChange(option.value);
            }}
          />
        );
      })}
    </View>
  );
}

function SegmentedItem<T extends string>({
  option,
  selected,
  onPress,
}: {
  option: SegmentedOption<T>;
  selected: boolean;
  onPress: () => void;
}) {
  styles.useVariants({selected});
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{selected}}
      accessibilityLabel={
        option.hint ? `${option.label}. ${option.hint}` : option.label
      }
      onPress={onPress}
      style={styles.item}>
      <Text style={styles.label}>{option.label}</Text>
      {option.hint ? <Text style={styles.hint}>{option.hint}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create(raw => { const theme = appTheme(raw); return ({
  container: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: theme.color.border,
    borderRadius: theme.radius.sm,
  },
  item: {
    flex: 1,
    minHeight: TAP_TARGET_MIN,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    variants: {
      selected: {
        true: {backgroundColor: theme.appColor.accentFill},
        false: {backgroundColor: 'transparent'},
      },
    },
  },
  label: {
    ...theme.typography.label,
    textAlign: 'center',
    variants: {
      selected: {
        true: {color: theme.appColor.onAccent, fontWeight: '800'},
        false: {color: theme.color.onBackground, fontWeight: '400'},
      },
    },
  },
  hint: {
    ...theme.typography.caption,
    textAlign: 'center',
    variants: {
      selected: {
        true: {color: theme.appColor.onAccent},
        false: {color: theme.appColor.textMuted},
      },
    },
  },
}); });
