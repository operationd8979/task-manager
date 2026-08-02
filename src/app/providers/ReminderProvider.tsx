import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {AppState} from 'react-native';

import {DataError} from '../../services/db/errors';
import {createRecurrenceRepository} from '../../services/db/recurrenceRepository';
import {createTaskRepository} from '../../services/db/taskRepository';
import {createNotifeeScheduler} from '../../services/notifications/notifeeScheduler';
import {reconcileReminders} from '../../services/notifications/reconcile';
import type {
  ExactAlarmState,
  PermissionState,
  ReminderScheduler,
  ReminderTarget,
} from '../../services/notifications/scheduler';
import {useDatabase} from './DatabaseProvider';

export interface ReminderContextValue {
  notification: PermissionState;
  exactAlarm: ExactAlarmState;
  /**
   * Asks for permission the first time a reminder is switched on (FR-036a).
   * Returns whether notifications may be shown at all; a `false` here never
   * blocks saving the task (FR-039).
   */
  ensurePermission: () => Promise<boolean>;
  openSettings: (target: 'notifications' | 'exact-alarm') => Promise<void>;
  /** Re-derive the OS schedule from the data. Safe to call after any write. */
  sync: () => void;
  /** Set when a notification tap is waiting to be honoured (FR-043). */
  pendingTarget: ReminderTarget | null;
  clearPendingTarget: () => void;
}

const ReminderContext = createContext<ReminderContextValue | null>(null);

/**
 * Owns the reminder schedule.
 *
 * Reminders are DERIVED data: they are never the source of truth and can always
 * be rebuilt from tasks and rules. That is why every write path only has to
 * call `sync()` — reconciliation works out the difference, and doing it twice
 * costs nothing (FR-041).
 */
export function ReminderProvider({children}: {children: React.ReactNode}) {
  const {handle, errorLog} = useDatabase();
  const scheduler = useMemo<ReminderScheduler>(
    () => createNotifeeScheduler(),
    [],
  );
  const tasks = useMemo(() => createTaskRepository(handle), [handle]);
  const recurrence = useMemo(
    () => createRecurrenceRepository(handle),
    [handle],
  );

  const [notification, setNotification] =
    useState<PermissionState>('not-determined');
  const [exactAlarm, setExactAlarm] = useState<ExactAlarmState>({
    required: false,
    granted: true,
  });
  const [tick, setTick] = useState(0);
  const [pendingTarget, setPendingTarget] = useState<ReminderTarget | null>(
    null,
  );
  const running = useRef(false);

  const sync = useCallback(() => setTick(n => n + 1), []);

  const readPermissions = useCallback(async () => {
    const [next, alarm] = await Promise.all([
      scheduler.getNotificationPermission(),
      scheduler.getExactAlarmState(),
    ]);
    setNotification(next);
    setExactAlarm(alarm);
  }, [scheduler]);

  const ensurePermission = useCallback(async () => {
    const current = await scheduler.getNotificationPermission();
    const next =
      current === 'not-determined'
        ? await scheduler.requestNotificationPermission()
        : current;
    setNotification(next);

    // The exact-alarm prompt only makes sense once notifications are allowed.
    if (next === 'granted') {
      const alarm = await scheduler.getExactAlarmState();
      setExactAlarm(alarm);
    }
    return next === 'granted';
  }, [scheduler]);

  const openSettings = useCallback(
    async (target: 'notifications' | 'exact-alarm') => {
      await scheduler.openSystemSettings(target);
    },
    [scheduler],
  );

  // Runs on mount, on every foreground return, and after any write that calls
  // sync() (FR-040, FR-041). Also the guaranteed path for FR-042: a device
  // reboot clears alarms, and the next launch puts them back.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (running.current) {
        return;
      }
      running.current = true;
      try {
        await readPermissions();
        const [allTasks, rules, overrides] = await Promise.all([
          tasks.listAll(),
          recurrence.listAllRules(),
          recurrence.listAllOverrides(),
        ]);
        if (cancelled) {
          return;
        }
        await reconcileReminders(scheduler, {tasks: allTasks, rules, overrides});
      } catch (error) {
        // A reminder failure must never take down the screen that triggered it
        // (FR-044). It is recorded and the app carries on.
        errorLog.report({
          code: error instanceof DataError ? error.code : 'UNKNOWN',
          operation: 'reminder.reconcile',
        });
      } finally {
        running.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tick, scheduler, tasks, recurrence, errorLog, readPermissions]);

  // A tap that launched the app from cold, plus taps while it runs.
  useEffect(() => {
    let cancelled = false;
    scheduler
      .consumeLaunchTarget()
      .then(target => {
        if (!cancelled && target) {
          setPendingTarget(target);
        }
      })
      .catch(() => undefined);

    const unsubscribe = scheduler.onTap(setPendingTarget);
    // Principle VII: the subscription dies with the provider.
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [scheduler]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        sync();
      }
    });
    // Principle VII: the listener dies with the provider.
    return () => subscription.remove();
  }, [sync]);

  const value = useMemo<ReminderContextValue>(
    () => ({
      notification,
      exactAlarm,
      ensurePermission,
      openSettings,
      sync,
      pendingTarget,
      clearPendingTarget: () => setPendingTarget(null),
    }),
    [notification, exactAlarm, ensurePermission, openSettings, sync, pendingTarget],
  );

  return (
    <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>
  );
}

export function useReminders(): ReminderContextValue {
  const value = useContext(ReminderContext);
  if (!value) {
    throw new Error('useReminders called outside ReminderProvider');
  }
  return value;
}
