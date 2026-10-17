const { checkReleaseConfig } = require('../release-config-rules.cjs');

const TEST_UNITS = `export const GOOGLE_TEST_AD_UNIT = {
	banner: 'ca-app-pub-3940256099942544/9214589741',
	interstitial: 'ca-app-pub-3940256099942544/1033173712',
} as const;`;

const envSource = ({ name, ads, payment, banner, interstitial, product = 'REMOVE_ADS_PRODUCT_ID' }) => `
export const APP_ENV: AppEnvironment = {
	name: '${name}',
	adsEnvironment: '${ads}',
	paymentEnvironment: '${payment}',
	bannerUnitId: ${banner},
	interstitialUnitId: ${interstitial},
	removeAdsProductId: ${product},
};`;

const development = envSource({
	name: 'development',
	ads: 'development',
	payment: 'development',
	banner: 'GOOGLE_TEST_AD_UNIT.banner',
	interstitial: 'GOOGLE_TEST_AD_UNIT.interstitial',
});
const test = envSource({
	name: 'test',
	ads: 'test',
	payment: 'production',
	banner: 'GOOGLE_TEST_AD_UNIT.banner',
	interstitial: 'GOOGLE_TEST_AD_UNIT.interstitial',
});
const unfilledProduction = envSource({
	name: 'production',
	ads: 'production',
	payment: 'production',
	banner: "''",
	interstitial: "''",
});
const realProduction = envSource({
	name: 'production',
	ads: 'production',
	payment: 'production',
	banner: "'ca-app-pub-1234567890123456/1111111111'",
	interstitial: "'ca-app-pub-1234567890123456/2222222222'",
});

const TEST_APP = { 'react-native-google-mobile-ads': { android_app_id: 'ca-app-pub-3940256099942544~3347511713' } };
const REAL_APP = { 'react-native-google-mobile-ads': { android_app_id: 'ca-app-pub-1234567890123456~9999999999' } };

const policySource = site =>
	`export const PRIVACY_POLICY_SITE: string | null = ${site};\nexport const OTHER = 1;`;
const PUBLISHED_POLICY = policySource("'https://owner.github.io'");
const UNPUBLISHED_POLICY = policySource('null');
const POLICY_PROBLEM = 'privacyPolicy.ts: PRIVACY_POLICY_SITE must be the published https:// origin';
const AAB_KEY_PROBLEM = 'signing: an AAB needs TM_UPLOAD_STORE_FILE (Play refuses the debug key)';

const run = overrides =>
	checkReleaseConfig({
		env: 'production',
		envSources: { development, test, production: realProduction },
		testUnitsSource: TEST_UNITS,
		privacyPolicySource: PUBLISHED_POLICY,
		appJson: REAL_APP,
		hasUploadKey: true,
		...overrides,
	});

describe('checkReleaseConfig (AC-7.4)', () => {
	it('passes a test build that carries only test units, whatever production holds', () => {
		expect(
			run({ env: 'test', envSources: { development, test, production: unfilledProduction }, appJson: TEST_APP, hasUploadKey: false }),
		).toEqual([]);
	});

	it('passes a fully configured production build', () => {
		expect(run({})).toEqual([]);
	});

	it('fails production on the test app id, empty units and the debug key', () => {
		const problems = run({
			envSources: { development, test, production: unfilledProduction },
			appJson: TEST_APP,
			hasUploadKey: false,
		});
		expect(problems).toEqual(
			expect.arrayContaining([
				'production: bannerUnitId must be a real AdMob unit id',
				'production: interstitialUnitId must be a real AdMob unit id',
				'app.json: android_app_id must be the real AdMob app id',
				'signing: TM_UPLOAD_STORE_FILE is not configured (debug key)',
			]),
		);
	});

	it('fails production when it points at the test units', () => {
		const problems = run({
			envSources: {
				development,
				test,
				production: envSource({
					name: 'production',
					ads: 'production',
					payment: 'production',
					banner: 'GOOGLE_TEST_AD_UNIT.banner',
					interstitial: "'ca-app-pub-3940256099942544/1033173712'",
				}),
			},
		});
		expect(problems).toEqual(
			expect.arrayContaining([
				'production: bannerUnitId must be a real AdMob unit id',
				'production: interstitialUnitId is a Google test unit',
			]),
		);
	});

	it('fails any build when a non-production file carries a real unit', () => {
		const leaky = envSource({
			name: 'test',
			ads: 'test',
			payment: 'production',
			banner: "'ca-app-pub-1234567890123456/1111111111'",
			interstitial: 'GOOGLE_TEST_AD_UNIT.interstitial',
		});
		expect(run({ env: 'development', envSources: { development, test: leaky, production: realProduction } })).toEqual([
			'test: bannerUnitId must be a Google test unit',
		]);
	});

	it('fails a test build whose payments are not in production mode (licence testers, D-3)', () => {
		const wrongMode = envSource({
			name: 'test',
			ads: 'test',
			payment: 'development',
			banner: 'GOOGLE_TEST_AD_UNIT.banner',
			interstitial: 'GOOGLE_TEST_AD_UNIT.interstitial',
		});
		expect(run({ env: 'test', envSources: { development, test: wrongMode, production: realProduction } })).toEqual([
			"test: paymentEnvironment must be 'production'",
		]);
	});

	it('rejects an unknown environment', () => {
		expect(run({ env: 'staging' })).toEqual(["unknown environment 'staging'"]);
	});
});

describe('checkReleaseConfig release candidates (AC-7.5, plan D-25)', () => {
	const testBuild = { env: 'test', appJson: TEST_APP };

	it('fails a test AAB with no published policy and no upload key', () => {
		expect(
			run({ ...testBuild, format: 'aab', privacyPolicySource: UNPUBLISHED_POLICY, hasUploadKey: false }),
		).toEqual([AAB_KEY_PROBLEM, POLICY_PROBLEM]);
	});

	it('passes a test AAB with the published policy and the upload key', () => {
		expect(run({ ...testBuild, format: 'aab' })).toEqual([]);
	});

	it('still lets a local test APK through on the debug key with no policy yet', () => {
		expect(
			run({ ...testBuild, format: 'apk', privacyPolicySource: UNPUBLISHED_POLICY, hasUploadKey: false }),
		).toEqual([]);
	});

	it('fails any production build with no published policy', () => {
		expect(run({ privacyPolicySource: UNPUBLISHED_POLICY })).toEqual([POLICY_PROBLEM]);
	});

	it.each([
		["'http://owner.github.io'"],
		["'https://owner.github.io/'"],
		["'https://owner.github.io/task-manager'"],
		["''"],
	])('refuses %s as the policy site', site => {
		expect(run({ privacyPolicySource: policySource(site) })).toEqual([POLICY_PROBLEM]);
	});

	it('asks a development AAB only for the upload key', () => {
		expect(
			run({ env: 'development', format: 'aab', privacyPolicySource: UNPUBLISHED_POLICY, hasUploadKey: false }),
		).toEqual([AAB_KEY_PROBLEM]);
	});

	it('rejects an unknown format', () => {
		expect(run({ format: 'ipa' })).toEqual(["unknown format 'ipa'"]);
	});
});
