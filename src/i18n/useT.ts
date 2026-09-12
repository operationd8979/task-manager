import { useLocale } from '@chipmobilesdk/rn-i18n';

import { i18n } from './index';
import type { Translate } from './index';

/**
 * One bound lookup per language, shared by every component.
 *
 * The map never holds more than the three configured locales, and handing every
 * caller the SAME binding for a given language is what makes `t` cheap to
 * compare: a prop or a dependency list holding it changes when the language
 * changes and at no other time.
 */
const BOUND = new Map<string, Translate>();

function boundFor(locale: string): Translate {
	const existing = BOUND.get(locale);
	if (existing) {
		return existing;
	}
	// The closure does not capture the locale — `i18n.t` reads the active one at
	// call time, which is what keeps a stale binding impossible. What the locale
	// buys here is IDENTITY, and identity is the whole point.
	const bound: Translate = (key, vars, options) => i18n.t(key, vars, options);
	BOUND.set(locale, bound);
	return bound;
}

/**
 * The translation function, bound to the active language.
 *
 * A thin wrapper over the SDK's `useTranslation`, kept for one reason worth the
 * indirection: the SDK builds a fresh closure on every render, so `t` can never
 * go into a `useMemo` or `useCallback` dependency list without defeating the
 * memo. Leaving it OUT of that list is worse — the value freezes at the
 * language of the first render, which is how a timeline goes on saying
 * "QUÁ HẠN" after the user switches to English. Both halves of that trade are
 * real, and `react-hooks/exhaustive-deps` found four of them in this app the
 * first time the hook went in.
 *
 * `useLocale()` supplies the subscription, so a language change still re-renders
 * every component that calls this — and now the memoised values inside them
 * recompute too, exactly once, because their dependency moved (SC-006).
 *
 * It also carries the app's key type, so no caller repeats the generic.
 */
export function useT(): Translate {
	const { locale } = useLocale();
	return boundFor(locale);
}
