import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';

import {
	isPrivacyOptionsShown,
	type PrivacyOptionsOutcome,
	type PrivacyOptionsRequirement,
	type PurchaseStatus,
} from '../../domain/monetization';
import {
	forwardDiagnostics,
	MONETIZATION_OPERATION,
	PRIVACY_OPTIONS_FAILED_CODE,
} from '../../services/monetization/diagnostics';
import type { InterstitialController } from '../../services/monetization/interstitial';
import type { Purchasing } from '../../services/monetization/purchasing';
import type { MonetizationRuntime } from '../../services/monetization/runtime';
import {
	ensureAdsReady,
	getMonetizationSession,
	openPrivacyOptions as openPrivacyOptionsForm,
	startPayments,
} from '../../services/monetization/session';
import { useDatabase } from './DatabaseProvider';
import { useInterruptions } from './InterruptionProvider';

/** `restore` starts a restore as the sheet opens (plan D-16, design D-8). */
export type RemoveAdsMode = 'buy' | 'restore';

export interface MonetizationContextValue {
	/** Latched to owned for the rest of the process once seen (FR-3). */
	purchase: PurchaseStatus;
	/** Ads are wanted right now: confirmed not owned, in a build with ads. */
	adsActive: boolean;
	/** Null on iOS, in a build without ads, or when the SDK failed to start. */
	Banner: MonetizationRuntime['AdsBanner'];
	/** The Remove-ads sheet (SCR-2) the host should show, or null. */
	removeAdsRequest: { mode: RemoveAdsMode } | null;
	openRemoveAds(options?: { mode?: RemoveAdsMode }): void;
	closeRemoveAds(): void;
	/** False on iOS or when the payment SDK could not start (FR-15). */
	supported: boolean;
	/** False when this device has no usable store billing (FR-15). */
	storeAvailable: boolean;
	/** False in a build with selling switched off; Restore still works (FR-19). */
	canBuy: boolean;
	/**
	 * A Remove-ads payment is in flight, in this or an earlier session; Buy is not
	 * offered meanwhile (US-5). From the payment SDK's pending set (plan D-20).
	 */
	pending: boolean;
	purchasing: Purchasing | null;
	/** The full-screen ad after every third new item (US-8). */
	interstitial: InterstitialController;
	/** Settings shows its "Privacy options" entry (AC-6.4, AC-6.5; plan D-21). */
	privacyOptions: boolean;
	/** Opens Google's privacy options form. A failure is also logged (FR-13). */
	openPrivacyOptions(): Promise<PrivacyOptionsOutcome>;
}

/** Stand-ins where there is no ads instance (iOS, a build without ads). */
const SUBSCRIBE_NOTHING = (): (() => void) => () => undefined;
const UNKNOWN_REQUIREMENT = (): PrivacyOptionsRequirement => 'unknown';

const MonetizationContext = createContext<MonetizationContextValue | null>(null);

/**
 * Connects the process-scoped monetization session to the screen tree
 * (specs/002-ads-and-remove-ads plan D-1). It owns no SDK instance; it only
 * subscribes, so a remount after "Delete all data" changes nothing upstream.
 */
export function MonetizationProvider({ children }: { children: React.ReactNode }) {
	const { errorLog } = useDatabase();
	const interruptions = useInterruptions();
	const { runtime, wiring, store, purchasing, interstitial } = getMonetizationSession();
	const snapshot = useSyncExternalStore(wiring.subscribe, wiring.getSnapshot);
	const { payment } = runtime;

	useEffect(() => startPayments(runtime), [runtime]);

	// "Unavailable" is the store's settled no — no billing on this device. Every
	// other status, connecting included, still lets the section show (FR-15).
	const [storeAvailable, setStoreAvailable] = useState(
		() => payment !== null && payment.getStatus().kind !== 'unavailable',
	);
	useEffect(
		() => payment?.subscribeStatus(status => setStoreAvailable(status.kind !== 'unavailable')),
		[payment],
	);

	// Failures go to the local log (FR-13). The log lives on the database
	// handle, which a wipe replaces, hence the dependency.
	useEffect(
		() =>
			forwardDiagnostics(
				runtime,
				code => errorLog.report({ code, operation: MONETIZATION_OPERATION }),
				{ storePersistent: store.persistent },
			),
		[errorLog, runtime, store],
	);

	// Re-sync the purchase on every return to the foreground (FR-2), and tell the
	// ads SDK whether a full-screen ad may be shown at all.
	useEffect(() => {
		const subscription = AppState.addEventListener('change', state => {
			const active = state === 'active';
			runtime.ads?.setAppActive(active);
			if (active) {
				// Its outcome arrives as entitlement changes and events, both already
				// subscribed; the promise itself has nothing left to say.
				runtime.payment?.handleForeground().catch(() => undefined);
			}
		});
		return () => subscription.remove();
	}, [runtime]);

	const adsActive = snapshot.adsEnablement === 'enabled' && runtime.ads !== null;

	useEffect(() => {
		if (!adsActive || runtime.ads === null) {
			return;
		}
		// Once ads are ready, a counter already near due gets its ad loaded (plan
		// D-7). Consent and initialization failures leave the gate closed (AC-6.6)
		// and are logged as SDK events; there is nothing further to do here.
		ensureAdsReady(runtime.ads, {
			// Without the tracker (never in the app) there is nothing to wait for.
			waitUntilIdle: () => interruptions?.waitUntilIdle().promise ?? Promise.resolve(),
			holdWhileShowing: () => interruptions?.acquire('consent') ?? (() => undefined),
			stillWanted: () => wiring.getSnapshot().adsEnablement === 'enabled',
		})
			.then(() => interstitial.preloadIfNear())
			.catch(() => undefined);
	}, [adsActive, interruptions, runtime, interstitial, wiring]);

	const [removeAdsRequest, setRemoveAdsRequest] =
		useState<MonetizationContextValue['removeAdsRequest']>(null);
	const openRemoveAds = useCallback(
		(options?: { mode?: RemoveAdsMode }) =>
			setRemoveAdsRequest({ mode: options?.mode ?? 'buy' }),
		[],
	);
	const closeRemoveAds = useCallback(() => setRemoveAdsRequest(null), []);

	// Google's verdict on whether this user must be offered a way to change their
	// consent choice. It is known once the consent flow above has run, which only
	// happens for a purchase confirmed not owned (AC-6.4, AC-6.5).
	const subscribeConsent = useMemo(() => {
		const ads = runtime.ads;
		return ads ? (listener: () => void) => ads.consent.subscribe(() => listener()) : SUBSCRIBE_NOTHING;
	}, [runtime]);
	const readRequirement = useMemo(() => {
		const ads = runtime.ads;
		return ads ? () => ads.consent.getState().privacyOptionsRequirement : UNKNOWN_REQUIREMENT;
	}, [runtime]);
	const requirement = useSyncExternalStore(subscribeConsent, readRequirement);
	const privacyOptions = isPrivacyOptionsShown(requirement, snapshot.purchase);

	const openPrivacyOptions = useCallback(async (): Promise<PrivacyOptionsOutcome> => {
		if (runtime.ads === null) {
			return 'ignored';
		}
		const outcome = await openPrivacyOptionsForm(runtime.ads, {
			holdWhileShowing: () => interruptions?.acquire('consent') ?? (() => undefined),
		});
		if (outcome === 'failed') {
			errorLog.report({ code: PRIVACY_OPTIONS_FAILED_CODE, operation: MONETIZATION_OPERATION });
		}
		return outcome;
	}, [runtime, interruptions, errorLog]);

	const value = useMemo<MonetizationContextValue>(
		() => ({
			purchase: snapshot.purchase,
			adsActive,
			Banner: runtime.AdsBanner,
			removeAdsRequest,
			openRemoveAds,
			closeRemoveAds,
			supported: payment !== null,
			storeAvailable,
			canBuy: runtime.env.sellingEnabled,
			pending: snapshot.pending,
			purchasing,
			interstitial,
			privacyOptions,
			openPrivacyOptions,
		}),
		[
			interstitial,
			snapshot.purchase,
			adsActive,
			runtime.AdsBanner,
			runtime.env.sellingEnabled,
			removeAdsRequest,
			openRemoveAds,
			closeRemoveAds,
			payment,
			storeAvailable,
			snapshot.pending,
			purchasing,
			privacyOptions,
			openPrivacyOptions,
		],
	);

	const content = (
		<MonetizationContext.Provider value={value}>{children}</MonetizationContext.Provider>
	);
	const { AdsProvider, ads } = runtime;
	return AdsProvider && ads ? <AdsProvider instance={ads}>{content}</AdsProvider> : content;
}

/** Null outside the provider, so components still render in isolation. */
export function useMonetization(): MonetizationContextValue | null {
	return useContext(MonetizationContext);
}
