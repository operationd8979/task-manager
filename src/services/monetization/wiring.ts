import {
	effectivePurchaseStatus,
	isPendingShown,
	latchOwned,
	toAdsEnablement,
	toPurchaseStatus,
	type AdsEnablement,
	type EntitlementStatus,
	type PendingPurchases,
	type PurchaseStatus,
} from '../../domain/monetization';
import { ENTITLEMENT, PRODUCT } from './catalog';

/**
 * The narrow slices of the two SDKs this module needs. The real engine and ads
 * instance satisfy them structurally; tests hand in a few lines of fake. The
 * two SDKs never learn about each other — this file is the only bridge
 * (FR-1).
 */
export interface EntitlementPort {
	getEntitlement(key: string): { status: EntitlementStatus };
	subscribeEntitlements(
		listener: (entitlements: Record<string, { status: EntitlementStatus }>) => void,
	): () => void;
}

export interface EnablementPort {
	setEnablement(next: AdsEnablement): unknown;
}

/** The payment SDK's pending set (rn-payment 0.2.0, plan D-20). */
interface SdkPendingState {
	status: 'known' | 'unknown';
	purchases: readonly { productKey: string }[];
}

export interface PendingPort {
	getPendingPurchases(): SdkPendingState;
	subscribePendingPurchases(listener: (pending: SdkPendingState) => void): () => void;
}

export interface MonetizationSnapshot {
	/** What screens show; latched to owned for the rest of the process (FR-3). */
	purchase: PurchaseStatus;
	adsEnablement: AdsEnablement;
	/** A Remove-ads payment is in flight; Buy is not offered meanwhile (US-5). */
	pending: boolean;
}

const NOTHING_KNOWN: PendingPurchases = { known: false, productKeys: [] };

function toPendingPurchases(state: SdkPendingState): PendingPurchases {
	return {
		known: state.status === 'known',
		productKeys: state.purchases.map(purchase => purchase.productKey),
	};
}

export interface MonetizationWiring {
	getSnapshot(): MonetizationSnapshot;
	subscribe(listener: () => void): () => void;
	dispose(): void;
}

/**
 * Pushes the `no_ads` entitlement into ads enablement and publishes the result.
 * A missing payment engine (it failed to construct) reads as `unknown`, which
 * holds ads off — the safe direction for a paying user (FR-1, FR-22).
 */
export function createMonetizationWiring(options: {
	entitlements: EntitlementPort | null;
	/** The same engine as `entitlements`; absent in a test that does not need it. */
	pending?: PendingPort | null;
	ads: EnablementPort | null;
	adsEnabledInBuild: boolean;
}): MonetizationWiring {
	const { entitlements, ads, adsEnabledInBuild } = options;
	const pendingPort = options.pending ?? null;
	const listeners = new Set<() => void>();
	let ownedThisProcess = false;
	let status: EntitlementStatus =
		entitlements?.getEntitlement(ENTITLEMENT.noAds).status ?? 'unknown';
	let pending: PendingPurchases = pendingPort
		? toPendingPurchases(pendingPort.getPendingPurchases())
		: NOTHING_KNOWN;

	const compute = (): MonetizationSnapshot => {
		const reported = toPurchaseStatus(status);
		ownedThisProcess = latchOwned(ownedThisProcess, reported);
		const purchase = effectivePurchaseStatus(reported, ownedThisProcess);
		return {
			purchase,
			adsEnablement: toAdsEnablement(reported, ownedThisProcess, adsEnabledInBuild),
			pending: isPendingShown(pending, PRODUCT.removeAds, purchase),
		};
	};

	let snapshot = compute();
	ads?.setEnablement(snapshot.adsEnablement);

	const publish = () => {
		const next = compute();
		if (
			snapshot.purchase === next.purchase &&
			snapshot.adsEnablement === next.adsEnablement &&
			snapshot.pending === next.pending
		) {
			return;
		}
		if (snapshot.adsEnablement !== next.adsEnablement) {
			ads?.setEnablement(next.adsEnablement);
		}
		snapshot = next;
		listeners.forEach(listener => listener());
	};

	const unsubscribeEntitlements = entitlements?.subscribeEntitlements(map => {
		status = map[ENTITLEMENT.noAds]?.status ?? 'unknown';
		publish();
	});
	// A payment ending unpaid changes no entitlement — `not_entitled` stays
	// `not_entitled` — so only this subscription can bring Buy back (AC-5.5).
	const unsubscribePending = pendingPort?.subscribePendingPurchases(next => {
		pending = toPendingPurchases(next);
		publish();
	});

	return {
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		dispose() {
			unsubscribeEntitlements?.();
			unsubscribePending?.();
			listeners.clear();
		},
	};
}
