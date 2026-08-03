import React, {useState} from 'react';
import {Pressable} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Chip, ChipRow} from '../../../components/Chip';
import {Sheet} from '../../../components/Sheet';
import {Text} from '../../../components/Text';
import type {Task} from '../../../domain/task';
import type {LocalDate, LocalTime} from '../../../lib/date';
import {t} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {BAR_HEIGHT} from '../../../theme/tokens';
import {DateTimeField} from './DateTimeField';
import {Field} from './Field';

/** Times people actually reach for; the OS picker covers the tail. */
const COMMON_TIMES: readonly LocalTime[] = [
  '08:00',
  '09:00',
  '10:00',
  '13:00',
  '14:00',
  '16:00',
];

export interface TimeShiftSheetProps {
  /**
   * Only the two fields the sheet actually edits, so a recurring session — which
   * has no Task record behind it — can be handed here as well.
   */
  subject: Pick<Task, 'taskDate' | 'startTime'>;
  /**
   * `time` shifts within the day; `move` also offers the date.
   * A session of a series is always `time`: its date is decided by the rule's
   * weekdays, and drag-and-drop never crosses days either (FR-018b).
   */
  mode: 'time' | 'move';
  onApply: (next: {taskDate: LocalDate; startTime: LocalTime}) => void;
  onClose: () => void;
}

export function TimeShiftSheet({
  subject,
  mode,
  onApply,
  onClose,
}: TimeShiftSheetProps) {
  const [date, setDate] = useState(subject.taskDate);
  const [time, setTime] = useState(subject.startTime);

  return (
    <Sheet
      title={mode === 'move' ? t('shift.moveTitle') : t('shift.timeTitle')}
      onClose={onClose}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.apply')}
          onPress={() => onApply({taskDate: date, startTime: time})}
          style={styles.primary}>
          <Text style={styles.primaryLabel}>{t('common.apply')}</Text>
        </Pressable>
      }>
      <Field label={t('shift.commonTimes')}>
        <ChipRow>
          {COMMON_TIMES.map(option => (
            <Chip
              key={option}
              label={option}
              selected={option === time}
              onPress={() => setTime(option)}
            />
          ))}
        </ChipRow>
      </Field>

      <Field label={t('form.start')}>
        <DateTimeField
          mode="time"
          accessibilityLabel={t('form.start')}
          date={date}
          value={time}
          onChange={setTime}
        />
      </Field>

      {mode === 'move' ? (
        <Field label={t('form.date')}>
          <DateTimeField
            mode="date"
            accessibilityLabel={t('form.date')}
            value={date}
            onChange={setDate}
          />
          {/* Said in words so people stop trying to drag across days. */}
          <Text style={styles.hint}>{t('shift.dateOnlyHere')}</Text>
        </Field>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    hint: {
      ...theme.typography.caption,
      color: theme.appColor.textMuted,
    },
    primary: {
      minHeight: BAR_HEIGHT.action,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.appColor.accentFill,
    },
    primaryLabel: {
      ...theme.typography.body,
      color: theme.appColor.onAccent,
      fontWeight: '800',
    },
  };
});
