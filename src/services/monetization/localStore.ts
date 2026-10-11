/**
 * The few values monetization keeps itself, in MMKV — deliberately NOT the
 * SQLite settings table: "Delete all data" wipes that, and neither of these is
 * task data (specs/002-ads-and-remove-ads FR-5, plan D-8). Excluded from
 * backup and device transfer in the Android XML rules.
 */
const INSTANCE_ID = 'taskmanager.monetization';
const KEY = {
	interstitialCount: 'interstitial.count',
	pendingSince: 'purchase.pendingSince',
} as const;

/** The three MMKV calls this store makes (react-native-mmkv v4 names). */
export interface NumberBackend {
	getNumber(key: string): number | undefined;
	set(key: string, value: number): void;
	remove(key: string): unknown;
}

export interface MonetizationLocalStore {
	/** False when MMKV is unavailable and values live in memory only. */
	persistent: boolean;
	getInterstitialCount(): number;
	setInterstitialCount(count: number): void;
	/** When a purchase went pending, epoch ms; null when none is believed open. */
	getPendingSince(): number | null;
	setPendingSince(at: number | null): void;
}

function memoryBackend(): NumberBackend {
	const memory = new Map<string, number>();
	return {
		getNumber: key => memory.get(key),
		set: (key, value) => {
			memory.set(key, value);
		},
		remove: key => memory.delete(key),
	};
}

/**
 * MMKV v4 instances come from `createMMKV`; `MMKV` itself is only a type. The
 * memory fallback (Jest, or MMKV failing to link) is reported through
 * `persistent: false` — the caller logs it — rather than swallowed: a silent
 * fallback once hid exactly this API change and lost every value on restart.
 */
function createBackend(): { backend: NumberBackend; persistent: boolean } {
	try {
		const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
		return { backend: createMMKV({ id: INSTANCE_ID }), persistent: true };
	} catch {
		return { backend: memoryBackend(), persistent: false };
	}
}

export function createMonetizationLocalStore(
	injected?: NumberBackend,
): MonetizationLocalStore {
	const { backend, persistent } = injected
		? { backend: injected, persistent: true }
		: createBackend();
	return {
		persistent,
		getInterstitialCount() {
			const value = backend.getNumber(KEY.interstitialCount);
			// Anything but a non-negative integer is corruption; start over at zero.
			return Number.isInteger(value) && (value as number) >= 0 ? (value as number) : 0;
		},
		setInterstitialCount(count) {
			backend.set(KEY.interstitialCount, count);
		},
		getPendingSince() {
			const value = backend.getNumber(KEY.pendingSince);
			return typeof value === 'number' && Number.isFinite(value) ? value : null;
		},
		setPendingSince(at) {
			if (at === null) {
				backend.remove(KEY.pendingSince);
			} else {
				backend.set(KEY.pendingSince, at);
			}
		},
	};
}
