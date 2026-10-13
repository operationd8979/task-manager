/**
 * The one value monetization keeps itself, in MMKV — deliberately NOT the
 * SQLite settings table: "Delete all data" wipes that, and it is not task data
 * (specs/002-ads-and-remove-ads FR-5, plan D-8). Excluded from backup and device
 * transfer in the Android XML rules. Pending payments are the payment SDK's to
 * remember (plan D-20).
 */
const INSTANCE_ID = 'taskmanager.monetization';
const KEY = {
	interstitialCount: 'interstitial.count',
} as const;

/** The two MMKV calls this store makes (react-native-mmkv v4 names). */
export interface NumberBackend {
	getNumber(key: string): number | undefined;
	set(key: string, value: number): void;
}

export interface MonetizationLocalStore {
	/** False when MMKV is unavailable and values live in memory only. */
	persistent: boolean;
	getInterstitialCount(): number;
	setInterstitialCount(count: number): void;
}

function memoryBackend(): NumberBackend {
	const memory = new Map<string, number>();
	return {
		getNumber: key => memory.get(key),
		set: (key, value) => {
			memory.set(key, value);
		},
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
	};
}
