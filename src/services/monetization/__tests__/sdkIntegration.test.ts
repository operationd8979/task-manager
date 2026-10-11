import * as Ads from '@chipmobilesdk/rn-ads';
import { createFakeAdsEngine } from '@chipmobilesdk/rn-ads/testing';
import * as Payment from '@chipmobilesdk/rn-payment';
import { createFakeStore } from '@chipmobilesdk/rn-payment/testing';

import { APP_ENV } from '../appEnv';
import { PLACEMENT, PRODUCT } from '../catalog';
import { GOOGLE_TEST_AD_UNIT } from '../environment';
import { createMonetizationRuntime, type MonetizationRuntime } from '../runtime';
import { createMonetizationWiring } from '../wiring';

/**
 * The real SDKs, driven by their own fakes: no device, no network, no store
 * account. This is also the compile-time proof that the real engine and ads
 * instance satisfy the wiring's narrow ports.
 */
function setup() {
	const engine = createFakeAdsEngine();
	const store = createFakeStore();
	const runtime = createMonetizationRuntime({
		platform: 'android',
		isDevBuild: true,
		env: APP_ENV,
		loadAds: () => Ads,
		loadPayment: () => Payment,
		adsOptions: { engine, isDevBuild: true },
		storeProvider: store,
	});
	const wiring = createMonetizationWiring({
		entitlements: runtime.payment,
		ads: runtime.ads,
		adsEnabledInBuild: true,
	});
	return { engine, store, runtime, wiring };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

let current: { runtime: MonetizationRuntime; wiring: { dispose(): void } } | null = null;
afterEach(() => {
	current?.wiring.dispose();
	current?.runtime.ads?.dispose();
	current?.runtime.payment?.cleanup();
	current = null;
});

describe('monetization against the SDK fakes', () => {
	it('sends zero provider calls while the purchase is unknown (FR-1, AC-1.2)', async () => {
		const { engine, runtime, wiring } = (current = setup());
		await runtime.ads?.initialize({ canRequestAds: true });
		await runtime.ads?.load(PLACEMENT.taskBreak);
		expect(wiring.getSnapshot().adsEnablement).toBe('undecided');
		expect(engine.adUnitIds()).toEqual([]);
	});

	it('requests only Google test units in a development build (AC-7.2)', async () => {
		const { engine, runtime } = (current = setup());
		runtime.ads?.setEnablement('enabled');
		await runtime.ads?.initialize({ canRequestAds: true });
		runtime.ads?.load(PLACEMENT.taskBreak);
		await flush();
		const testUnits: string[] = Object.values(GOOGLE_TEST_AD_UNIT);
		expect(engine.adUnitIds().length).toBeGreaterThan(0);
		expect(engine.adUnitIds().every(unit => testUnits.includes(unit))).toBe(true);
	});

	it('turns ads off in the session once the purchase succeeds (AC-3.2, FR-3)', async () => {
		const { store, runtime, wiring } = (current = setup());
		await runtime.payment?.initialize();
		store.scriptPurchaseSuccess({ storeProductId: APP_ENV.removeAdsProductId });
		const result = await runtime.payment?.purchase(PRODUCT.removeAds);
		expect(result?.kind).toBe('success');
		expect(wiring.getSnapshot()).toEqual({ purchase: 'owned', adsEnablement: 'disabled' });
	});
});
