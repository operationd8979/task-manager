import { REMOVE_ADS_PRODUCT_ID, type AppEnvironment } from './environment';

/**
 * Production — the build released to the production track (APP_ENV=production).
 *
 * The ad unit ids are filled in once the AdMob units exist (spec FR-24). Until
 * then they are empty: createAds rejects an empty unit, the runtime reports ads
 * as unavailable instead of crashing, and scripts/check-release-config.mjs
 * refuses to build a production release at all.
 */
export const APP_ENV: AppEnvironment = {
	name: 'production',
	adsEnabled: true,
	sellingEnabled: true,
	adsEnvironment: 'production',
	paymentEnvironment: 'production',
	bannerUnitId: '',
	interstitialUnitId: '',
	removeAdsProductId: REMOVE_ADS_PRODUCT_ID,
};
