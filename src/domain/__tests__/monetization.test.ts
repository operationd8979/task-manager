import {
	effectivePurchaseStatus,
	interstitialStep,
	isInterstitialDue,
	nextInterstitialCount,
	shouldPreloadInterstitial,
	type Interruption,
	isPendingShown,
	latchOwned,
	PENDING_MARKER_TTL_MS,
	removeAdsSectionState,
	toAdsEnablement,
	toPurchaseOutcome,
	toPurchaseStatus,
} from '../monetization';

describe('the interstitial counter (FR-11)', () => {
	it('is due from the third new item and preloads from the second', () => {
		expect(nextInterstitialCount(0)).toBe(1);
		expect([1, 2, 3, 4].map(isInterstitialDue)).toEqual([false, false, true, true]);
		expect([1, 2, 3].map(shouldPreloadInterstitial)).toEqual([false, true, true]);
	});
});

describe('interstitialStep (D-13; FR-10, AC-8.5, AC-8.6)', () => {
	const set = (...reasons: Interruption[]) => new Set<Interruption>(reasons);

	it('waits until the saved item is on screen (AC-8.1)', () => {
		expect(interstitialStep({ previous: set(), current: set(), savedItemShown: false })).toBe('wait');
		expect(interstitialStep({ previous: set(), current: set(), savedItemShown: true })).toBe('show');
	});

	it('waits out a permission prompt or undo toast already up (AC-8.5)', () => {
		expect(
			interstitialStep({ previous: set('permission'), current: set('permission'), savedItemShown: true }),
		).toBe('wait');
		expect(interstitialStep({ previous: set('undo'), current: set('undo'), savedItemShown: true })).toBe(
			'wait',
		);
	});

	it('waits for the closing form to go, then shows', () => {
		expect(interstitialStep({ previous: set(), current: set('overlay'), savedItemShown: false })).toBe(
			'cancel',
		);
		expect(
			interstitialStep({ previous: set('overlay'), current: set('overlay'), savedItemShown: false }),
		).toBe('wait');
		expect(interstitialStep({ previous: set('overlay'), current: set(), savedItemShown: true })).toBe('show');
	});

	it('cancels when a sheet or drag starts during the wait (AC-8.6)', () => {
		expect(interstitialStep({ previous: set(), current: set('overlay'), savedItemShown: true })).toBe(
			'cancel',
		);
		expect(interstitialStep({ previous: set('undo'), current: set('undo', 'drag'), savedItemShown: true })).toBe(
			'cancel',
		);
	});

	it('cancels on leaving the app, but not for the permission prompt pausing it (D-13)', () => {
		expect(interstitialStep({ previous: set(), current: set('background'), savedItemShown: true })).toBe(
			'cancel',
		);
		expect(
			interstitialStep({
				previous: set('permission'),
				current: set('permission', 'background'),
				savedItemShown: true,
			}),
		).toBe('wait');
	});
});

describe('toPurchaseOutcome (FR-16)', () => {
	it.each([
		['success', 'success'],
		['user_cancelled', 'cancelled'],
		['pending', 'pending'],
		['already_owned', 'restored'],
		['product_unavailable_in_region', 'unavailable'],
		['environment_blocked', 'devBlocked'],
		['purchase_in_progress', 'busy'],
		['network_error', 'error'],
		['store_error', 'error'],
		['timeout', 'error'],
		['something_new', 'error'],
	])('maps %s to %s', (kind, outcome) => {
		expect(toPurchaseOutcome(kind)).toBe(outcome);
	});
});

describe('isPendingShown (D-18)', () => {
	const since = 1_000_000;
	it('shows a fresh marker for a purchase not yet owned (AC-5.2)', () => {
		expect(isPendingShown(since, since + 60_000, 'not_owned')).toBe(true);
		expect(isPendingShown(since, since + 60_000, 'unknown')).toBe(true);
	});
	it('stops once owned (AC-5.3, AC-5.4)', () => {
		expect(isPendingShown(since, since + 60_000, 'owned')).toBe(false);
	});
	it('expires after the TTL so a declined payment offers Buy again (AC-5.5)', () => {
		expect(isPendingShown(since, since + PENDING_MARKER_TTL_MS, 'not_owned')).toBe(false);
	});
	it('ignores a marker from the future (clock moved back)', () => {
		expect(isPendingShown(since, since - 1, 'not_owned')).toBe(false);
	});
	it('shows nothing without a marker', () => {
		expect(isPendingShown(null, since, 'not_owned')).toBe(false);
	});
});

describe('removeAdsSectionState (SCR-3)', () => {
	const base = { supported: true, storeAvailable: true, purchase: 'not_owned' as const, pending: false };
	it('is hidden where there is no payment engine (FR-15)', () => {
		expect(removeAdsSectionState({ ...base, supported: false })).toBe('hidden');
	});
	it('keeps an owner as owned even when the store is unreachable (AC-1.6)', () => {
		expect(removeAdsSectionState({ ...base, purchase: 'owned', storeAvailable: false })).toBe('owned');
	});
	it('says purchases are unavailable on a device without store billing (FR-15)', () => {
		expect(removeAdsSectionState({ ...base, storeAvailable: false })).toBe('unavailable');
	});
	it('shows pending before buy, and checking while unknown', () => {
		expect(removeAdsSectionState({ ...base, pending: true })).toBe('pending');
		expect(removeAdsSectionState({ ...base, purchase: 'unknown' })).toBe('checking');
		expect(removeAdsSectionState(base)).toBe('buy');
	});
});

describe('toPurchaseStatus (FR-1)', () => {
	it('maps the three entitlement states one to one', () => {
		expect(toPurchaseStatus('entitled')).toBe('owned');
		expect(toPurchaseStatus('not_entitled')).toBe('not_owned');
		expect(toPurchaseStatus('unknown')).toBe('unknown');
	});
});

describe('toAdsEnablement', () => {
	it('holds ads while the status is unknown — never "not owned" by default (FR-1)', () => {
		expect(toAdsEnablement('unknown', false, true)).toBe('undecided');
	});

	it('turns ads off for an owner and on only for a confirmed non-owner', () => {
		expect(toAdsEnablement('owned', false, true)).toBe('disabled');
		expect(toAdsEnablement('not_owned', false, true)).toBe('enabled');
	});

	it('keeps ads off once owned was seen in this process, even after a revocation (FR-3)', () => {
		expect(toAdsEnablement('not_owned', true, true)).toBe('disabled');
		expect(toAdsEnablement('unknown', true, true)).toBe('disabled');
	});

	it('is a settled no in a build that ships without ads (FR-19)', () => {
		expect(toAdsEnablement('not_owned', false, false)).toBe('disabled');
		expect(toAdsEnablement('unknown', false, false)).toBe('disabled');
	});
});

describe('the per-process ownership latch (D-9)', () => {
	it('closes on owned and never reopens within the process', () => {
		let latched = latchOwned(false, 'unknown');
		expect(latched).toBe(false);
		latched = latchOwned(latched, 'owned');
		latched = latchOwned(latched, 'not_owned');
		expect(latched).toBe(true);
		expect(effectivePurchaseStatus('not_owned', latched)).toBe('owned');
	});

	it('starts open on a cold start, so a refund shows from the next launch (AC-9.1)', () => {
		expect(effectivePurchaseStatus('not_owned', latchOwned(false, 'not_owned'))).toBe(
			'not_owned',
		);
	});
});
