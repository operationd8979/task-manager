/**
 * Build environment for ads and payments (plan D-2, D-3).
 *
 * The values live in `appEnv*.ts` next to this file. Which one is bundled is
 * decided when Metro builds the bundle — see metro.config.js — so a release
 * build cannot pick up another build's ad units at runtime.
 */
export type AppEnvironmentName = 'development' | 'test' | 'production';

export interface AppEnvironment {
	name: AppEnvironmentName;
	/** Build-time kill switch for every ad surface (FR-19). */
	adsEnabled: boolean;
	/** Build-time kill switch for selling. Owners stay ad-free (FR-19). */
	sellingEnabled: boolean;
	adsEnvironment: AppEnvironmentName;
	/**
	 * `test` builds use `production` here: licence-tester purchases are real Play
	 * transactions, which the payment SDK refuses outside `production` (D-3).
	 */
	paymentEnvironment: 'development' | 'production';
	bannerUnitId: string;
	interstitialUnitId: string;
	removeAdsProductId: string;
}

/**
 * Google's official test units (Android). Development and test builds use only
 * these; scripts/check-release-config.mjs fails a production build that does.
 */
export const GOOGLE_TEST_AD_UNIT = {
	banner: 'ca-app-pub-3940256099942544/9214589741',
	interstitial: 'ca-app-pub-3940256099942544/1033173712',
} as const;

/** The Play product id of the one-time "Remove ads" in-app product. */
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';
