import type {DatabaseHandle} from '@chipmobilesdk/rn-local-db';

import {
  isCountdownOffset,
  type CountdownOffset,
} from '../../domain/countdown';
import {
  DEFAULT_SETTINGS,
  isDisplayMode,
  type AppSettings,
  type DisplayMode,
} from '../../domain/settings';
import type {Weekday} from '../../lib/date';
import {COLLECTION} from './schema';
import {toDataError} from './errors';

export interface SettingsRepository {
  /** Always returns every key, filling defaults for anything unset. */
  getAll(): Promise<AppSettings>;
  set<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ): Promise<void>;
}

export function createSettingsRepository(
  handle: DatabaseHandle,
): SettingsRepository {
  const collection = handle.collection<{value: string}>(COLLECTION.settings);

  return {
    async getAll() {
      try {
        const page = await collection.list({page: {size: 50}});
        const raw = new Map(
          page.records.map(r => [r.id, String(r.data.value)] as const),
        );
        // Defaults are filled here so no screen ever has to branch on an
        // undefined preference — one fewer state in the UI.
        return {
          countdownMinutes: readCountdown(raw.get('countdownMinutes')),
          firstDayOfWeek: readWeekday(raw.get('firstDayOfWeek')),
          displayMode: readDisplayMode(raw.get('displayMode')),
        };
      } catch (error) {
        throw toDataError(error, 'settings.getAll');
      }
    },

    async set(key, value) {
      try {
        await collection.upsert({id: key, data: {value: String(value)}});
      } catch (error) {
        throw toDataError(error, 'settings.set');
      }
    },
  };
}

/**
 * Read under its own key, not the old `defaultReminderOffset`.
 *
 * That key held a REMINDER default and was allowed to be 0; reusing it would
 * import "đúng giờ" as a countdown window of zero — a setting that is no longer
 * offered and would silently switch the countdown off for anyone upgrading.
 * The stale key is simply left unread.
 */
function readCountdown(value: string | undefined): CountdownOffset {
  const n = Number(value);
  return Number.isFinite(n) && isCountdownOffset(n)
    ? n
    : DEFAULT_SETTINGS.countdownMinutes;
}

function readWeekday(value: string | undefined): Weekday {
  // Only Monday and Sunday are offered as week starts (FR-052).
  return Number(value) === 7 ? 7 : DEFAULT_SETTINGS.firstDayOfWeek;
}

function readDisplayMode(value: string | undefined): DisplayMode {
  return value !== undefined && isDisplayMode(value)
    ? value
    : DEFAULT_SETTINGS.displayMode;
}
