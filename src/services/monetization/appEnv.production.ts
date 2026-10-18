import { REMOVE_ADS_PRODUCT_ID, type AppEnvironment } from './environment';

/**
 * Production — the build released to the production track (APP_ENV=production).
 *
 * The real AdMob units (spec FR-24), named in AdMob after their placement:
 * `timeline_footer` and `task_break`. Only this build carries them; every other
 * environment uses Google's test units. scripts/check-release-config.mjs
 * refuses a production build whose units are empty or Google test units.
 */
export const APP_ENV: AppEnvironment = {
	name: 'production',
	adsEnabled: true,
	sellingEnabled: true,
	adsEnvironment: 'production',
	paymentEnvironment: 'production',
	bannerUnitId: 'ca-app-pub-3699716801502401/9659369689',
	interstitialUnitId: 'ca-app-pub-3699716801502401/5009678237',
	removeAdsProductId: REMOVE_ADS_PRODUCT_ID,
};
