import React, {useCallback, useEffect, useRef} from 'react';
import {Pressable, ScrollView, Switch, TextInput, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Chip, ChipRow} from '../../../components/Chip';
import {ErrorState} from '../../../components/ErrorState';
import {Segmented} from '../../../components/Segmented';
import {Sheet} from '../../../components/Sheet';
import {Text} from '../../../components/Text';
import {REMINDER_OFFSETS, type ReminderOffset} from '../../../domain/reminder';
import type {Task, TaskStatus} from '../../../domain/task';
import {minutesOf, timeFromMinutes, type LocalDate} from '../../../lib/date';
import {t, type StringKey} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {BAR_HEIGHT, TAP_TARGET_MIN} from '../../../theme/tokens';
import {DateTimeField} from '../components/DateTimeField';
import {Field} from '../components/Field';
import {useTaskForm} from '../hooks/useTaskForm';

/** Durations offered as one-tap end times (Principle I: selection over typing). */
const DURATION_CHIPS: ReadonlyArray<{minutes: number; key: StringKey}> = [
  {minutes: 30, key: 'form.plus30'},
  {minutes: 45, key: 'form.plus45'},
  {minutes: 60, key: 'form.plus60'},
];

export interface TaskFormSheetProps {
  task?: Task;
  viewingDate: LocalDate;
  defaultReminderOffset: ReminderOffset;
  onSaved: (saved: Task) => void;
  onClose: () => void;
}

export function TaskFormSheet({
  task,
  viewingDate,
  defaultReminderOffset,
  onSaved,
  onClose,
}: TaskFormSheetProps) {
  const form = useTaskForm({
    task,
    viewingDate,
    defaultReminderOffset,
    onSaved,
  });
  const scroll = useRef<ScrollView>(null);
  const saving = form.save.status === 'saving';

  // Delivery Baselines: scroll to the first invalid field on submit rather
  // than leaving the user to hunt for what went wrong.
  useEffect(() => {
    if (form.errors.length > 0 && form.save.status === 'idle') {
      scroll.current?.scrollTo({y: 0, animated: true});
    }
  }, [form.errors.length, form.save.status]);

  const setEndFromDuration = useCallback(
    (minutes: number) => {
      form.setField(
        'endTime',
        timeFromMinutes(minutesOf(form.values.startTime) + minutes),
      );
    },
    [form],
  );

  const message = (key: string | undefined, params?: Record<string, string>) =>
    key === undefined ? undefined : t(key as StringKey, params);

  const endError = form.errorFor('endTime');

  return (
    <Sheet
      title={task ? t('form.editTitle') : t('form.newTitle')}
      onClose={onClose}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityState={{disabled: saving}}
          accessibilityLabel={
            saving ? t('form.saving') : task ? t('form.saveEdit') : t('form.save')
          }
          disabled={saving}
          onPress={() => {
            void form.submit();
          }}
          style={styles.primary}>
          <Text style={styles.primaryLabel}>
            {saving ? t('form.saving') : task ? t('form.saveEdit') : t('form.save')}
          </Text>
        </Pressable>
      }>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled">
        {form.save.status === 'failed' ? (
          <ErrorState
            title={t('save.failedTitle')}
            body={t('timeline.errorBody')}
            retryLabel={t('save.retry')}
            onRetry={() => {
              void form.submit();
            }}
          />
        ) : null}

        <View style={styles.fields}>
          <Field
            label={t('form.name')}
            error={message(form.errorFor('title')?.messageKey)}>
            <TextInput
              accessibilityLabel={t('form.name')}
              value={form.values.title}
              onChangeText={next => form.setField('title', next)}
              style={styles.input}
              autoFocus={task === undefined}
            />
          </Field>

          <View style={styles.row}>
            <View style={styles.cell}>
              <Field label={t('form.date')}>
                <DateTimeField
                  mode="date"
                  accessibilityLabel={t('form.date')}
                  value={form.values.taskDate}
                  onChange={next => form.setField('taskDate', next)}
                />
              </Field>
            </View>
            <View style={styles.cell}>
              <Field label={t('form.start')}>
                <DateTimeField
                  mode="time"
                  accessibilityLabel={t('form.start')}
                  date={form.values.taskDate}
                  value={form.values.startTime}
                  onChange={next => form.setField('startTime', next)}
                />
              </Field>
            </View>
            <View style={styles.cell}>
              <Field
                label={t('form.end')}
                error={message(endError?.messageKey, endError?.params)}>
                {form.values.endTime === null ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('form.end')}
                    onPress={() => setEndFromDuration(60)}
                    style={styles.emptyEnd}>
                    <Text style={styles.emptyEndLabel}>{t('form.endUnset')}</Text>
                  </Pressable>
                ) : (
                  <DateTimeField
                    mode="time"
                    accessibilityLabel={t('form.end')}
                    date={form.values.taskDate}
                    value={form.values.endTime}
                    onChange={next => form.setField('endTime', next)}
                  />
                )}
              </Field>
            </View>
          </View>

          <ChipRow>
            {DURATION_CHIPS.map(chip => (
              <Chip
                key={chip.key}
                label={t(chip.key)}
                selected={false}
                onPress={() => setEndFromDuration(chip.minutes)}
              />
            ))}
            <Chip
              label={t('form.noEndTime')}
              selected={form.values.endTime === null}
              onPress={() => form.setField('endTime', null)}
            />
          </ChipRow>

          <Field label={t('form.status')}>
            <Segmented<TaskStatus>
              accessibilityLabel={t('form.status')}
              value={form.values.status}
              onChange={next => form.setField('status', next)}
              options={[
                {value: 'processing', label: t('form.statusProcessing')},
                {value: 'done', label: t('form.statusDone')},
              ]}
            />
          </Field>

          <Field label={t('form.reminder')}>
            <View style={styles.switchRow}>
              {/* A word, not just a knob position (design/ux-ui-spec.md §4). */}
              <Text style={styles.switchLabel}>
                {form.values.reminderEnabled
                  ? t('form.reminderOn')
                  : t('form.reminderOff')}
              </Text>
              <Switch
                accessibilityLabel={t('form.reminder')}
                value={form.values.reminderEnabled}
                onValueChange={next => form.setField('reminderEnabled', next)}
              />
            </View>
            {form.values.reminderEnabled ? (
              <ChipRow>
                {REMINDER_OFFSETS.map(offset => (
                  <Chip
                    key={offset}
                    label={
                      offset === 0
                        ? t('form.reminderOnTime')
                        : t('form.reminderBefore', {minutes: offset})
                    }
                    selected={form.values.reminderOffsetMinutes === offset}
                    onPress={() =>
                      form.setField('reminderOffsetMinutes', offset)
                    }
                  />
                ))}
              </ChipRow>
            ) : null}
          </Field>

          <Field label={t('form.note')}>
            <TextInput
              accessibilityLabel={t('form.note')}
              value={form.values.note}
              onChangeText={next => form.setField('note', next)}
              multiline
              style={styles.textarea}
            />
          </Field>
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    fields: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    row: {
      flexDirection: 'row',
      // Wraps rather than clipping when the OS text size is turned up.
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    cell: {
      flexGrow: 1,
      flexBasis: 96,
    },
    input: {
      minHeight: TAP_TARGET_MIN,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      color: theme.color.onSurface,
      paddingHorizontal: theme.spacing.sm,
      ...theme.typography.body,
    },
    textarea: {
      minHeight: 72,
      borderWidth: 1,
      borderColor: theme.color.border,
      backgroundColor: theme.color.surface,
      color: theme.color.onSurface,
      padding: theme.spacing.sm,
      textAlignVertical: 'top',
      ...theme.typography.label,
    },
    emptyEnd: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.color.border,
    },
    emptyEndLabel: {
      ...theme.typography.body,
      color: theme.appColor.textMuted,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: TAP_TARGET_MIN,
    },
    switchLabel: {
      ...theme.typography.body,
      color: theme.color.onBackground,
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
