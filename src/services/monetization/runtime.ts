import { Platform } from 'react-native';
import type * as AdsModule from '@chipmobilesdk/rn-ads';
import type * as PaymentModule from '@chipmobilesdk/rn-payment';

import { APP_ENV } from './appEnv';
import { buildAdsConfig, buildPaymentConfig } from './catalog';
import type { AppEnvironment } from './environment';

export type AdsInstance = AdsModule.AdsInstance;
export type PaymentEngine = ReturnType<typeof PaymentModule.createEngine>;

/**
 * The two SDK instances, created once per process (plan D-1).
 *
 * Process-scoped rather than owned by a provider: "Delete all data" reboots the
 * provider tree, and a remount would re-run initialization and re-request the
 * banner straight into the SDK's 60 s request floor.
 */
export interface MonetizationRuntime {
	env: AppEnvironment;
	ads: AdsInstance | null;
	payment: PaymentEngine | null;
	AdsProvider: typeof AdsModule.AdsProvider | null;
	AdsBanner: typeof AdsModule.AdsBanner | null;
	/** Error-log codes for SDKs that could not be constructed (FR-13, FR-22). */
	startupFailures: readonly string[];
}

export interface RuntimeDeps {
	platform: string;
	isDevBuild: boolean;
	env: AppEnvironment;
	loadAds: () => typeof AdsModule;
	loadPayment: () => typeof PaymentModule;
	/** Test seams: the SDKs' own fakes. */
	adsOptions?: Parameters<typeof AdsModule.createAds>[1];
	storeProvider?: ReturnType<typeof PaymentModule.createStoreProvider>;
}

export function createMonetizationRuntime(deps: RuntimeDeps): MonetizationRuntime {
	const runtime: MonetizationRuntime = {
		env: deps.env,
		ads: null,
		payment: null,
		AdsProvider: null,
		AdsBanner: null,
		startupFailures: [],
	};
	// Android only (FR-15). Returning before the loaders run is what keeps iOS
	// from ever evaluating either bridge (plan D-12).
	if (deps.platform !== 'android') {
		return runtime;
	}
	const failures: string[] = [];

	if (deps.env.adsEnabled) {
		try {
			const ads = deps.loadAds();
			runtime.ads = ads.createAds(buildAdsConfig(deps.env), deps.adsOptions);
			runtime.AdsProvider = ads.AdsProvider;
			runtime.AdsBanner = ads.AdsBanner;
		} catch {
			// A malformed catalog — e.g. a production build whose units are not
			// filled in yet — costs the ads, never the app.
			failures.push('ads.config_unavailable');
		}
	}

	try {
		const payment = deps.loadPayment();
		runtime.payment = payment.createEngine(
			buildPaymentConfig(deps.env, !deps.isDevBuild),
			{ provider: deps.storeProvider ?? payment.createStoreProvider() },
		);
	} catch {
		failures.push('payment.config_unavailable');
	}

	runtime.startupFailures = failures;
	return runtime;
}

let instance: MonetizationRuntime | undefined;

export function getMonetizationRuntime(): MonetizationRuntime {
	instance ??= createMonetizationRuntime({
		platform: Platform.OS,
		isDevBuild: __DEV__,
		env: APP_ENV,
		// Required lazily, inside the Android branch above.
		loadAds: () => require('@chipmobilesdk/rn-ads'),
		loadPayment: () => require('@chipmobilesdk/rn-payment'),
	});
	return instance;
}
