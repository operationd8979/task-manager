import {useEffect, useState} from 'react';

/**
 * Longest the clock will ever sleep.
 *
 * Also what keeps the QUÁ HẠN label honest: a day left open on screen crosses
 * an end time with nothing to tell it, so the clock wakes at least this often
 * whether or not anything is counting down.
 */
const MAX_SLEEP_MS = 60_000;

/** One row's countdown window, as absolute instants. */
export interface CountdownWindow {
  /** When the row starts counting. */
  opensAt: number;
  /** The start time it counts down to. */
  startsAt: number;
}

/**
 * The clock the timeline renders against.
 *
 * ONE timer for the whole screen, not one per row. It ticks every second only
 * while some row is actually inside its countdown window, and otherwise sleeps
 * until the next window opens. A per-row interval would be dozens of wakeups a
 * second on a full day, for rows whose displayed time did not change — which is
 * the JS-thread budget SC-006 is spent on scrolling.
 *
 * The tick is aligned to the wall-clock second rather than fired every 1000ms,
 * so the digits change when the second changes instead of drifting away from it.
 */
export function useTimelineClock(windows: readonly CountdownWindow[]): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const ms = now.getTime();
    const counting = windows.some(w => ms >= w.opensAt && ms < w.startsAt);

    let sleep = MAX_SLEEP_MS;
    if (counting) {
      sleep = 1000 - (ms % 1000);
    } else {
      for (const window of windows) {
        if (window.opensAt > ms) {
          sleep = Math.min(sleep, window.opensAt - ms);
        }
      }
      // A floor, so a window opening in three milliseconds cannot spin the
      // effect into a re-render loop.
      sleep = Math.max(sleep, 250);
    }

    const timer = setTimeout(() => setNow(new Date()), sleep);
    return () => clearTimeout(timer);
  }, [now, windows]);

  return now;
}
