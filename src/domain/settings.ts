import type {Weekday} from '../lib/date';
import {DEFAULT_COUNTDOWN_MINUTES, type CountdownOffset} from './countdown';

/**
 * Display mode is a stored user preference, so it is a domain concept. Applying
 * it to the styling engine is a presentation concern and lives in
 * `src/theme/mode.ts` — which imports this type rather than declaring it, so
 * nothing under `src/domain` or `src/services` ever reaches the theme layer.
 */
export type DisplayMode = 'auto' | 'light' | 'dark';

export const DISPLAY_MODES: readonly DisplayMode[] = ['auto', 'light', 'dark'];

export const DEFAULT_DISPLAY_MODE: DisplayMode = 'auto';

export function isDisplayMode(value: string): value is DisplayMode {
  return (DISPLAY_MODES as readonly string[]).includes(value);
}

export interface AppSettings {
  /**
   * How long before a task starts its row begins counting down, app-wide.
   *
   * NOT a reminder setting. It applies to every task on the timeline, including
   * those with no reminder at all, and changing it changes nothing about which
   * notifications the OS will ring.
   */
  countdownMinutes: CountdownOffset;
  /** 1 = Monday, 7 = Sunday (FR-052). */
  firstDayOfWeek: Weekday;
  displayMode: DisplayMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  countdownMinutes: DEFAULT_COUNTDOWN_MINUTES,
  firstDayOfWeek: 1,
  displayMode: DEFAULT_DISPLAY_MODE,
};
