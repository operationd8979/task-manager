import type { AdsEnablement, EntitlementStatus } from '../../../domain/monetization';
import { createMonetizationWiring, type EntitlementPort } from '../wiring';

/** A few lines of fake standing in for the payment engine's entitlement surface. */
function fakeEntitlements(initial: EntitlementStatus) {
	let status = initial;
	const listeners = new Set<(map: Record<string, { status: EntitlementStatus }>) => void>();
	const port: EntitlementPort = {
		getEntitlement: () => ({ status }),
		subscribeEntitlements(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
	};
	return {
		port,
		push(next: EntitlementStatus) {
			status = next;
			listeners.forEach(listener => listener({ no_ads: { status } }));
		},
		listenerCount: () => listeners.size,
	};
}

function fakeAds() {
	const calls: AdsEnablement[] = [];
	return { port: { setEnablement: (next: AdsEnablement) => calls.push(next) }, calls };
}

const wire = (status: EntitlementStatus, adsEnabledInBuild = true) => {
	const entitlements = fakeEntitlements(status);
	const ads = fakeAds();
	const wiring = createMonetizationWiring({
		entitlements: entitlements.port,
		ads: ads.port,
		adsEnabledInBuild,
	});
	return { entitlements, ads, wiring };
};

describe('createMonetizationWiring', () => {
	it('holds ads while the purchase is unknown and never enables them (AC-1.2, FR-1)', () => {
		const { ads, wiring } = wire('unknown');
		expect(ads.calls).toEqual(['undecided']);
		expect(wiring.getSnapshot()).toEqual({ purchase: 'unknown', adsEnablement: 'undecided', pending: false });
	});

	it('disables ads for an owner from the first snapshot, offline included (AC-1.1, AC-1.7)', () => {
		const { ads } = wire('entitled');
		expect(ads.calls).toEqual(['disabled']);
	});

	it('enables ads once the status resolves to not owned, without a restart (FR-3)', () => {
		const { entitlements, ads, wiring } = wire('unknown');
		const notified = jest.fn();
		wiring.subscribe(notified);
		entitlements.push('not_entitled');
		expect(ads.calls).toEqual(['undecided', 'enabled']);
		expect(notified).toHaveBeenCalledTimes(1);
	});

	it('turns ads off the moment a purchase lands in the session (AC-3.2, FR-3)', () => {
		const { entitlements, ads, wiring } = wire('not_entitled');
		entitlements.push('entitled');
		expect(ads.calls).toEqual(['enabled', 'disabled']);
		expect(wiring.getSnapshot().purchase).toBe('owned');
	});

	it('keeps ads off after a revocation found mid-session (AC-9.2)', () => {
		const { entitlements, ads, wiring } = wire('entitled');
		entitlements.push('not_entitled');
		expect(ads.calls).toEqual(['disabled']);
		expect(wiring.getSnapshot()).toEqual({ purchase: 'owned', adsEnablement: 'disabled', pending: false });
	});

	it('brings ads back on the next cold start after a refund (AC-9.1)', () => {
		const { ads } = wire('not_entitled');
		expect(ads.calls).toEqual(['enabled']);
	});

	it('holds ads when a stale snapshot returns to unknown, never enabling them (AC-9.3)', () => {
		const { entitlements, ads } = wire('not_entitled');
		entitlements.push('unknown');
		expect(ads.calls).toEqual(['enabled', 'undecided']);
	});

	it('keeps ads off in a build without ads, whatever the purchase (FR-19)', () => {
		const { entitlements, ads } = wire('not_entitled', false);
		entitlements.push('unknown');
		expect(ads.calls).toEqual(['disabled']);
	});

	it('reads a missing payment engine as unknown (FR-22)', () => {
		const ads = fakeAds();
		const wiring = createMonetizationWiring({
			entitlements: null,
			ads: ads.port,
			adsEnabledInBuild: true,
		});
		expect(ads.calls).toEqual(['undecided']);
		expect(wiring.getSnapshot().purchase).toBe('unknown');
	});

	it('repeats nothing for an unchanged status and releases its subscription', () => {
		const { entitlements, ads, wiring } = wire('not_entitled');
		entitlements.push('not_entitled');
		expect(ads.calls).toEqual(['enabled']);
		wiring.dispose();
		expect(entitlements.listenerCount()).toBe(0);
	});
});
