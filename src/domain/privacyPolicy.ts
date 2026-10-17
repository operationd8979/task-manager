/**
 * Where the published privacy policy lives (specs/002 US-10, plan D-23).
 *
 * The developer website's origin — `https://` and no trailing slash — or `null`
 * until a site is published. It is the developer's one site for all their apps,
 * each under its own path, and also the website named in every Play listing,
 * because AdMob reads `app-ads.txt` from the root of that origin.
 * scripts/release-config-rules.cjs refuses a test or production AAB while this
 * is not an `https://` origin (AC-7.5).
 */
export const PRIVACY_POLICY_SITE: string | null = 'https://operationd8979.github.io';

/** Error-log code for a policy page the device could not open (AC-10.3). */
export const PRIVACY_POLICY_OPEN_FAILED_CODE = 'legal.privacy_policy_open_failed';

const POLICY_PATH = '/task-manager/privacy/';

/** One page per shipped language, keyed by the locale's language subtag. */
const POLICY_LANGUAGES = ['vi', 'en', 'ja'] as const;
type PolicyLanguage = (typeof POLICY_LANGUAGES)[number];

/** Vietnamese is the primary locale, the end of every fallback chain. */
const DEFAULT_POLICY_LANGUAGE: PolicyLanguage = 'vi';

function policyLanguage(locale: string): PolicyLanguage {
	const language = locale.split(/[-_]/)[0]?.toLowerCase();
	return POLICY_LANGUAGES.find(candidate => candidate === language) ?? DEFAULT_POLICY_LANGUAGE;
}

/** The policy page in the app's language, or `null` while no site is published. */
export function privacyPolicyUrl(
	locale: string,
	site: string | null = PRIVACY_POLICY_SITE,
): string | null {
	if (site === null || site === '') {
		return null;
	}
	return `${site}${POLICY_PATH}${policyLanguage(locale)}/`;
}
