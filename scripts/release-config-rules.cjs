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
const FORMATS = new Set(['apk', 'aab']);
/** An https origin with no path and no trailing slash (src/domain/privacyPolicy.ts). */
const PUBLISHED_SITE = /^https:\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * Reads the `PRIVACY_POLICY_SITE` constant out of src/domain/privacyPolicy.ts.
 * Returns the quoted string, or null for `null`, an empty string or no match.
 */
function readPrivacySite(source) {
	const match = /\bPRIVACY_POLICY_SITE\b[^=\n]*=\s*([^;\n]+)/.exec(source || '');
	if (!match) {
		return null;
	}
	const quoted = /^(['"`])(.*)\1$/.exec(match[1].trim());
	return quoted && quoted[2] !== '' ? quoted[2] : null;
}

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
 * A release candidate is anything that can reach Play: an AAB of any
 * environment, or any production build (plan D-25, AC-7.5). A local release
 * APK of a non-production environment is not one, so device checks can still
 * be signed with the debug key.
 *
 * @param {object} input
 * @param {'development'|'test'|'production'} input.env   the build being made
 * @param {'apk'|'aab'} [input.format]  the artifact being made; defaults to 'apk'
 * @param {Record<'development'|'test'|'production', string>} input.envSources
 * @param {string} input.testUnitsSource  environment.ts, which defines GOOGLE_TEST_AD_UNIT
 * @param {string} [input.privacyPolicySource]  src/domain/privacyPolicy.ts
 * @param {{ 'react-native-google-mobile-ads'?: { android_app_id?: string } }} input.appJson
 * @param {boolean} input.hasUploadKey
 * @returns {string[]} problems; empty means the build may proceed
 */
function checkReleaseConfig(input) {
	if (!(input.env in EXPECTED_MODES)) {
		return [`unknown environment '${input.env}'`];
	}
	const format = input.format || 'apk';
	if (!FORMATS.has(format)) {
		return [`unknown format '${format}'`];
	}
	const problems = checkReleaseCandidate(input.env, format, input);
	checkNonProduction(input, problems);
	if (input.env === 'production') {
		checkProduction(input, problems);
	}
	return problems;
}

/** What only a build that can reach Play must satisfy (plan D-25, AC-7.5). */
function checkReleaseCandidate(env, format, input) {
	const problems = [];
	// Play refuses an AAB signed with the debug key, whatever it carries.
	// checkProduction says the same for every production build.
	if (format === 'aab' && env !== 'production' && !input.hasUploadKey) {
		problems.push('signing: an AAB needs TM_UPLOAD_STORE_FILE (Play refuses the debug key)');
	}
	// Play Console and the in-app entry need a published policy (FR-24, US-10).
	const releaseCandidate = env === 'production' || format === 'aab';
	if (releaseCandidate && env !== 'development') {
		const site = readPrivacySite(input.privacyPolicySource);
		if (site === null || !PUBLISHED_SITE.test(site)) {
			problems.push(
				'privacyPolicy.ts: PRIVACY_POLICY_SITE must be the published https:// origin',
			);
		}
	}
	return problems;
}

/** Rules every build obeys, whichever environment is being made. */
function checkNonProduction(input, problems) {
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
}

/** Real units, the real app id and the upload key (AC-7.4, FR-24). */
function checkProduction(input, problems) {
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
}

module.exports = { checkReleaseConfig, TEST_PUBLISHER };
