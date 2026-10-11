import {
	GOOGLE_TEST_AD_UNIT,
	REMOVE_ADS_PRODUCT_ID,
	type AppEnvironment,
} from './environment';

/**
 * Test — a release-configured build uploaded to a Play testing track
 * (APP_ENV=test).
 *
 * Purchases are real Play transactions made with licence-tester accounts, so
 * payments run in `production`; ads stay on Google's test units, because a
 * tester tapping a real ad is invalid traffic (plan D-3).
 */
export const APP_ENV: AppEnvironment = {
	name: 'test',
	adsEnabled: true,
	sellingEnabled: true,
	adsEnvironment: 'test',
	paymentEnvironment: 'production',
	bannerUnitId: GOOGLE_TEST_AD_UNIT.banner,
	interstitialUnitId: GOOGLE_TEST_AD_UNIT.interstitial,
	removeAdsProductId: REMOVE_ADS_PRODUCT_ID,
};
