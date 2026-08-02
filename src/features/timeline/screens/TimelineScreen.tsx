import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, Pressable, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {useDatabase} from '../../../app/providers/DatabaseProvider';
import {ErrorState} from '../../../components/ErrorState';
import {EmptyState} from '../../../components/EmptyState';
import {Skeleton, SkeletonGroup} from '../../../components/Skeleton';
import {Text} from '../../../components/Text';
import {DEFAULT_SETTINGS, type AppSettings} from '../../../domain/settings';
import type {Task} from '../../../domain/task';
import {addDays, today} from '../../../lib/date';
import {dayLabel} from '../../../lib/format';
import {t} from '../../../lib/strings';
import {createSettingsRepository} from '../../../services/db/settingsRepository';
import {createTaskRepository} from '../../../services/db/taskRepository';
import {appTheme} from '../../../theme/theme';
import {
  BAR_HEIGHT,
  LIST_BOTTOM_PADDING,
  ROW_MIN_HEIGHT,
} from '../../../theme/tokens';
import {TaskFormSheet} from '../../task-editor';
import {DatePickerSheet} from '../components/DatePickerSheet';
import {DayBar} from '../components/DayBar';
import {TaskRow} from '../components/TaskRow';
import {useDaySwipe} from '../hooks/useDaySwipe';
import {useTimelineDay} from '../hooks/useTimelineDay';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4', 's5', 's6'];

type Overlay =
  | {kind: 'none'}
  | {kind: 'calendar'}
  | {kind: 'form'; task?: Task};

export function TimelineScreen() {
  const navigation = useNavigation();
  const {handle} = useDatabase();
  const repository = useMemo(() => createTaskRepository(handle), [handle]);

  // The only navigation state worth remembering. Opening the app always lands
  // on today rather than restoring a previous day (design/ia §2).
  const [date, setDate] = useState(() => today());
  const [overlay, setOverlay] = useState<Overlay>({kind: 'none'});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const {state, reload} = useTimelineDay(date);

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

  // Recomputed per render rather than ticking: overdue is derived, and a timer
  // firing every minute would wake the JS thread for nothing.
  const now = useMemo(() => new Date(), []);

  const goPrevious = useCallback(() => setDate(d => addDays(d, -1)), []);
  const goNext = useCallback(() => setDate(d => addDays(d, 1)), []);
  const swipe = useDaySwipe({onPrevious: goPrevious, onNext: goNext});

  const closeOverlay = useCallback(() => setOverlay({kind: 'none'}), []);

  const toggleStatus = useCallback(
    (task: Task) => {
      const next = task.status === 'done' ? 'processing' : 'done';
      // Written immediately, never batched: the user may kill the app at any
      // moment and there is no sync to recover from (FR-046).
      repository.setStatus(task.id, next).then(reload).catch(reload);
    },
    [repository, reload],
  );

  const handleSaved = useCallback(
    (saved: Task) => {
      closeOverlay();
      // If the task landed on another day, follow it there — otherwise the user
      // saves something and appears to lose it (design/ia §5 F-2).
      if (saved.taskDate !== date) {
        setDate(saved.taskDate);
      } else {
        reload();
      }
    },
    [closeOverlay, date, reload],
  );

  const openSettings = useCallback(
    () => navigation.navigate('Settings'),
    [navigation],
  );

  const openCreate = useCallback(() => setOverlay({kind: 'form'}), []);
  const openEdit = useCallback(
    (task: Task) => setOverlay({kind: 'form', task}),
    [],
  );
  const openCalendar = useCallback(() => setOverlay({kind: 'calendar'}), []);
  const rowActionsPending = useCallback(() => {
    // Row actions arrive with US3 (T061).
  }, []);

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

      <GestureDetector gesture={swipe}>
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
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <TaskRow
                  task={item}
                  now={now}
                  onToggleStatus={toggleStatus}
                  onOpen={openEdit}
                  onMore={rowActionsPending}
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
