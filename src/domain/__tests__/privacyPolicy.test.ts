import { privacyPolicyUrl } from '../privacyPolicy';

const SITE = 'https://owner.github.io';

describe('privacyPolicyUrl (US-10, plan D-23)', () => {
	it.each([
		['vi-VN', 'vi'],
		['en-US', 'en'],
		['ja-JP', 'ja'],
	])('opens the %s page in its own language', (locale, language) => {
		expect(privacyPolicyUrl(locale, SITE)).toBe(
			`https://owner.github.io/task-manager/privacy/${language}/`,
		);
	});

	it('falls back to the primary language for a locale with no page', () => {
		expect(privacyPolicyUrl('fr-FR', SITE)).toBe(
			'https://owner.github.io/task-manager/privacy/vi/',
		);
	});

	it('has no address while the site is not published', () => {
		expect(privacyPolicyUrl('en-US', null)).toBeNull();
		expect(privacyPolicyUrl('en-US', '')).toBeNull();
	});
});
