/**
 * Monetization rules (specs/002-ads-and-remove-ads). Renderer-free and free of
 * any SDK type: the services layer translates SDK values into these.
 */

/** What the payment SDK reports for the `no_ads` entitlement. */
export type EntitlementStatus = 'unknown' | 'entitled' | 'not_entitled';

/** The app's view of the purchase (spec FR-1). */
export type PurchaseStatus = 'unknown' | 'owned' | 'not_owned';

/** What the ads SDK is told. `undecided` sends nothing, like `disabled`. */
export type AdsEnablement = 'enabled' | 'disabled' | 'undecided';

export function toPurchaseStatus(status: EntitlementStatus): PurchaseStatus {
	switch (status) {
		case 'entitled':
			return 'owned';
		case 'not_entitled':
			return 'not_owned';
		default:
			// Unknown is never "not owned": no timeout turns it into one (FR-1).
			return 'unknown';
	}
}

/**
 * Once the purchase has been seen as owned in this process, it stays owned
 * until the process ends (FR-3, plan D-9). A refund found by a foreground sync
 * therefore brings ads back at the next cold start, never mid-session.
 */
export function latchOwned(ownedThisProcess: boolean, status: PurchaseStatus): boolean {
	return ownedThisProcess || status === 'owned';
}

/** The status every screen should show: the reported one, unless latched. */
export function effectivePurchaseStatus(
	status: PurchaseStatus,
	ownedThisProcess: boolean,
): PurchaseStatus {
	return ownedThisProcess ? 'owned' : status;
}

/**
 * What a tap on Buy ended in, as the sheet must say it (FR-16). One case per
 * message: a cancelled purchase is normal and says nothing.
 */
export type PurchaseOutcome =
	| 'success'
	| 'cancelled'
	| 'pending'
	| 'restored'
	| 'unavailable'
	| 'devBlocked'
	| 'busy'
	| 'error';

/**
 * Maps the payment SDK's purchase result kind. Unknown kinds fall to `error`,
 * which offers Retry — the safe reading of something new.
 */
export function toPurchaseOutcome(kind: string): PurchaseOutcome {
	switch (kind) {
		case 'success':
			return 'success';
		case 'user_cancelled':
			return 'cancelled';
		case 'pending':
			return 'pending';
		// The store says this account already owns it: a re-sync was triggered, and
		// for the user it is a restore, not an error (AC-3.4).
		case 'already_owned':
			return 'restored';
		case 'product_unavailable_in_region':
		case 'unknown_product':
		case 'ineligible':
		case 'disabled':
			return 'unavailable';
		case 'environment_blocked':
			return 'devBlocked';
		// A second tap while the flow is starting: ignored, never a second flow.
		case 'purchase_in_progress':
			return 'busy';
		default:
			return 'error';
	}
}

/** A full-screen ad is due after every third new item (spec US-8, FR-11). */
export const INTERSTITIAL_EVERY = 3;

/** One new item saved from the create form; nothing else counts (FR-11). */
export function nextInterstitialCount(count: number): number {
	return count + 1;
}

export function isInterstitialDue(count: number): boolean {
	return count >= INTERSTITIAL_EVERY;
}

/**
 * Load the ad one item early, so it is ready when it falls due — and not
 * earlier, so a user who never reaches the third item costs no request (D-7).
 */
export function shouldPreloadInterstitial(count: number): boolean {
	return count >= INTERSTITIAL_EVERY - 1;
}

/** What the user can be in the middle of (mirrors lib/interruptions). */
export type Interruption =
	| 'overlay'
	| 'drag'
	| 'undo'
	| 'permission'
	| 'consent'
	| 'background';

/** Starting one of these means the user moved on: the ad is dropped (AC-8.6). */
const NEW_INTERACTIONS: ReadonlySet<Interruption> = new Set(['overlay', 'drag']);

/**
 * One step of the wait before a due full-screen ad (plan D-13; FR-10, AC-8.5,
 * AC-8.6). Called on every change of what the user is in the middle of.
 *
 * - Something that was already up when the wait began — the permission prompt,
 *   the undo toast, the closing form — is waited out.
 * - A sheet or drag that STARTS during the wait cancels it: the user is doing
 *   something new, and the counter stays due for the next new item.
 * - Going to the background cancels too, except while the permission prompt is
 *   up: Android pauses the activity to show it.
 */
export function interstitialStep(input: {
	previous: ReadonlySet<Interruption>;
	current: ReadonlySet<Interruption>;
	savedItemShown: boolean;
}): 'show' | 'wait' | 'cancel' {
	const { previous, current } = input;
	const started = [...current].filter(reason => !previous.has(reason));
	if (started.some(reason => NEW_INTERACTIONS.has(reason))) {
		return 'cancel';
	}
	if (started.includes('background') && !current.has('permission')) {
		return 'cancel';
	}
	if (current.size > 0 || !input.savedItemShown) {
		return 'wait';
	}
	return 'show';
}

/** Restore distinguishes three answers (FR-17). */
export type RestoreResult = 'restored' | 'nothingFound' | 'failed';

/**
 * The payment SDK's pending set, translated by the services layer (plan D-20).
 * `known: false` means never synced or stale — then an empty list is no answer.
 */
export interface PendingPurchases {
	known: boolean;
	productKeys: readonly string[];
}

/**
 * A payment for `productKey` is in flight, so the app says so and offers no Buy
 * (AC-5.2). It ends when the store settles it — the purchase turns owned
 * (AC-5.3, AC-5.4) — or ends it unpaid, which empties the set at the next sync
 * and brings Buy back (AC-5.5).
 *
 * An unknown set shows nothing here: the purchase status is unknown under the
 * same staleness rule, and "checking" already withholds Buy.
 */
export function isPendingShown(
	pending: PendingPurchases,
	productKey: string,
	purchase: PurchaseStatus,
): boolean {
	return pending.known && purchase !== 'owned' && pending.productKeys.includes(productKey);
}

/** Whether Google requires a "change my consent choice" entry (rn-ads 0.4.0). */
export type PrivacyOptionsRequirement = 'required' | 'not_required' | 'unknown';

/**
 * Settings' "Privacy options" entry (SCR-3, AC-6.4): only where Google says one
 * is required, and only for a purchase confirmed not owned. Owners see neither
 * ads nor consent (AC-6.5, AC-1.6), and an unknown purchase has not run the
 * consent flow, so its requirement is unknown anyway.
 */
export function isPrivacyOptionsShown(
	requirement: PrivacyOptionsRequirement,
	purchase: PurchaseStatus,
): boolean {
	return requirement === 'required' && purchase === 'not_owned';
}

/** What a tap on the entry led to, as far as the row cares (plan D-21). */
export type PrivacyOptionsOutcome = 'shown' | 'failed' | 'ignored';

/**
 * Maps the ads SDK's privacy-options result. Only `failed` is worth telling the
 * user: `shown` means Google's form did its job, and the rest — busy, not
 * required, info update first, unavailable — mean the row should not have been
 * there, and it goes away on its own as the consent state updates.
 */
export function toPrivacyOptionsOutcome(status: string): PrivacyOptionsOutcome {
	switch (status) {
		case 'shown':
			return 'shown';
		case 'failed':
			return 'failed';
		default:
			return 'ignored';
	}
}

/** What the Settings Remove-ads section shows (SCR-3). */
export type RemoveAdsSectionState =
	| 'hidden'
	| 'unavailable'
	| 'owned'
	| 'pending'
	| 'checking'
	| 'buy';

export function removeAdsSectionState(input: {
	/** False on iOS, or when the payment SDK could not start (FR-15). */
	supported: boolean;
	storeAvailable: boolean;
	purchase: PurchaseStatus;
	pending: boolean;
}): RemoveAdsSectionState {
	if (!input.supported) {
		return 'hidden';
	}
	// An owner offline or with a briefly unreachable store is still an owner.
	if (input.purchase === 'owned') {
		return 'owned';
	}
	if (!input.storeAvailable) {
		return 'unavailable';
	}
	if (input.pending) {
		return 'pending';
	}
	return input.purchase === 'unknown' ? 'checking' : 'buy';
}

/**
 * Ads run only for a purchase confirmed as not owned, and only when this build
 * ships ads (FR-1, FR-19). Consent and platform are the ads SDK's own gates.
 */
export function toAdsEnablement(
	status: PurchaseStatus,
	ownedThisProcess: boolean,
	adsEnabledInBuild: boolean,
): AdsEnablement {
	if (!adsEnabledInBuild || effectivePurchaseStatus(status, ownedThisProcess) === 'owned') {
		return 'disabled';
	}
	return status === 'not_owned' ? 'enabled' : 'undecided';
}
