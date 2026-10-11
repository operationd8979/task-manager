import {
	createInterstitialController,
	type InterstitialController,
} from './interstitial';
import {
	createMonetizationLocalStore,
	type MonetizationLocalStore,
} from './localStore';
import { createPurchasing, type Purchasing } from './purchasing';
import type { AdsInstance, MonetizationRuntime } from './runtime';
import { getMonetizationRuntime } from './runtime';
import { createMonetizationWiring, type MonetizationWiring } from './wiring';

/**
 * Our own privacy gate is open; Google's consent flow (run below) is the one
 * that decides in consent regions, and the SDK combines the two as
 * most-restrictive-wins. These flags only take effect if they reach the
 * provider before it starts, which is why they are fixed here.
 */
const PRIVACY = {
	canRequestAds: true,
	consentUndetermined: false,
	childDirected: false,
	underAgeOfConsent: false,
	maxAdContentRating: 'PG',
	personalizedAds: true,
} as const;

export interface MonetizationSession {
	runtime: MonetizationRuntime;
	wiring: MonetizationWiring;
	store: MonetizationLocalStore;
	/** Null when there is no payment engine (iOS, or it failed to start). */
	purchasing: Purchasing | null;
	interstitial: InterstitialController;
}

let session: MonetizationSession | undefined;
let paymentsStarted = false;
let adsReady: Promise<void> | null = null;

/**
 * Process-scoped, like the runtime (plan D-1): the ownership latch inside the
 * wiring must survive a provider remount, or "Delete all data" would forget
 * that this process already saw the purchase (FR-3).
 */
export function getMonetizationSession(): MonetizationSession {
	if (session === undefined) {
		const runtime = getMonetizationRuntime();
		const wiring = createMonetizationWiring({
			entitlements: runtime.payment,
			ads: runtime.ads,
			adsEnabledInBuild: runtime.env.adsEnabled,
		});
		const store = createMonetizationLocalStore();
		session = {
			runtime,
			wiring,
			store,
			purchasing: runtime.payment ? createPurchasing(runtime.payment) : null,
			interstitial: createInterstitialController({
				ads: runtime.ads,
				store,
				// Owners never get one, latched for the whole process (AC-1.5, FR-3).
				adsActive: () => wiring.getSnapshot().adsEnablement === 'enabled',
			}),
		};
	}
	return session;
}

/** Connects billing and starts the first sync. Idempotent, never throws. */
export function startPayments(runtime: MonetizationRuntime): void {
	if (paymentsStarted || runtime.payment === null) {
		return;
	}
	paymentsStarted = true;
	runtime.payment.initialize().catch(() => {
		// The engine reports its own failures as status and events, which the
		// diagnostics forwarder logs; a rejected promise adds nothing to act on.
	});
}

export interface ConsentHooks {
	/** Resolves when the user is not in the middle of anything (AC-6.2). */
	waitUntilIdle(): Promise<void>;
	/** Marks the consent form as on screen, for the other interrupters. */
	holdWhileShowing(): () => void;
}

/**
 * Runs Google's consent flow, then initializes ads — once per process, and
 * only when ads are actually wanted (enablement `enabled`), so an owner never
 * sees the form (AC-6.5). A failure leaves the gate closed: no request is made
 * and the next launch tries again (AC-6.6).
 */
export function ensureAdsReady(ads: AdsInstance, hooks: ConsentHooks): Promise<void> {
	adsReady ??= (async () => {
		const info = await ads.consent.requestInfoUpdate();
		if (info.state === 'required') {
			await hooks.waitUntilIdle();
			const release = hooks.holdWhileShowing();
			try {
				await ads.consent.showFormIfRequired();
			} finally {
				release();
			}
		}
		await ads.initialize(PRIVACY);
	})().catch(() => {
		// Consent and initialization report failures as typed results and events
		// (logged by the diagnostics forwarder); the gate simply stays closed.
	});
	return adsReady;
}
