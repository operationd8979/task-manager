import {
	effectivePurchaseStatus,
	latchOwned,
	toAdsEnablement,
	toPurchaseStatus,
	type AdsEnablement,
	type EntitlementStatus,
	type PurchaseStatus,
} from '../../domain/monetization';
import { ENTITLEMENT } from './catalog';

/**
 * The narrow slices of the two SDKs this module needs. The real engine and ads
 * instance satisfy them structurally; tests hand in a few lines of fake. The
 * two SDKs never learn about each other — this file is the only bridge
 * (FR-1, raw spec §2.3).
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

export interface MonetizationSnapshot {
	/** What screens show; latched to owned for the rest of the process (FR-3). */
	purchase: PurchaseStatus;
	adsEnablement: AdsEnablement;
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
	ads: EnablementPort | null;
	adsEnabledInBuild: boolean;
}): MonetizationWiring {
	const { entitlements, ads, adsEnabledInBuild } = options;
	const listeners = new Set<() => void>();
	let ownedThisProcess = false;

	const compute = (status: EntitlementStatus): MonetizationSnapshot => {
		const reported = toPurchaseStatus(status);
		ownedThisProcess = latchOwned(ownedThisProcess, reported);
		return {
			purchase: effectivePurchaseStatus(reported, ownedThisProcess),
			adsEnablement: toAdsEnablement(reported, ownedThisProcess, adsEnabledInBuild),
		};
	};

	let snapshot = compute(
		entitlements?.getEntitlement(ENTITLEMENT.noAds).status ?? 'unknown',
	);
	ads?.setEnablement(snapshot.adsEnablement);

	const apply = (status: EntitlementStatus) => {
		const next = compute(status);
		if (
			snapshot.purchase === next.purchase &&
			snapshot.adsEnablement === next.adsEnablement
		) {
			return;
		}
		if (snapshot.adsEnablement !== next.adsEnablement) {
			ads?.setEnablement(next.adsEnablement);
		}
		snapshot = next;
		listeners.forEach(listener => listener());
	};

	const unsubscribe = entitlements?.subscribeEntitlements(map =>
		apply(map[ENTITLEMENT.noAds]?.status ?? 'unknown'),
	);

	return {
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		dispose() {
			unsubscribe?.();
			listeners.clear();
		},
	};
}
