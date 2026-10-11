import { createMonetizationLocalStore } from '../localStore';

/** A map standing in for MMKV, so the stored values can be corrupted on purpose. */
function memory() {
	const values = new Map<string, number>();
	return {
		values,
		backend: {
			getNumber: (key: string) => values.get(key),
			set: (key: string, value: number) => {
				values.set(key, value);
			},
			remove: (key: string) => values.delete(key),
		},
	};
}

describe('createMonetizationLocalStore', () => {
	it('starts the interstitial counter at zero and keeps what is written (FR-11)', () => {
		const { backend } = memory();
		const store = createMonetizationLocalStore(backend);
		expect(store.getInterstitialCount()).toBe(0);
		store.setInterstitialCount(2);
		expect(createMonetizationLocalStore(backend).getInterstitialCount()).toBe(2);
	});

	it('reads a corrupted counter as zero', () => {
		const { values, backend } = memory();
		values.set('interstitial.count', -3);
		expect(createMonetizationLocalStore(backend).getInterstitialCount()).toBe(0);
		values.set('interstitial.count', 1.5);
		expect(createMonetizationLocalStore(backend).getInterstitialCount()).toBe(0);
	});

	it('keeps and clears the pending marker (D-18)', () => {
		const { backend } = memory();
		const store = createMonetizationLocalStore(backend);
		expect(store.getPendingSince()).toBeNull();
		store.setPendingSince(1234);
		expect(createMonetizationLocalStore(backend).getPendingSince()).toBe(1234);
		store.setPendingSince(null);
		expect(store.getPendingSince()).toBeNull();
	});

	it('falls back to memory where MMKV is not linked, and says so', () => {
		const store = createMonetizationLocalStore();
		store.setInterstitialCount(1);
		expect(store.getInterstitialCount()).toBe(1);
		// Under Jest the native module is absent; the caller logs this.
		expect(store.persistent).toBe(false);
	});
});
