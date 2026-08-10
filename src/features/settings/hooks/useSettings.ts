import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '../../../app/providers/DatabaseProvider';
import type { AppSettings } from '../../../domain/settings';
import { DataError } from '../../../services/db/errors';
import { createRecurrenceRepository } from '../../../services/db/recurrenceRepository';
import { createSettingsRepository } from '../../../services/db/settingsRepository';
import { createTaskRepository } from '../../../services/db/taskRepository';

export type SettingsState =
	| { status: 'loading' }
	| { status: 'ready'; settings: AppSettings; taskCount: number }
	| { status: 'error' };

export interface UseSettings {
	state: SettingsState;
	/** Non-null while a write is in flight, so the row can lock. */
	saving: keyof AppSettings | null;
	saveFailed: keyof AppSettings | null;
	reload: () => void;
	update: <K extends keyof AppSettings>(
		key: K,
		value: AppSettings[K],
	) => Promise<void>;
	destroyAll: () => Promise<void>;
}

export function useSettings(): UseSettings {
	const { handle, errorLog, destroyAll: wipe } = useDatabase();
	const repository = useMemo(
		() => createSettingsRepository(handle),
		[handle],
	);
	const tasks = useMemo(() => createTaskRepository(handle), [handle]);
	const recurrence = useMemo(
		() => createRecurrenceRepository(handle),
		[handle],
	);

	const [state, setState] = useState<SettingsState>({ status: 'loading' });
	const [saving, setSaving] = useState<keyof AppSettings | null>(null);
	const [saveFailed, setSaveFailed] = useState<keyof AppSettings | null>(null);
	const [attempt, setAttempt] = useState(0);

	const reload = useCallback(() => setAttempt(n => n + 1), []);

	useEffect(() => {
		let cancelled = false;
		setState({ status: 'loading' });

		Promise.all([
			repository.getAll(),
			tasks.countAll(),
			// A series is one thing the user created, so it belongs in this count.
			// Counting only the tasks collection reported "0 công việc" to someone
			// whose whole schedule was recurring.
			recurrence.countAllRules(),
		])
			.then(([settings, taskCount, ruleCount]) => {
				if (!cancelled) {
					setState({ status: 'ready', settings, taskCount: taskCount + ruleCount });
				}
			})
			.catch((error: unknown) => {
				if (cancelled) {
					return;
				}
				errorLog.report({
					code: error instanceof DataError ? error.code : 'UNKNOWN',
					operation: 'settings.load',
				});
				setState({ status: 'error' });
			});

		return () => {
			cancelled = true;
		};
	}, [repository, tasks, recurrence, errorLog, attempt]);

	/**
	 * Optimistic, then confirmed.
	 *
	 * The control shows the new value immediately and locks; a failure puts the
	 * old value back and says so on that row rather than replacing the screen
	 * (design/ux-ui-spec.md §3, "Cài đặt / Đang lưu một tùy chọn").
	 */
	const update = useCallback(
		async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
			if (state.status !== 'ready') {
				return;
			}
			const previous = state.settings[key];
			setSaveFailed(null);
			setSaving(key);
			setState({ ...state, settings: { ...state.settings, [key]: value } });

			try {
				await repository.set(key, value);
			} catch (error) {
				errorLog.report({
					code: error instanceof DataError ? error.code : 'UNKNOWN',
					operation: 'settings.set',
					recordId: String(key),
				});
				setState(current =>
					current.status === 'ready'
						? { ...current, settings: { ...current.settings, [key]: previous } }
						: current,
				);
				setSaveFailed(key);
			} finally {
				setSaving(null);
			}
		},
		[state, repository, errorLog],
	);

	const destroyAll = useCallback(async () => {
		await wipe();
	}, [wipe]);

	return { state, saving, saveFailed, reload, update, destroyAll };
}
