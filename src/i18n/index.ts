import { getLocales } from 'react-native-localize';
import {
	createI18n,
	defaultDeviceLocaleProvider,
	type DeviceLocaleProvider,
	type TranslateOptions,
	type TranslateVars,
} from '@chipmobilesdk/rn-i18n';

import { LOCALES, PRIMARY_LOCALE } from './config';
import type { AppI18nKey } from './keys.generated';
import { localeStorage } from './storage';
import en from './locales/en-US.json';
import ja from './locales/ja-JP.json';
import vi from './locales/vi-VN.json';

/**
 * Which language the device is set to.
 *
 * `react-native-localize` is preferred over the SDK's `Intl`-backed default
 * because it reads the platform's ordered preference list rather than the one
 * locale Intl happens to resolve to — the difference shows up on a device set
 * to Japanese with English second. It is already a dependency (the notification
 * SDK needs it for time zones), so this costs nothing.
 *
 * The fallback is not defensive padding: under Jest the module is mocked, and a
 * mock that only stubs what the notification code needs must not decide the
 * language for every component test.
 */
const deviceLocale: DeviceLocaleProvider = () => {
	const tag = getLocales?.()?.[0]?.languageTag;
	return tag ?? defaultDeviceLocaleProvider();
};

/**
 * The app's single I18n instance (FR-058a).
 *
 * Configuration is validated eagerly: a missing catalogue or a broken fallback
 * chain throws here, at import time, rather than rendering raw keys on a screen
 * somebody is trying to use.
 */
export const i18n = createI18n<AppI18nKey>({
	primaryLocale: PRIMARY_LOCALE,
	locales: LOCALES,
	resources: { 'vi-VN': vi, 'en-US': en, 'ja-JP': ja },
	storage: localeStorage,
	deviceLocale,
	// A key with no translation anywhere shows the key itself. A placeholder
	// like "—" would look like a legitimately empty field and survive review;
	// `repeat.summaryDaily` on screen does not.
	missingTranslation: { mode: 'key' },
});

/**
 * The bound lookup a component gets back from `useT()`.
 *
 * Named so that a plain helper — one that is called during a render but has no
 * render of its own — can take it as a parameter instead of reaching for the
 * module-level binding below.
 */
export type Translate = (
	key: AppI18nKey,
	vars?: TranslateVars,
	options?: TranslateOptions,
) => string;

/**
 * Look up a display string outside React.
 *
 * Components use `useT()` instead — it subscribes to the active locale, so a
 * language change re-renders them. This binding exists for the places that have
 * no render to subscribe: the formatting helpers in
 * `src/lib/format.ts`, and the notification tone declarations that Android
 * shows in its own settings screen.
 */
export const t: Translate = (key, vars, options) =>
	i18n.t(key, vars, options);

export type { AppI18nKey } from './keys.generated';
export { ENGLISH, JAPANESE, LOCALES, PRIMARY_LOCALE, VIETNAMESE } from './config';
