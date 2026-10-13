import * as Ads from '@chipmobilesdk/rn-ads';
import { createFakeAdsEngine } from '@chipmobilesdk/rn-ads/testing';
import * as Payment from '@chipmobilesdk/rn-payment';
import {
	createFakeStore,
	createMemorySnapshotStore,
	makePurchase,
} from '@chipmobilesdk/rn-payment/testing';

import { isPrivacyOptionsShown } from '../../../domain/monetization';
import { APP_ENV } from '../appEnv';
import { PLACEMENT, PRODUCT } from '../catalog';
import { GOOGLE_TEST_AD_UNIT } from '../environment';
import { createMonetizationRuntime, type MonetizationRuntime } from '../runtime';
import { openPrivacyOptions } from '../session';
import { createMonetizationWiring } from '../wiring';

/**
 * The real SDKs, driven by their own fakes: no device, no network, no store
 * account. This is also the compile-time proof that the real engine and ads
 * instance satisfy the wiring's narrow ports.
 */
/**
 * One app process. Passing the same `store` and `snapshotStore` to a second
 * call simulates an app kill and restart: the store keeps its purchases, the
 * device keeps the payment SDK's record, and memory starts over.
 */
function setup(
	shared: {
		store?: ReturnType<typeof createFakeStore>;
		snapshotStore?: ReturnType<typeof createMemorySnapshotStore>;
		/** A scripted ads engine, e.g. one whose consent says "consent region". */
		engine?: ReturnType<typeof createFakeAdsEngine>;
	} = {},
) {
	const engine = shared.engine ?? createFakeAdsEngine();
	const store = shared.store ?? createFakeStore();
	const runtime = createMonetizationRuntime({
		platform: 'android',
		isDevBuild: true,
		env: APP_ENV,
		loadAds: () => Ads,
		loadPayment: () => Payment,
		adsOptions: { engine, isDevBuild: true },
		storeProvider: store,
		snapshotStore: shared.snapshotStore,
	});
	const wiring = createMonetizationWiring({
		entitlements: runtime.payment,
		pending: runtime.payment,
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
		expect(wiring.getSnapshot()).toEqual({ purchase: 'owned', adsEnablement: 'disabled', pending: false });
	});
});

describe('a pending payment across sessions (US-5, plan D-20)', () => {
	const TXN = 'txn_pending';

	function kill(session: ReturnType<typeof setup>) {
		session.wiring.dispose();
		session.runtime.ads?.dispose();
		session.runtime.payment?.cleanup();
	}

	/** Session 1: the user pays with a slow method, then the app is killed. */
	async function leavePending() {
		const snapshotStore = createMemorySnapshotStore();
		const first = setup({ snapshotStore });
		await first.runtime.payment?.initialize();
		first.store.scriptPurchasePending({
			storeProductId: APP_ENV.removeAdsProductId,
			transactionId: TXN,
		});
		expect((await first.runtime.payment?.purchase(PRODUCT.removeAds))?.kind).toBe('pending');
		expect(first.wiring.getSnapshot()).toMatchObject({ purchase: 'not_owned', pending: true });
		kill(first);
		return { store: first.store, snapshotStore };
	}

	it('still shows pending after an app kill and an offline restart (AC-5.2)', async () => {
		const { store, snapshotStore } = await leavePending();
		store.setConnectOutcome({ ok: false, reason: 'store_error', retryable: true });

		const second = setup({ store, snapshotStore });
		current = second;
		await second.runtime.payment?.initialize();

		// The retired plan D-18 marker could do this much. A decline, below, it could not.
		expect(second.wiring.getSnapshot()).toMatchObject({ purchase: 'not_owned', pending: true });
	});

	it('offers Buy again at the next sync once the payment is declined (AC-5.5)', async () => {
		const { store, snapshotStore } = await leavePending();
		store.cancelPending(TXN);

		const second = setup({ store, snapshotStore });
		current = second;
		await second.runtime.payment?.initialize();

		// The retired D-18 marker kept saying "pending" here for up to seven days.
		expect(second.wiring.getSnapshot()).toEqual({
			purchase: 'not_owned',
			adsEnablement: 'enabled',
			pending: false,
		});
	});

	it('is owned at the next launch when the payment clears while closed (AC-5.4)', async () => {
		const { store, snapshotStore } = await leavePending();
		store.settlePending(TXN);

		const second = setup({ store, snapshotStore });
		current = second;
		await second.runtime.payment?.initialize();

		expect(second.wiring.getSnapshot()).toEqual({
			purchase: 'owned',
			adsEnablement: 'disabled',
			pending: false,
		});
	});

	it('removes ads in the session when the payment clears while running (AC-5.3)', async () => {
		const session = setup({ snapshotStore: createMemorySnapshotStore() });
		current = session;
		await session.runtime.payment?.initialize();
		session.store.scriptPurchasePending({
			storeProductId: APP_ENV.removeAdsProductId,
			transactionId: TXN,
		});
		await session.runtime.payment?.purchase(PRODUCT.removeAds);

		session.store.pushPurchaseUpdate(
			makePurchase({
				storeProductId: APP_ENV.removeAdsProductId,
				transactionId: TXN,
				state: 'purchased',
			}),
		);
		await flush();

		expect(session.wiring.getSnapshot()).toEqual({
			purchase: 'owned',
			adsEnablement: 'disabled',
			pending: false,
		});
	});
});

describe('Privacy options with rn-ads 0.4.0 (SL-5, plan D-21)', () => {
	/** A consent region (EEA) where the user has not answered yet. */
	const consentRegion = () =>
		createFakeAdsEngine({
			consentInfo: { status: 'required', canRequestAds: false, isFormAvailable: true },
		});

	/** What `ensureAdsReady` does once ads are wanted: update, form, initialize. */
	async function consentFlow(session: ReturnType<typeof setup>) {
		const ads = session.runtime.ads!;
		await ads.consent.requestInfoUpdate();
		await ads.consent.showFormIfRequired();
		return ads.initialize({ canRequestAds: true });
	}

	function holdCounter() {
		const counts = { held: 0, released: 0 };
		return {
			counts,
			hooks: {
				holdWhileShowing: () => {
					counts.held += 1;
					return () => {
						counts.released += 1;
					};
				},
			},
		};
	}

	it('offers the entry in a consent region once the user has answered (AC-6.4)', async () => {
		const session = setup({ engine: consentRegion() });
		current = session;
		await session.runtime.payment?.initialize();
		await consentFlow(session);

		const requirement = session.runtime.ads!.consent.getState().privacyOptionsRequirement;
		expect(requirement).toBe('required');
		expect(isPrivacyOptionsShown(requirement, session.wiring.getSnapshot().purchase)).toBe(true);
	});

	it('withdrawing through the entry blocks the next load, with the form held as an interruption', async () => {
		const engine = consentRegion();
		const session = setup({ engine });
		current = session;
		await session.runtime.payment?.initialize();
		await consentFlow(session);
		engine.setPrivacyOptionsFormResult({ status: 'required', canRequestAds: false });
		const { counts, hooks } = holdCounter();

		const outcome = await openPrivacyOptions(session.runtime.ads!, hooks);

		expect(outcome).toBe('shown');
		// No full-screen ad may land on Google's form (FR-10).
		expect(counts).toEqual({ held: 1, released: 1 });
		expect(await session.runtime.ads!.load(PLACEMENT.taskBreak)).toEqual({
			status: 'blocked',
			reason: 'consent_flow_required',
		});
	});

	it('re-granting resumes loads with one native initialization in the process', async () => {
		const engine = consentRegion();
		const session = setup({ engine });
		current = session;
		await session.runtime.payment?.initialize();
		await consentFlow(session);
		engine.setPrivacyOptionsFormResult({ status: 'required', canRequestAds: false });
		await openPrivacyOptions(session.runtime.ads!, holdCounter().hooks);
		engine.setPrivacyOptionsFormResult({ status: 'obtained', canRequestAds: true });

		await openPrivacyOptions(session.runtime.ads!, holdCounter().hooks);
		session.runtime.ads!.load(PLACEMENT.taskBreak);
		await flush();

		expect(engine.adUnitIds().length).toBeGreaterThan(0);
		expect(engine.calls.filter(call => call.kind === 'initialize')).toHaveLength(1);
	});

	it('a declined first-time form now initializes nothing (rn-ads 0.4.0)', async () => {
		// No form to show means the user's "no" stands: the region still requires
		// consent, and 0.4.0 refuses to initialize the SDK under that.
		const engine = createFakeAdsEngine({
			consentInfo: { status: 'required', canRequestAds: false, isFormAvailable: false },
		});
		const session = setup({ engine });
		current = session;
		await session.runtime.payment?.initialize();

		expect(await consentFlow(session)).toEqual({
			status: 'blocked',
			reason: 'consent_flow_required',
		});
		expect(engine.calls.filter(call => call.kind === 'initialize')).toHaveLength(0);
	});

	it('reports a form that could not open as failed', async () => {
		const engine = consentRegion();
		const session = setup({ engine });
		current = session;
		await session.runtime.payment?.initialize();
		await consentFlow(session);
		engine.failPrivacyOptionsForm();

		expect(await openPrivacyOptions(session.runtime.ads!, holdCounter().hooks)).toBe('failed');
	});
});

describe('ensureAdsReady never shows the consent form to an owner (AC-6.5)', () => {
	/**
	 * `ensureAdsReady` is once per process, so each case loads a fresh copy of
	 * the session module.
	 */
	function freshEnsureAdsReady(): typeof import('../session').ensureAdsReady {
		let fn!: typeof import('../session').ensureAdsReady;
		jest.isolateModules(() => {
			fn = require('../session').ensureAdsReady;
		});
		return fn;
	}

	const consentRegion = () =>
		createFakeAdsEngine({
			consentInfo: { status: 'required', canRequestAds: false, isFormAvailable: true },
		});

	it('skips the form when the purchase turns out owned while the flow waits', async () => {
		// A cached "not owned" started the flow; this session's sync then found the
		// purchase — the case found on the emulator once the record persisted.
		const engine = consentRegion();
		const session = setup({ engine });
		current = session;
		let wanted = true;
		const ensureAdsReady = freshEnsureAdsReady();

		await ensureAdsReady(session.runtime.ads!, {
			waitUntilIdle: async () => {
				wanted = false;
			},
			holdWhileShowing: () => () => undefined,
			stillWanted: () => wanted,
		});

		expect(engine.consentCalls.some(call => call.kind === 'showFormIfRequired')).toBe(false);
		expect(engine.calls.filter(call => call.kind === 'initialize')).toHaveLength(0);
	});

	it('runs the flow again later if ads become wanted after all', async () => {
		const engine = consentRegion();
		const session = setup({ engine });
		current = session;
		let wanted = false;
		const ensureAdsReady = freshEnsureAdsReady();
		const hooks = {
			waitUntilIdle: async () => undefined,
			holdWhileShowing: () => () => undefined,
			stillWanted: () => wanted,
		};
		await ensureAdsReady(session.runtime.ads!, hooks);

		wanted = true;
		await ensureAdsReady(session.runtime.ads!, hooks);

		expect(engine.consentCalls.filter(call => call.kind === 'showFormIfRequired')).toHaveLength(1);
	});
});
