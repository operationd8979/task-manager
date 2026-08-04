import React, {useState} from 'react';
import {Keyboard, Platform, Pressable} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {StyleSheet} from 'react-native-unistyles';

import {Text} from '../../../components/Text';
import {
  parseLocalDate,
  toDateTime,
  toLocalDate,
  toLocalTime,
  type LocalDate,
  type LocalTime,
} from '../../../lib/date';
import {appTheme} from '../../../theme/theme';
import {TAP_TARGET_MIN} from '../../../theme/tokens';

interface BaseProps {
  accessibilityLabel: string;
}

export interface DateFieldProps extends BaseProps {
  mode: 'date';
  value: LocalDate;
  onChange: (next: LocalDate) => void;
}

export interface TimeFieldProps extends BaseProps {
  mode: 'time';
  /** The day the time belongs to, so the picker opens at the right instant. */
  date: LocalDate;
  value: LocalTime;
  onChange: (next: LocalTime) => void;
}

export type DateTimeFieldProps = DateFieldProps | TimeFieldProps;

/**
 * The OS picker, per Principle I — it follows the device's 12/24-hour setting
 * and first-day-of-week without the app reimplementing either.
 *
 * On Android the picker is a dialog that appears when mounted, so it is
 * rendered conditionally; on iOS it is inline and dismisses itself.
 */
export function DateTimeField(props: DateTimeFieldProps) {
  const [open, setOpen] = useState(false);

  const current =
    props.mode === 'date'
      ? parseLocalDate(props.value)
      : toDateTime(props.date, props.value);

  const display = props.mode === 'date' ? props.value : props.value;

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    // Android reports dismissal explicitly; treat anything else as a cancel too.
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type !== 'set' || !picked) {
      return;
    }
    if (props.mode === 'date') {
      props.onChange(toLocalDate(picked));
    } else {
      props.onChange(toLocalTime(picked));
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.accessibilityLabel}
        accessibilityValue={{text: display}}
        // The OS picker is about to cover the screen; leaving the keyboard
        // underneath it means it is still there when the picker closes.
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={styles.trigger}>
        <Text style={styles.value}>{display}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={current}
          mode={props.mode}
          onChange={handleChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    trigger: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
    },
    value: {
      ...theme.typography.body,
      color: theme.color.onSurface,
    },
  };
});
