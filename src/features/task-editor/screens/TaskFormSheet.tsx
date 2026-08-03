import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, Switch, TextInput, View} from 'react-native';
import type {BottomSheetScrollViewMethods} from '@gorhom/bottom-sheet';
import {StyleSheet} from 'react-native-unistyles';

import {useReminders} from '../../../app/providers/ReminderProvider';
import {Chip, ChipRow} from '../../../components/Chip';
import {ErrorState} from '../../../components/ErrorState';
import {Segmented} from '../../../components/Segmented';
import {Sheet} from '../../../components/Sheet';
import {Text} from '../../../components/Text';
import {
  isInPast,
  reminderFireAt,
  REMINDER_OFFSETS,
  type ReminderOffset,
} from '../../../domain/reminder';
import type {Task, TaskStatus} from '../../../domain/task';
import {minutesOf, timeFromMinutes, type LocalDate} from '../../../lib/date';
import {weekdayShort} from '../../../lib/format';
import {t, type StringKey} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {BAR_HEIGHT, TAP_TARGET_MIN} from '../../../theme/tokens';
import {DateTimeField} from '../components/DateTimeField';
import {Field} from '../components/Field';
import {RecurrenceSheet} from '../components/RecurrenceSheet';
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
  onSaved: (savedDate: LocalDate) => void;
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
  // The sheet owns the scrolling now, so this reaches into it rather than
  // wrapping the fields in a second scroll view.
  const scroll = useRef<BottomSheetScrollViewMethods>(null);
  const saving = form.save.status === 'saving';
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [editingRepeat, setEditingRepeat] = useState(false);
  const reminders = useReminders();

  /**
   * Turning the switch on is the ONE moment permission is requested (FR-036a).
   * A refusal never blocks the save — the app does what it can and says plainly
   * what it cannot guarantee (FR-039).
   */
  const setReminderEnabled = useCallback(
    (next: boolean) => {
      form.setField('reminderEnabled', next);
      if (next) {
        reminders.ensurePermission().catch(() => undefined);
      }
    },
    [form, reminders],
  );

  const fireAt = reminderFireAt({
    reminderEnabled: form.values.reminderEnabled,
    reminderOffsetMinutes: form.values.reminderOffsetMinutes,
    taskDate: form.values.taskDate,
    startTime: form.values.startTime,
  });
  const reminderInPast = fireAt !== null && isInPast(fireAt, new Date());
  const mayBeLate =
    form.values.reminderEnabled &&
    reminders.exactAlarm.required &&
    !reminders.exactAlarm.granted;

  /**
   * FR-013: leaving with unsaved edits has to be a decision, not an accident.
   * Three ways out, because "save" and "discard" alone force a choice the user
   * may not be ready to make.
   */
  const requestClose = useCallback(() => {
    if (form.dirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }, [form.dirty, onClose]);

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
      onClose={requestClose}
      scrollRef={scroll}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityState={{disabled: saving}}
          accessibilityLabel={
            saving ? t('form.saving') : task ? t('form.saveEdit') : t('form.save')
          }
          disabled={saving}
          onPress={form.submit}
          style={styles.primary}>
          <Text style={styles.primaryLabel}>
            {saving ? t('form.saving') : task ? t('form.saveEdit') : t('form.save')}
          </Text>
        </Pressable>
      }>
      {confirmDiscard ? (
        <View accessibilityRole="alert" style={styles.unsaved}>
          <Text style={styles.unsavedTitle}>{t('unsaved.title')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unsaved.saveAndClose')}
            onPress={() => {
              setConfirmDiscard(false);
              form.submit();
            }}
            style={styles.unsavedChoice}>
            <Text style={styles.unsavedLabel}>{t('unsaved.saveAndClose')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unsaved.keepEditing')}
            onPress={() => setConfirmDiscard(false)}
            style={styles.unsavedChoice}>
            <Text style={styles.unsavedLabel}>{t('unsaved.keepEditing')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('unsaved.discard')}
            onPress={onClose}
            style={styles.unsavedChoice}>
            <Text style={styles.unsavedDiscard}>{t('unsaved.discard')}</Text>
          </Pressable>
        </View>
      ) : null}

      <>
        {form.save.status === 'failed' ? (
          <ErrorState
            title={t('save.failedTitle')}
            body={t('timeline.errorBody')}
            retryLabel={t('save.retry')}
            onRetry={form.submit}
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

          {/* Creating a series is a different write path, so the row is only
              offered on a new task. Converting an existing task into a series
              is not specified anywhere and would silently move its data. */}
          {task === undefined ? (
            <Field label={t('form.repeat')}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('form.repeat')}
                onPress={() => setEditingRepeat(true)}
                style={styles.repeatRow}>
                <Text style={styles.repeatValue}>
                  {form.values.recurrence === null
                    ? t('form.noRepeat')
                    : t('repeat.summary', {
                        days: [...form.values.recurrence.daysOfWeek]
                          .sort((a, b) => a - b)
                          .map(weekdayShort)
                          .join(', '),
                        time: form.values.startTime,
                      })}
                </Text>
              </Pressable>
            </Field>
          ) : null}

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
                onValueChange={setReminderEnabled}
              />
            </View>
            {/* A block that stays put, not a toast that disappears
                (design/ux-ui-spec.md §4). */}
            {mayBeLate ? (
              <View style={styles.reminderWarning}>
                <Text style={styles.reminderWarningText}>
                  {t('permission.inexactBody')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('permission.grant')}
                  onPress={() => {
                    reminders
                      .openSettings('exact-alarm')
                      .catch(() => undefined);
                  }}
                  style={styles.reminderWarningAction}>
                  <Text style={styles.reminderWarningLink}>
                    {t('permission.grant')}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* FR-038: the app will not schedule a moment that has passed, and
                says so rather than letting the OS fire it immediately. */}
            {reminderInPast ? (
              <Text style={styles.reminderWarningText}>
                {t('validate.reminderInPast')}
              </Text>
            ) : null}

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
      </>

      {editingRepeat ? (
        <RecurrenceSheet
          value={form.values.recurrence}
          startTime={form.values.startTime}
          defaultStartDate={form.values.taskDate}
          onDone={next => {
            form.setField('recurrence', next);
            setEditingRepeat(false);
          }}
          onClose={() => setEditingRepeat(false)}
        />
      ) : null}
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
    reminderWarning: {
      borderWidth: 1,
      borderColor: theme.appColor.accentInk,
      backgroundColor: theme.appColor.accentSoft,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    reminderWarningText: {
      ...theme.typography.label,
      color: theme.appColor.accentInk,
    },
    reminderWarningAction: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
    },
    reminderWarningLink: {
      ...theme.typography.body,
      color: theme.appColor.accentInk,
      fontWeight: '800',
    },
    repeatRow: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.color.border,
      paddingHorizontal: theme.spacing.sm,
    },
    repeatValue: {
      ...theme.typography.body,
      color: theme.color.onBackground,
    },
    unsaved: {
      borderWidth: 2,
      borderColor: theme.appColor.accentInk,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    unsavedTitle: {
      ...theme.typography.body,
      color: theme.color.onBackground,
      fontWeight: '800',
    },
    unsavedChoice: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
    },
    unsavedLabel: {
      ...theme.typography.body,
      color: theme.color.onBackground,
    },
    unsavedDiscard: {
      ...theme.typography.body,
      color: theme.appColor.accentInk,
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
