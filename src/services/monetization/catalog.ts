import type { AdsConfig } from '@chipmobilesdk/rn-ads';
import type { PaymentConfig } from '@chipmobilesdk/rn-payment';

import type { AppEnvironment } from './environment';

/** Placement keys are ours; ad unit ids appear only in the environment files. */
export const PLACEMENT = {
	timelineFooter: 'timeline_footer',
	taskBreak: 'task_break',
} as const;

/** Business code asks about the entitlement, never about a store product id. */
export const ENTITLEMENT = { noAds: 'no_ads' } as const;

export const PRODUCT = { removeAds: 'remove_ads' } as const;

export function buildAdsConfig(env: AppEnvironment): AdsConfig {
	return {
		// Undecided until the purchase status is known: zero requests, and a paying
		// user never sees an ad flash in (FR-1). A build without ads is a settled no.
		enabled: env.adsEnabled ? 'undecided' : false,
		environment: env.adsEnvironment,
		placements: [
			{
				key: PLACEMENT.timelineFooter,
				format: 'banner',
				androidAdUnitId: env.bannerUnitId,
			},
			{
				key: PLACEMENT.taskBreak,
				format: 'interstitial',
				androidAdUnitId: env.interstitialUnitId,
			},
		],
	};
}

export function buildPaymentConfig(
	env: AppEnvironment,
	isProductionBuild: boolean,
): PaymentConfig {
	return {
		catalog: [
			{
				productKey: PRODUCT.removeAds,
				productType: 'one_time_permanent',
				storeProductIds: { android: env.removeAdsProductId },
				grants: [ENTITLEMENT.noAds],
			},
		],
		entitlements: [ENTITLEMENT.noAds],
		environment: env.paymentEnvironment,
		// Off means no purchase, but the entitlement stays readable, so owners stay
		// ad-free (FR-19).
		enabled: env.sellingEnabled,
		isProductionBuild,
	};
}
