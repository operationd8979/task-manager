import { Platform } from 'react-native';
import type { LocaleStorageAdapter } from '@chipmobilesdk/rn-i18n';

/**
 * Where the chosen language is remembered.
 *
 * Deliberately NOT the settings table in SQLite, even though every other
 * preference lives there. The language has to be known before the first pixel
 * is drawn, and the boot sequence reaches a screen with words on it in one case
 * where the database is not available at all: the "Chưa đọc được dữ liệu" state
 * that appears when `openGateway()` fails. Storing the language in SQLite would
 * mean that screen — the one a user in trouble actually reads — is the one
 * screen that cannot honour their language choice.
 *
 * MMKV is already a hard dependency (the notification SDK requires it), is
 * synchronous, and needs no open handle. The SDK's adapter contract is async,
 * so the synchronous calls are wrapped rather than awaited.
 */
const INSTANCE_ID = 'taskmanager.i18n';

interface MmkvLike {
	getString(key: string): string | undefined;
	set(key: string, value: string): void;
	delete(key: string): void;
}

/**
 * Falls back to memory when the native module is absent — under Jest, and in
 * any build where MMKV failed to link. A language choice that does not survive
 * a restart is a degradation; a crash on the first render is not one worth
 * trading for it.
 */
function createBackend(): MmkvLike {
	try {
		// Required lazily so this module loads where the native module does not.
		const { MMKV } = require('react-native-mmkv') as {
			MMKV: new (config: { id: string; path?: string }) => MmkvLike;
		};
		return new MMKV({
			id: INSTANCE_ID,
			// Library/Caches is excluded from iCloud backup by platform design, and
			// a language preference is cheap to rebuild from the device locale if
			// iOS ever purges it. Android exclusion is declared in the manifest.
			path:
				Platform.OS === 'ios' ? 'Library/Caches/taskmanager-i18n' : undefined,
		});
	} catch {
		const memory = new Map<string, string>();
		return {
			getString: key => memory.get(key),
			set: (key, value) => {
				memory.set(key, value);
			},
			delete: key => {
				memory.delete(key);
			},
		};
	}
}

let backend: MmkvLike | null = null;

function store(): MmkvLike {
	backend ??= createBackend();
	return backend;
}

export const localeStorage: LocaleStorageAdapter = {
	getItem: key => Promise.resolve(store().getString(key) ?? null),
	setItem: (key, value) => Promise.resolve(store().set(key, value)),
	removeItem: key => Promise.resolve(store().delete(key)),
};
