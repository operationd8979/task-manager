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

import { isPendingShown, type PurchaseStatus } from '../../domain/monetization';
import {
	forwardDiagnostics,
	MONETIZATION_OPERATION,
} from '../../services/monetization/diagnostics';
import type { InterstitialController } from '../../services/monetization/interstitial';
import type { Purchasing } from '../../services/monetization/purchasing';
import type { MonetizationRuntime } from '../../services/monetization/runtime';
import {
	ensureAdsReady,
	getMonetizationSession,
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
	/** A payment is believed pending; Buy is not offered meanwhile (US-5). */
	pending: boolean;
	markPending(): void;
	purchasing: Purchasing | null;
	/** The full-screen ad after every third new item (US-8). */
	interstitial: InterstitialController;
}

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

	// The local pending marker (plan D-18): set on a pending purchase, cleared
	// once owned or after its TTL, so a declined payment eventually offers Buy.
	const [pendingSince, setPendingSince] = useState(() => store.getPendingSince());
	const pending = isPendingShown(pendingSince, Date.now(), snapshot.purchase);
	const markPending = useCallback(() => {
		const now = Date.now();
		store.setPendingSince(now);
		setPendingSince(now);
	}, [store]);
	useEffect(() => {
		if (pendingSince !== null && !pending) {
			store.setPendingSince(null);
			setPendingSince(null);
		}
	}, [pending, pendingSince, store]);

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
		})
			.then(() => interstitial.preloadIfNear())
			.catch(() => undefined);
	}, [adsActive, interruptions, runtime, interstitial]);

	const [removeAdsRequest, setRemoveAdsRequest] =
		useState<MonetizationContextValue['removeAdsRequest']>(null);
	const openRemoveAds = useCallback(
		(options?: { mode?: RemoveAdsMode }) =>
			setRemoveAdsRequest({ mode: options?.mode ?? 'buy' }),
		[],
	);
	const closeRemoveAds = useCallback(() => setRemoveAdsRequest(null), []);

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
			pending,
			markPending,
			purchasing,
			interstitial,
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
			pending,
			markPending,
			purchasing,
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
