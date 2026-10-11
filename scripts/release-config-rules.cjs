/**
 * Rules behind scripts/check-release-config.mjs (specs/002-ads-and-remove-ads
 * AC-7.4, FR-18). Pure: every input is passed in, so the rules are tested
 * without touching the file system (scripts/__tests__/release-config-rules.test.js).
 */

/** Google's sample publisher. Every official test app id and ad unit uses it. */
const TEST_PUBLISHER = '3940256099942544';
const REAL_APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const REAL_AD_UNIT = /^ca-app-pub-\d{16}\/\d{10}$/;
const UNIT_FIELDS = ['bannerUnitId', 'interstitialUnitId'];

const EXPECTED_MODES = {
	development: { adsEnvironment: 'development', paymentEnvironment: 'development' },
	test: { adsEnvironment: 'test', paymentEnvironment: 'production' },
	production: { adsEnvironment: 'production', paymentEnvironment: 'production' },
};

/**
 * Reads `field: <value>` out of an appEnv*.ts source. Returns
 * `{ kind: 'literal', value }` for a quoted string, `{ kind: 'reference', value }`
 * for an identifier path such as GOOGLE_TEST_AD_UNIT.banner, or null.
 */
function readField(source, field) {
	const match = new RegExp(`\\b${field}\\s*:\\s*([^,\\n]+)`).exec(source);
	if (!match) {
		return null;
	}
	const raw = match[1].trim();
	const quoted = /^(['"`])(.*)\1$/.exec(raw);
	return quoted
		? { kind: 'literal', value: quoted[2] }
		: { kind: 'reference', value: raw };
}

function isTestUnit(field) {
	if (field === null) {
		return false;
	}
	return field.kind === 'reference'
		? field.value.startsWith('GOOGLE_TEST_AD_UNIT.')
		: field.value.includes(TEST_PUBLISHER);
}

function checkModes(name, source, problems) {
	for (const [field, expected] of Object.entries(EXPECTED_MODES[name])) {
		const actual = readField(source, field);
		if (actual === null || actual.value !== expected) {
			problems.push(`${name}: ${field} must be '${expected}'`);
		}
	}
}

/**
 * @param {object} input
 * @param {'development'|'test'|'production'} input.env   the build being made
 * @param {Record<'development'|'test'|'production', string>} input.envSources
 * @param {string} input.testUnitsSource  environment.ts, which defines GOOGLE_TEST_AD_UNIT
 * @param {{ 'react-native-google-mobile-ads'?: { android_app_id?: string } }} input.appJson
 * @param {boolean} input.hasUploadKey
 * @returns {string[]} problems; empty means the build may proceed
 */
function checkReleaseConfig(input) {
	const problems = [];
	if (!(input.env in EXPECTED_MODES)) {
		return [`unknown environment '${input.env}'`];
	}

	// The test units themselves must be Google's, or "test" means nothing.
	if (
		(input.testUnitsSource.match(new RegExp(TEST_PUBLISHER, 'g')) || []).length <
		UNIT_FIELDS.length
	) {
		problems.push('environment.ts: GOOGLE_TEST_AD_UNIT must use Google test units');
	}

	// Non-production builds may never carry a real unit, whatever is being built.
	for (const name of ['development', 'test']) {
		const source = input.envSources[name];
		checkModes(name, source, problems);
		for (const field of UNIT_FIELDS) {
			if (!isTestUnit(readField(source, field))) {
				problems.push(`${name}: ${field} must be a Google test unit`);
			}
		}
	}

	if (input.env !== 'production') {
		return problems;
	}

	const production = input.envSources.production;
	checkModes('production', production, problems);
	for (const field of UNIT_FIELDS) {
		const value = readField(production, field);
		if (value === null || value.kind !== 'literal' || !REAL_AD_UNIT.test(value.value)) {
			problems.push(`production: ${field} must be a real AdMob unit id`);
		} else if (value.value.includes(TEST_PUBLISHER)) {
			problems.push(`production: ${field} is a Google test unit`);
		}
	}
	const product = readField(production, 'removeAdsProductId');
	if (product === null || (product.kind === 'literal' && product.value === '')) {
		problems.push('production: removeAdsProductId is missing');
	}

	const appId =
		(input.appJson['react-native-google-mobile-ads'] || {}).android_app_id || '';
	if (!REAL_APP_ID.test(appId) || appId.includes(TEST_PUBLISHER)) {
		problems.push('app.json: android_app_id must be the real AdMob app id');
	}
	if (!input.hasUploadKey) {
		problems.push('signing: TM_UPLOAD_STORE_FILE is not configured (debug key)');
	}
	return problems;
}

module.exports = { checkReleaseConfig, TEST_PUBLISHER };
