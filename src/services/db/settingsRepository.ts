import type {DatabaseHandle} from '@chipmobilesdk/rn-local-db';

import {isReminderOffset, type ReminderOffset} from '../../domain/reminder';
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
          defaultReminderOffset: readOffset(raw.get('defaultReminderOffset')),
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

function readOffset(value: string | undefined): ReminderOffset {
  const n = Number(value);
  return Number.isFinite(n) && isReminderOffset(n)
    ? n
    : DEFAULT_SETTINGS.defaultReminderOffset;
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
