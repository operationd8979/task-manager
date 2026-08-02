import type {Weekday} from '../lib/date';
import type {ReminderOffset} from './reminder';

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
  defaultReminderOffset: ReminderOffset;
  /** 1 = Monday, 7 = Sunday (FR-052). */
  firstDayOfWeek: Weekday;
  displayMode: DisplayMode;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultReminderOffset: 0,
  firstDayOfWeek: 1,
  displayMode: DEFAULT_DISPLAY_MODE,
};
