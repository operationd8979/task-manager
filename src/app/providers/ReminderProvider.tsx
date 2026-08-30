import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { AppState } from 'react-native';
import { canDisplay } from '@chipmobilesdk/rn-notification';

import { DataError } from '../../services/db/errors';
import { createRecurrenceRepository } from '../../services/db/recurrenceRepository';
import { createTaskRepository } from '../../services/db/taskRepository';
import { reconcileReminders } from '../../services/notifications/reconcile';
import { decodeTarget } from '../../services/notifications/routing';
import {
	getNotifications,
	setNotificationDiagnosticSink,
} from '../../services/notifications/runtime';
import {
	toDisplayPermission,
	toExactAlarmState,
	type ExactAlarmState,
	type PermissionState,
	type ReminderTarget,
} from '../../services/notifications/types';
import { useDatabase } from './DatabaseProvider';

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
 * call `sync()` — the SDK's reconciliation works out the difference, and doing
 * it twice costs nothing (FR-041).
 */
export function ReminderProvider({ children }: { children: React.ReactNode }) {
	const { handle, errorLog } = useDatabase();
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

	// The SDK reports through a sink rather than a console, and the error log
	// lives on the database handle — so the wiring happens here, where both
	// exist. FR-055b holds: a diagnostic event carries a code and context, never
	// notification content.
	useEffect(() => {
		setNotificationDiagnosticSink(event => {
			errorLog.report({ code: event.code, operation: 'reminder.sdk' });
		});
		// Principle VII: the sink dies with the provider.
		return () => setNotificationDiagnosticSink(null);
	}, [errorLog]);

	const readPermissions = useCallback(async () => {
		const service = await getNotifications();
		const report = await service.permissions.getPermissions();
		setNotification(toDisplayPermission(report.display));
		setExactAlarm(toExactAlarmState(report.exactAlarm));
	}, []);

	const ensurePermission = useCallback(async () => {
		const service = await getNotifications();
		const current = await service.permissions.getPermissions();

		// Asked only when the user first turns a reminder on, never at first
		// launch (FR-036a) — asking before they state the intent is the surest way
		// to be refused, permanently.
		const display =
			current.display === 'notAsked'
				? await service.permissions.requestDisplayPermission()
				: current.display;
		setNotification(toDisplayPermission(display));

		// The exact-alarm state only matters once notifications are allowed.
		if (canDisplay(display)) {
			const after = await service.permissions.getPermissions();
			setExactAlarm(toExactAlarmState(after.exactAlarm));
		}
		return canDisplay(display);
	}, []);

	const openSettings = useCallback(
		async (target: 'notifications' | 'exact-alarm') => {
			const service = await getNotifications();
			await service.permissions.openSettings(
				target === 'exact-alarm' ? 'exactAlarm' : 'display',
			);
		},
		[],
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
				const service = await getNotifications();
				await readPermissions();
				// Additive only — window refresh, re-anchoring after a time-zone
				// change, and a pending-set check. It can never cancel a reminder.
				await service.runMaintenance();

				const [allTasks, rules, overrides] = await Promise.all([
					tasks.listAll(),
					recurrence.listAllRules(),
					recurrence.listAllOverrides(),
				]);
				if (cancelled) {
					return;
				}
				await reconcileReminders(service, {
					tasks: allTasks,
					rules,
					overrides,
				});
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
	}, [tick, tasks, recurrence, errorLog, readPermissions]);

	// One handler for foreground, background and cold start. A tap that arrived
	// before this registered — including one that launched the app from dead —
	// was buffered durably by the SDK and is drained on registration.
	useEffect(() => {
		let cancelled = false;
		let unsubscribe: (() => void) | null = null;

		getNotifications()
			.then(service => {
				if (cancelled) {
					return;
				}
				unsubscribe = service.interactions.onInteraction(event => {
					if (event.kind !== 'tap') {
						return;
					}
					const target = decodeTarget(event.routing);
					if (target) {
						setPendingTarget(target);
					} else {
						// A notification pointing at deleted data is an ordinary
						// condition, not a crash. The timeline falls back to today.
						service.interactions.reportTargetMissing({
							notificationId: event.notificationId,
						});
					}
				});
			})
			.catch(() => undefined);

		// Principle VII: the subscription dies with the provider.
		return () => {
			cancelled = true;
			unsubscribe?.();
		};
	}, []);

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
