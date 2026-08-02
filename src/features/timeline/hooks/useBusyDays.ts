import {useEffect, useMemo, useState} from 'react';

import {useDatabase} from '../../../app/providers/DatabaseProvider';
import {DataError} from '../../../services/db/errors';
import {COLLECTION} from '../../../services/db/schema';
import {addDays, toLocalDate, type LocalDate} from '../../../lib/date';

/**
 * The busy-day dots are a decorative layer, so they get their own state.
 *
 * If the grid waited for this, the sheet's most common action — picking a day —
 * would be blocked by something purely informational. A failure here likewise
 * must not stop the user selecting a date (design/ux-ui-spec.md §3).
 */
export type BusyDaysState =
  | {status: 'counting'}
  | {status: 'ready'; days: ReadonlySet<LocalDate>}
  | {status: 'failed'};

export function useBusyDays(monthAnchor: LocalDate): BusyDaysState {
  const {handle, errorLog} = useDatabase();
  const [state, setState] = useState<BusyDaysState>({status: 'counting'});

  const range = useMemo(() => monthRange(monthAnchor), [monthAnchor]);

  useEffect(() => {
    let cancelled = false;
    setState({status: 'counting'});

    (async () => {
      try {
        // Counted once for the whole month rather than per cell — a query per
        // day would be 31 round trips for a decoration (ux-ui-spec.md §5.5).
        const page = await handle
          .collection<{taskDate: string}>(COLLECTION.tasks)
          .list({
            filter: {
              op: 'between',
              field: 'taskDate',
              value: [range.from, range.to],
            },
            page: {size: 500},
          });
        if (cancelled) {
          return;
        }
        setState({
          status: 'ready',
          days: new Set(page.records.map(r => String(r.data.taskDate))),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        void errorLog.record({
          code: error instanceof DataError ? error.code : 'UNKNOWN',
          operation: 'calendar.countBusyDays',
        });
        setState({status: 'failed'});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [handle, errorLog, range.from, range.to]);

  return state;
}

function monthRange(anchor: LocalDate): {from: LocalDate; to: LocalDate} {
  const [year, month] = anchor.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const firstOfNext = new Date(year, month, 1);
  return {
    from: toLocalDate(first),
    to: addDays(toLocalDate(firstOfNext), -1),
  };
}
