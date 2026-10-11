import {
	GOOGLE_TEST_AD_UNIT,
	REMOVE_ADS_PRODUCT_ID,
	type AppEnvironment,
} from './environment';

/**
 * Development — debug builds and Jest.
 *
 * This is the module every import resolves to by default. Metro redirects
 * `./appEnv` to `appEnv.testtrack.ts` or `appEnv.production.ts` when APP_ENV
 * says so (metro.config.js), so TypeScript and Jest need no extra mapping.
 */
export const APP_ENV: AppEnvironment = {
	name: 'development',
	adsEnabled: true,
	sellingEnabled: true,
	adsEnvironment: 'development',
	paymentEnvironment: 'development',
	bannerUnitId: GOOGLE_TEST_AD_UNIT.banner,
	interstitialUnitId: GOOGLE_TEST_AD_UNIT.interstitial,
	removeAdsProductId: REMOVE_ADS_PRODUCT_ID,
};
