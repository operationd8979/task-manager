import type * as AdsModule from '@chipmobilesdk/rn-ads';
import type * as PaymentModule from '@chipmobilesdk/rn-payment';

import { APP_ENV } from '../appEnv';
import { createMonetizationRuntime, type RuntimeDeps } from '../runtime';

const throwingLoader = () => {
	throw new Error('constructor failed');
};

/** Loaders whose factories record their calls; nothing native is touched. */
function recordingLoaders() {
	const createAds = jest.fn(() => ({}) as unknown as AdsModule.AdsInstance);
	const createEngine = jest.fn(() => ({}));
	return {
		createAds,
		createEngine,
		loadAds: jest.fn(
			() => ({ createAds, AdsProvider: () => null, AdsBanner: () => null }) as unknown as typeof AdsModule,
		),
		loadPayment: jest.fn(
			() => ({ createEngine, createStoreProvider: () => ({}) }) as unknown as typeof PaymentModule,
		),
	};
}

const deps = (overrides: Partial<RuntimeDeps>): RuntimeDeps => ({
	platform: 'android',
	isDevBuild: true,
	env: APP_ENV,
	loadAds: throwingLoader,
	loadPayment: throwingLoader,
	...overrides,
});

describe('createMonetizationRuntime', () => {
	it('creates nothing on iOS and never evaluates either SDK (FR-15, D-12)', () => {
		const loaders = recordingLoaders();
		const runtime = createMonetizationRuntime(deps({ platform: 'ios', ...loaders }));
		expect(runtime.ads).toBeNull();
		expect(runtime.payment).toBeNull();
		expect(runtime.AdsBanner).toBeNull();
		expect(loaders.loadAds).not.toHaveBeenCalled();
		expect(loaders.loadPayment).not.toHaveBeenCalled();
	});

	it('creates both SDKs on Android, payments in non-production-build mode for a debug build', () => {
		const loaders = recordingLoaders();
		const runtime = createMonetizationRuntime(deps(loaders));
		expect(runtime.ads).not.toBeNull();
		expect(runtime.payment).not.toBeNull();
		expect(loaders.createEngine).toHaveBeenCalledWith(
			expect.objectContaining({ isProductionBuild: false, environment: 'development' }),
			expect.anything(),
		);
		expect(runtime.startupFailures).toEqual([]);
	});

	it('turns a constructor failure into a logged code, never a crash (FR-22, FR-13)', () => {
		const runtime = createMonetizationRuntime(deps({}));
		expect(runtime.ads).toBeNull();
		expect(runtime.payment).toBeNull();
		expect(runtime.startupFailures).toEqual([
			'ads.config_unavailable',
			'payment.config_unavailable',
		]);
	});

	it('keeps the payment engine when only ads fail, so owners stay ad-free', () => {
		const loaders = recordingLoaders();
		const runtime = createMonetizationRuntime(
			deps({ loadAds: throwingLoader, loadPayment: loaders.loadPayment }),
		);
		expect(runtime.payment).not.toBeNull();
		expect(runtime.startupFailures).toEqual(['ads.config_unavailable']);
	});

	it('does not construct ads at all in a build that ships without them (FR-19)', () => {
		const loaders = recordingLoaders();
		const runtime = createMonetizationRuntime(
			deps({ ...loaders, env: { ...APP_ENV, adsEnabled: false } }),
		);
		expect(loaders.loadAds).not.toHaveBeenCalled();
		expect(runtime.ads).toBeNull();
		expect(runtime.payment).not.toBeNull();
	});

	it('still builds the payment engine with selling off, purchases disabled (FR-19)', () => {
		const loaders = recordingLoaders();
		createMonetizationRuntime(deps({ ...loaders, env: { ...APP_ENV, sellingEnabled: false } }));
		expect(loaders.createEngine).toHaveBeenCalledWith(
			expect.objectContaining({ enabled: false }),
			expect.anything(),
		);
	});
});
