import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDatabase } from '../../../app/providers/DatabaseProvider';
import { buildOccurrences } from '../../../domain/occurrence';
import type { TaskStatus } from '../../../domain/task';
import {
	compareItems,
	fromOccurrence,
	fromTask,
	type TimelineItem,
} from '../../../domain/timeline';
import type { LocalDate } from '../../../lib/date';
import { haptic } from '../../../lib/haptics';
import { DataError } from '../../../services/db/errors';
import { createRecurrenceRepository } from '../../../services/db/recurrenceRepository';
import { createTaskRepository } from '../../../services/db/taskRepository';

/** Every state Principle IV requires, as one union the screen switches on. */
export type TimelineState =
	| { status: 'loading'; slow: boolean }
	| { status: 'ready'; items: TimelineItem[] }
	| { status: 'empty' }
	| { status: 'error' };

/** After this long, the loading state says so rather than looking stuck. */
const SLOW_AFTER_MS = 3000;

export interface UseTimelineDay {
	state: TimelineState;
	reload: () => void;
	setStatus: (item: TimelineItem, next: TaskStatus) => void;
}

export function useTimelineDay(date: LocalDate): UseTimelineDay {
	const { handle, errorLog } = useDatabase();
	const tasks = useMemo(() => createTaskRepository(handle), [handle]);
	const recurrence = useMemo(
		() => createRecurrenceRepository(handle),
		[handle],
	);

	const [state, setState] = useState<TimelineState>({
		status: 'loading',
		slow: false,
	});
	const [attempt, setAttempt] = useState(0);

	const reload = useCallback(() => setAttempt(n => n + 1), []);

	// Guards against a slower earlier request overwriting a newer day's result.
	const requestId = useRef(0);

	useEffect(() => {
		const id = ++requestId.current;
		let cancelled = false;

		setState({ status: 'loading', slow: false });
		const slowTimer = setTimeout(() => {
			if (!cancelled && id === requestId.current) {
				setState(current =>
					current.status === 'loading'
						? { status: 'loading', slow: true }
						: current,
				);
			}
		}, SLOW_AFTER_MS);

		(async () => {
			try {
				// Three reads, all scoped to this one day. Occurrences are computed,
				// never stored (FR-023), and never for a range (SC-004).
				const [dayTasks, rules, overrides] = await Promise.all([
					tasks.listByDate(date),
					recurrence.listRulesEffectiveOn(date),
					recurrence.listOverridesOn(date),
				]);
				if (cancelled || id !== requestId.current) {
					return;
				}

				const ruleById = new Map(rules.map(rule => [rule.id, rule]));
				const items = [
					...dayTasks.map(fromTask),
					...buildOccurrences(rules, overrides, date).flatMap(occurrence => {
						const rule = ruleById.get(occurrence.ruleId);
						return rule ? [fromOccurrence(occurrence, rule)] : [];
					}),
				].sort(compareItems);

				setState(
					items.length === 0 ? { status: 'empty' } : { status: 'ready', items },
				);
			} catch (error) {
				if (cancelled || id !== requestId.current) {
					return;
				}
				// Principle IV: a failure either reaches the user or the log. Here it
				// does both — the state is visible and the code is recorded.
				errorLog.report({
					code: error instanceof DataError ? error.code : 'UNKNOWN',
					operation: 'timeline.load',
				});
				setState({ status: 'error' });
			}
		})();

		// Principle VII: the timer and the in-flight read must not outlive the day
		// they belong to, or a fast day-swipe leaves both running.
		return () => {
			cancelled = true;
			clearTimeout(slowTimer);
		};
	}, [date, tasks, recurrence, errorLog, attempt]);

	/**
	 * Optimistic status change (SC-005: the UI must answer in under 0.1s).
	 *
	 * For an occurrence this writes an override — and deliberately does NOT ask
	 * about scope. Status always belongs to the one session (FR-026a, FR-032);
	 * asking every time would turn the most frequent action in the app into two
	 * steps and train the user to tap through it.
	 */
	const setStatus = useCallback(
		(item: TimelineItem, next: TaskStatus) => {
			const apply = (status: TaskStatus) =>
				setState(current =>
					current.status === 'ready'
						? {
							status: 'ready',
							items: current.items.map(row =>
								row.key === item.key ? { ...row, status } : row,
							),
						}
						: current,
				);

			apply(next);
			if (next === 'done') {
				haptic('medium');
			}

			const write =
				item.source.kind === 'task'
					? tasks.setStatus(item.source.taskId, next)
					: recurrence.upsertOverride(item.source.ruleId, item.source.date, {
						status: next,
					});

			// Written immediately, never batched: the user can kill the app at any
			// moment and there is no sync to recover from (FR-046).
			write.catch((error: unknown) => {
				apply(item.status);
				haptic('warning');
				errorLog.report({
					code: error instanceof DataError ? error.code : 'UNKNOWN',
					operation: 'timeline.setStatus',
					recordId: item.key,
				});
			});
		},
		[tasks, recurrence, errorLog],
	);

	return { state, reload, setStatus };
}
