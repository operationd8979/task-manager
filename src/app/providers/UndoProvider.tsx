import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {Toast} from '../../components/Toast';
import {t} from '../../lib/strings';
import {DataError} from '../../services/db/errors';
import {useDatabase} from './DatabaseProvider';

/** FR-011a: the undo affordance is available for at least five seconds. */
export const UNDO_WINDOW_MS = 5000;

export interface UndoOffer {
  /** Already-written sentence, e.g. "Đã xóa Gọi khách hàng Minh." */
  message: string;
  /** Puts the record back, including its reminders. */
  undo: () => Promise<void>;
  /** Makes the change permanent once the window closes. */
  commit: () => Promise<void>;
}

interface UndoContextValue {
  offer: (offer: UndoOffer) => void;
}

const UndoContext = createContext<UndoContextValue | null>(null);

/**
 * Lives above the navigator, not inside a screen.
 *
 * That placement is the whole point: FR-011a says the undo action must not be
 * swallowed when the user changes day or opens another screen. Owned by
 * TimelineScreen it would unmount on both.
 */
export function UndoProvider({children}: {children: React.ReactNode}) {
  const {errorLog} = useDatabase();
  const [pending, setPending] = useState<UndoOffer | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kept in a ref as well so the timeout callback never closes over stale state.
  const pendingRef = useRef<UndoOffer | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /**
   * Principle IV: a failure reaches the user or the log, never neither.
   *
   * Undo and commit both touch storage and can fail. There is no useful screen
   * state to move to — the toast is already gone — so the log is where it goes.
   */
  const run = useCallback(
    (action: () => Promise<void>, operation: string) => {
      action().catch((error: unknown) => {
        errorLog.report({
          code: error instanceof DataError ? error.code : 'UNKNOWN',
          operation,
        });
      });
    },
    [errorLog],
  );

  const settle = useCallback(
    (action: 'undo' | 'commit') => {
      const current = pendingRef.current;
      if (!current) {
        return;
      }
      clearTimer();
      pendingRef.current = null;
      setPending(null);
      run(
        action === 'undo' ? current.undo : current.commit,
        `undo.${action}`,
      );
    },
    [clearTimer, run],
  );

  const offer = useCallback(
    (next: UndoOffer) => {
      // Only one offer can be pending. A second delete must not silently drop
      // the first one's commit, or that record would stay soft-deleted forever.
      const previous = pendingRef.current;
      clearTimer();
      if (previous) {
        run(previous.commit, 'undo.commit');
      }

      pendingRef.current = next;
      setPending(next);
      timer.current = setTimeout(() => settle('commit'), UNDO_WINDOW_MS);
    },
    [clearTimer, run, settle],
  );

  // Principle VII: nothing outlives the tree that created it. On unmount the
  // pending change is committed rather than abandoned — abandoning it would
  // leave a soft-deleted row that no query returns and no sweep expects.
  useEffect(() => {
    return () => {
      clearTimer();
      const current = pendingRef.current;
      pendingRef.current = null;
      if (current) {
        run(current.commit, 'undo.commit');
      }
    };
  }, [clearTimer, run]);

  const value = useMemo<UndoContextValue>(() => ({offer}), [offer]);

  return (
    <UndoContext.Provider value={value}>
      {children}
      {pending ? (
        <Toast
          message={pending.message}
          actionLabel={t('undo.action')}
          onAction={() => settle('undo')}
        />
      ) : null}
    </UndoContext.Provider>
  );
}

export function useUndo(): UndoContextValue {
  const value = useContext(UndoContext);
  if (!value) {
    throw new Error('useUndo called outside UndoProvider');
  }
  return value;
}
