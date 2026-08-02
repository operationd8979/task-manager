import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {useDatabase} from '../../../app/providers/DatabaseProvider';
import {useReminders} from '../../../app/providers/ReminderProvider';
import {useUndo} from '../../../app/providers/UndoProvider';
import {ErrorState} from '../../../components/ErrorState';
import {EmptyState} from '../../../components/EmptyState';
import {Skeleton, SkeletonGroup} from '../../../components/Skeleton';
import {Text} from '../../../components/Text';
import {DEFAULT_SETTINGS, type AppSettings} from '../../../domain/settings';
import type {Task} from '../../../domain/task';
import type {RecurringRule} from '../../../domain/recurrence';
import type {TimelineItem} from '../../../domain/timeline';
import {addDays, today, type LocalTime} from '../../../lib/date';
import {dayLabel} from '../../../lib/format';
import {t} from '../../../lib/strings';
import {createRecurrenceRepository} from '../../../services/db/recurrenceRepository';
import {createSettingsRepository} from '../../../services/db/settingsRepository';
import {createTaskRepository} from '../../../services/db/taskRepository';
import {appTheme} from '../../../theme/theme';
import {
  BAR_HEIGHT,
  LIST_BOTTOM_PADDING,
  ROW_MIN_HEIGHT,
} from '../../../theme/tokens';
import {
  RowActionsSheet,
  ScopeSheet,
  TaskFormSheet,
  TimeShiftSheet,
  type ApplyScope,
  type RowAction,
} from '../../task-editor';
import {DatePickerSheet} from '../components/DatePickerSheet';
import {DayBar} from '../components/DayBar';
import {TaskRow} from '../components/TaskRow';
import {useDaySwipe} from '../hooks/useDaySwipe';
import {useTimelineDay} from '../hooks/useTimelineDay';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4', 's5', 's6'];

type Overlay =
  | {kind: 'none'}
  | {kind: 'calendar'}
  | {kind: 'form'; task?: Task}
  | {kind: 'actions'; item: TimelineItem}
  | {kind: 'shift'; task: Task; mode: 'time' | 'move'};

export function TimelineScreen() {
  const navigation = useNavigation();
  const {handle} = useDatabase();
  const undo = useUndo();
  const reminders = useReminders();
  const repository = useMemo(() => createTaskRepository(handle), [handle]);
  const recurrence = useMemo(
    () => createRecurrenceRepository(handle),
    [handle],
  );

  // The only navigation state worth remembering. Opening the app always lands
  // on today rather than restoring a previous day (design/ia §2).
  const [date, setDate] = useState(() => today());
  const [overlay, setOverlay] = useState<Overlay>({kind: 'none'});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  /** A write against a recurring session, waiting on the scope answer. */
  const [pendingScope, setPendingScope] = useState<{
    rule: RecurringRule;
    date: string;
    title: string;
    action: {kind: 'shiftTime'; startTime: LocalTime} | {kind: 'delete'};
  } | null>(null);

  const {state, reload, setStatus} = useTimelineDay(date);

  useEffect(() => {
    let cancelled = false;
    createSettingsRepository(handle)
      .getAll()
      .then(next => {
        if (!cancelled) {
          setSettings(next);
        }
      })
      // Settings have working defaults, so a read failure degrades rather than
      // blocks; the Settings screen is where it is surfaced and retried.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [handle]);

  /**
   * A notification tap moves the timeline to that day (FR-043).
   *
   * If the record is gone the day simply shows what it has — falling back to
   * today rather than reporting an error, because a notification outliving its
   * task is ordinary, not exceptional.
   */
  useEffect(() => {
    const target = reminders.pendingTarget;
    if (!target) {
      return;
    }
    setDate(target.taskDate || today());
    reminders.clearPendingTarget();
  }, [reminders]);

  // Recomputed per render rather than ticking: overdue is derived, and a timer
  // firing every minute would wake the JS thread for nothing.
  const now = useMemo(() => new Date(), []);

  const goPrevious = useCallback(() => setDate(d => addDays(d, -1)), []);
  const goNext = useCallback(() => setDate(d => addDays(d, 1)), []);
  const swipe = useDaySwipe({onPrevious: goPrevious, onNext: goNext});

  const closeOverlay = useCallback(() => setOverlay({kind: 'none'}), []);

  const toggleStatus = useCallback(
    (item: TimelineItem) => {
      // Optimistic: the row flips before the write lands, and rolls back if it
      // fails. See useTimelineDay.setStatus (SC-005).
      setStatus(item, item.status === 'done' ? 'processing' : 'done');
    },
    [setStatus],
  );

  /**
   * Resolves a task-backed row to its record before opening a sheet.
   *
   * Occurrence rows fall through: every write to one has to pass the
   * apply-scope sheet first (FR-026), which arrives with US5. Doing nothing is
   * the correct interim behaviour — silently editing the whole series is the
   * failure this feature exists to prevent. Status toggling still works,
   * because that path never asks about scope (FR-026a).
   */
  const withTask = useCallback(
    (item: TimelineItem, open: (task: Task) => void) => {
      if (item.source.kind !== 'task') {
        return;
      }
      const {taskId} = item.source;
      repository
        .find(taskId)
        .then(found => {
          if (found) {
            open(found);
          }
        })
        .catch(reload);
    },
    [repository, reload],
  );

  /**
   * Opens the scope sheet for a write against a recurring session.
   *
   * It appears AFTER the user has committed the edit and immediately before the
   * write — asking sooner would ask before they know what they are changing
   * (design/ia §5 F-3).
   */
  const askScope = useCallback(
    (
      item: TimelineItem,
      action: {kind: 'shiftTime'; startTime: LocalTime} | {kind: 'delete'},
    ) => {
      if (item.source.kind !== 'occurrence') {
        return;
      }
      const {ruleId, date: occurrenceDate} = item.source;
      recurrence
        .findRule(ruleId)
        .then(rule => {
          if (rule) {
            setPendingScope({
              rule,
              date: occurrenceDate,
              title: item.title,
              action,
            });
          }
        })
        .catch(reload);
    },
    [recurrence, reload],
  );

  const shiftTime = useCallback(
    (item: TimelineItem, nextStart: LocalTime) => {
      if (item.source.kind === 'occurrence') {
        askScope(item, {kind: 'shiftTime', startTime: nextStart});
        return;
      }
      repository
        .update(item.source.taskId, {startTime: nextStart})
        .then(reload)
        .catch(reload);
    },
    [repository, reload, askScope],
  );

  const applyScope = useCallback(
    (scope: ApplyScope) => {
      const pending = pendingScope;
      if (!pending) {
        return;
      }
      setPendingScope(null);
      const {rule, date: occurrenceDate, action} = pending;

      if (action.kind === 'shiftTime') {
        const previous = rule.defaultStartTime;
        const write =
          scope === 'thisOnly'
            ? recurrence.upsertOverride(rule.id, occurrenceDate, {
                startTime: action.startTime,
              })
            : recurrence
                .updateRule(rule.id, {defaultStartTime: action.startTime})
                .then(() => undefined);

        write
          .then(() => {
            reload();
            // The toast restates the scope that was applied, because that is
            // the thing the user most needs to confirm (ux-ui-spec §4).
            undo.offer({
              message: t(
                scope === 'thisOnly'
                  ? 'undo.scopeThisOnly'
                  : 'undo.scopeWholeSeries',
                {change: t('scope.changedTime', {time: action.startTime})},
              ),
              undo: async () => {
                if (scope === 'thisOnly') {
                  await recurrence.clearOverride(rule.id, occurrenceDate);
                } else {
                  await recurrence.updateRule(rule.id, {
                    defaultStartTime: previous,
                  });
                }
                reload();
              },
              commit: async () => undefined,
            });
          })
          .catch(reload);
        return;
      }

      if (scope === 'thisOnly') {
        recurrence
          .upsertOverride(rule.id, occurrenceDate, {isSkipped: true})
          .then(() => {
            reload();
            undo.offer({
              message: t('undo.scopeThisOnly', {change: t('scope.skipped')}),
              undo: async () => {
                await recurrence.clearOverride(rule.id, occurrenceDate);
                reload();
              },
              commit: async () => undefined,
            });
          })
          .catch(reload);
        return;
      }

      // Deleting a whole series is a hard cascade, so no undo is offered.
      // Every other branch here is reversible; pretending this one is too
      // would be worse than saying nothing.
      recurrence.deleteRuleCascade(rule.id).then(reload).catch(reload);
    },
    [pendingScope, recurrence, reload, undo],
  );

  /**
   * Delete is immediate, with undo instead of a confirmation step (FR-011).
   *
   * Soft delete is what makes both halves true at once: the row leaves every
   * read straight away, the write is already on disk (FR-046), and undo is a
   * restore rather than a rebuild from memory.
   */
  const deleteTask = useCallback(
    (task: Task) => {
      closeOverlay();
      repository
        .softDelete(task.id)
        .then(() => {
          reload();
          undo.offer({
            message: t('undo.deleted', {title: task.title}),
            undo: async () => {
              await repository.restore(task.id);
              reload();
              // Reminders are derived data, so putting the record back and
              // re-deriving IS restoring them (FR-011a, T060).
              reminders.sync();
            },
            commit: async () => {
              await repository.purge(task.id);
              reminders.sync();
            },
          });
        })
        .catch(reload);
    },
    [repository, reload, undo, closeOverlay, reminders],
  );

  const handleAction = useCallback(
    (item: TimelineItem, action: RowAction) => {
      closeOverlay();
      if (item.source.kind === 'occurrence') {
        if (action === 'delete') {
          askScope(item, {kind: 'delete'});
        } else if (action === 'shiftTime') {
          // Reuses the same scope sheet the drag path goes through, so both
          // routes reach the same decision (FR-018c).
          askScope(item, {kind: 'shiftTime', startTime: item.startTime});
        }
        return;
      }
      withTask(item, task => {
        switch (action) {
          case 'shiftTime':
            setOverlay({kind: 'shift', task, mode: 'time'});
            break;
          case 'move':
            setOverlay({kind: 'shift', task, mode: 'move'});
            break;
          case 'edit':
            setOverlay({kind: 'form', task});
            break;
          case 'delete':
            deleteTask(task);
            break;
        }
      });
    },
    [deleteTask, withTask, askScope, closeOverlay],
  );

  const applyShift = useCallback(
    (task: Task, next: {taskDate: string; startTime: LocalTime}) => {
      closeOverlay();
      repository
        .update(task.id, next)
        .then(() => {
          // Follow the task if it left the day being viewed, for the same
          // reason saving does (design/ia §5 F-2).
          if (next.taskDate !== date) {
            setDate(next.taskDate);
          } else {
            reload();
          }
        })
        .catch(reload);
    },
    [repository, reload, date, closeOverlay],
  );

  const handleSaved = useCallback(
    (savedDate: string) => {
      closeOverlay();
      // Reminders are derived, so every write only has to ask for a re-derive.
      reminders.sync();
      // Follow the record if it landed on another day — otherwise the user
      // saves something and appears to lose it (design/ia §5 F-2).
      if (savedDate !== date) {
        setDate(savedDate);
      } else {
        reload();
      }
    },
    [closeOverlay, date, reload, reminders],
  );

  const openSettings = useCallback(
    () => navigation.navigate('Settings'),
    [navigation],
  );

  const openCreate = useCallback(() => setOverlay({kind: 'form'}), []);
  const openEdit = useCallback(
    (item: TimelineItem) =>
      withTask(item, task => setOverlay({kind: 'form', task})),
    [withTask],
  );
  const openActions = useCallback(
    (item: TimelineItem) => setOverlay({kind: 'actions', item}),
    [],
  );
  const openCalendar = useCallback(() => setOverlay({kind: 'calendar'}), []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DayBar
        date={date}
        label={dayLabel(date)}
        onPrevious={goPrevious}
        onNext={goNext}
        onOpenCalendar={openCalendar}
        onOpenSettings={openSettings}
      />

      {/* In the flow, directly under the day bar — not a modal. The state is
          still true tomorrow, so there is nothing to dismiss (FR-039). */}
      {reminders.notification === 'denied' ? (
        <ErrorState
          title={t('permission.deniedTitle')}
          body={t('permission.deniedBody')}
          retryLabel={t('permission.openSettings')}
          onRetry={() => {
            reminders.openSettings('notifications').catch(() => undefined);
          }}
        />
      ) : null}

      <GestureDetector gesture={swipe.gesture}>
        <View style={styles.body}>
          {state.status === 'loading' ? (
            <SkeletonGroup>
              <View style={styles.skeletonList}>
                {SKELETON_ROWS.map(key => (
                  <Skeleton key={key} height={ROW_MIN_HEIGHT.oneLabel} />
                ))}
              </View>
              {state.slow ? (
                <Text style={styles.slow}>{t('timeline.loadingSlow')}</Text>
              ) : null}
            </SkeletonGroup>
          ) : null}

          {state.status === 'empty' ? (
            <EmptyState
              title={t('timeline.emptyTitle')}
              body={t('timeline.emptyBody')}
              actionLabel={t('timeline.newTask')}
              onAction={openCreate}
            />
          ) : null}

          {state.status === 'error' ? (
            <ErrorState
              title={t('timeline.errorTitle')}
              body={t('timeline.errorBody')}
              retryLabel={t('timeline.retry')}
              onRetry={reload}
              secondaryLabel={t('day.settings')}
              onSecondary={openSettings}
            />
          ) : null}

          {state.status === 'ready' ? (
            <FlatList
              data={state.items}
              keyExtractor={item => item.key}
              renderItem={({item}) => (
                <TaskRow
                  task={item}
                  now={now}
                  onToggleStatus={toggleStatus}
                  onOpen={openEdit}
                  onMore={openActions}
                  onShiftTime={shiftTime}
                  remindersMayBeLate={
                    reminders.exactAlarm.required &&
                    !reminders.exactAlarm.granted
                  }
                  swipeRef={swipe.ref}
                />
              )}
              contentContainerStyle={styles.listContent}
              // No entrance animations, no shadows: the list has to hold 60 FPS
              // on a low-end device (SC-006).
              removeClippedSubviews
            />
          ) : null}
        </View>
      </GestureDetector>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('timeline.newTask')}
        onPress={openCreate}
        style={styles.action}>
        <Text style={styles.actionLabel}>{t('timeline.newTask')}</Text>
      </Pressable>

      {overlay.kind === 'form' ? (
        <TaskFormSheet
          task={overlay.task}
          viewingDate={date}
          defaultReminderOffset={settings.defaultReminderOffset}
          onSaved={handleSaved}
          onClose={closeOverlay}
        />
      ) : null}

      {overlay.kind === 'actions' ? (
        <RowActionsSheet
          title={overlay.item.title}
          isOccurrence={overlay.item.source.kind === 'occurrence'}
          onAction={action => handleAction(overlay.item, action)}
          onClose={closeOverlay}
        />
      ) : null}

      {pendingScope ? (
        <ScopeSheet
          rule={pendingScope.rule}
          date={pendingScope.date}
          title={pendingScope.title}
          onChoose={applyScope}
          onCancel={() => setPendingScope(null)}
        />
      ) : null}

      {overlay.kind === 'shift' ? (
        <TimeShiftSheet
          task={overlay.task}
          mode={overlay.mode}
          onApply={next => applyShift(overlay.task, next)}
          onClose={closeOverlay}
        />
      ) : null}

      {overlay.kind === 'calendar' ? (
        <DatePickerSheet
          selected={date}
          firstDayOfWeek={settings.firstDayOfWeek}
          onSelect={next => {
            setDate(next);
            closeOverlay();
          }}
          onClose={closeOverlay}
        />
      ) : null}
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
    skeletonList: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    slow: {
      ...theme.typography.label,
      color: theme.appColor.textMuted,
      paddingHorizontal: theme.spacing.md,
    },
    listContent: {
      paddingBottom: LIST_BOTTOM_PADDING,
    },
    action: {
      minHeight: BAR_HEIGHT.action,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.appColor.accentFill,
    },
    actionLabel: {
      ...theme.typography.body,
      color: theme.appColor.onAccent,
      fontWeight: '800',
    },
  };
});
