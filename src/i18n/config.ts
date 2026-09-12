import type { LocaleConfig } from '@chipmobilesdk/rn-i18n';

/**
 * The three languages the app ships.
 *
 * `displayName` is the ENDONYM — each language written in itself. A language
 * picker that translated its own options would show a Japanese reader the word
 * "Japanese" in a script they may be looking at precisely because they cannot
 * read the current one. The names below are the one place in the app that is
 * deliberately not translated.
 */
export const VIETNAMESE = 'vi-VN';
export const ENGLISH = 'en-US';
export const JAPANESE = 'ja-JP';

/**
 * Vietnamese is primary: it is the language the app was written in, the only
 * catalogue guaranteed complete, and therefore the end of every fallback chain.
 *
 * The chains are acyclic by construction (the SDK rejects cycles) and fan
 * inward rather than pairwise: `ja → en → vi`. A key that somehow went missing
 * from Japanese is served in English before Vietnamese, which is the order a
 * reader of Japanese is most likely to get something out of.
 */
export const LOCALES: LocaleConfig[] = [
	{
		code: VIETNAMESE,
		displayName: 'Tiếng Việt',
		direction: 'ltr',
		fallbackChain: [],
		defaultCurrency: 'VND',
		defaultUnit: 'kilometer',
		defaultDateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },
		defaultNumberFormat: { maximumFractionDigits: 0 },
	},
	{
		code: ENGLISH,
		displayName: 'English',
		direction: 'ltr',
		fallbackChain: [VIETNAMESE],
		defaultCurrency: 'USD',
		defaultUnit: 'mile',
		defaultDateFormat: { year: 'numeric', month: 'short', day: 'numeric' },
		defaultNumberFormat: { maximumFractionDigits: 0 },
	},
	{
		code: JAPANESE,
		displayName: '日本語',
		direction: 'ltr',
		fallbackChain: [ENGLISH, VIETNAMESE],
		defaultCurrency: 'JPY',
		defaultUnit: 'kilometer',
		defaultDateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
		defaultNumberFormat: { maximumFractionDigits: 0 },
	},
];

export const PRIMARY_LOCALE = VIETNAMESE;
