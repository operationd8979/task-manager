import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useDatabase} from '../../../app/providers/DatabaseProvider';
import {compareByStart, type Task} from '../../../domain/task';
import type {LocalDate} from '../../../lib/date';
import {createTaskRepository} from '../../../services/db/taskRepository';
import {DataError} from '../../../services/db/errors';

/** Every state Principle IV requires, as one union the screen switches on. */
export type TimelineState =
  | {status: 'loading'; slow: boolean}
  | {status: 'ready'; items: Task[]}
  | {status: 'empty'}
  | {status: 'error'};

/** After this long, the loading state says so rather than looking stuck. */
const SLOW_AFTER_MS = 3000;

export interface UseTimelineDay {
  state: TimelineState;
  reload: () => void;
}

export function useTimelineDay(date: LocalDate): UseTimelineDay {
  const {handle, errorLog} = useDatabase();
  const repository = useMemo(() => createTaskRepository(handle), [handle]);

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

    setState({status: 'loading', slow: false});
    const slowTimer = setTimeout(() => {
      if (!cancelled && id === requestId.current) {
        setState(current =>
          current.status === 'loading' ? {status: 'loading', slow: true} : current,
        );
      }
    }, SLOW_AFTER_MS);

    (async () => {
      try {
        const tasks = await repository.listByDate(date);
        if (cancelled || id !== requestId.current) {
          return;
        }
        // The index already returns start-time order; this settles ties
        // deterministically so the list never reshuffles between reads.
        const items = [...tasks].sort(compareByStart);
        setState(items.length === 0 ? {status: 'empty'} : {status: 'ready', items});
      } catch (error) {
        if (cancelled || id !== requestId.current) {
          return;
        }
        // Principle IV: a failure either reaches the user or the log. Here it
        // does both — the state is visible and the code is recorded.
        void errorLog.record({
          code: error instanceof DataError ? error.code : 'UNKNOWN',
          operation: 'timeline.load',
        });
        setState({status: 'error'});
      }
    })();

    // Principle VII: the timer and the in-flight read must not outlive the day
    // they belong to, or a fast day-swipe leaves both running.
    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, [date, repository, errorLog, attempt]);

  return {state, reload};
}
