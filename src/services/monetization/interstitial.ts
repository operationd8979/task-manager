import {
	isInterstitialDue,
	nextInterstitialCount,
	shouldPreloadInterstitial,
} from '../../domain/monetization';
import { PLACEMENT } from './catalog';
import type { MonetizationLocalStore } from './localStore';

/** The slice of the ads SDK a full-screen ad needs; the real instance fits. */
export interface FullScreenPort {
	load(placementKey: string): Promise<unknown>;
	show(placementKey: string): Promise<{ status: string }>;
	getPlacementState(placementKey: string): string;
}

/**
 * Placement states that already hold or are fetching an ad. Loading again from
 * these is a second billable request for nothing — seen on a device, where the
 * third save re-requested the ad the second save had just loaded.
 */
const HAS_AD: ReadonlySet<string> = new Set(['loading', 'ready']);

export interface InterstitialController {
	/**
	 * Counts one new item (FR-11) and says whether a full-screen ad is now due
	 * and allowed. The count persists across launches and advances whatever the
	 * purchase status; only the decision to show checks it.
	 */
	noteNewItemSaved(): boolean;
	/** Loads ahead when the next new item will be due (plan D-7). */
	preloadIfNear(): void;
	/**
	 * Shows the ad if one is loaded. The counter resets ONLY when an ad really
	 * showed; not ready, refused or failed leaves it due for the next item
	 * (AC-8.7).
	 */
	show(): Promise<boolean>;
}

export function createInterstitialController(deps: {
	ads: FullScreenPort | null;
	store: MonetizationLocalStore;
	/** Ads are on right now: confirmed not owned, in a build with ads. */
	adsActive: () => boolean;
}): InterstitialController {
	const { ads, store, adsActive } = deps;

	const preloadIfNear = () => {
		if (
			ads !== null &&
			adsActive() &&
			shouldPreloadInterstitial(store.getInterstitialCount()) &&
			!HAS_AD.has(ads.getPlacementState(PLACEMENT.taskBreak))
		) {
			// Load reports its own failures as events, which the diagnostics
			// forwarder logs; a failed preload just means nothing is ready yet.
			ads.load(PLACEMENT.taskBreak).catch(() => undefined);
		}
	};

	return {
		noteNewItemSaved() {
			const count = nextInterstitialCount(store.getInterstitialCount());
			store.setInterstitialCount(count);
			preloadIfNear();
			return ads !== null && adsActive() && isInterstitialDue(count);
		},
		preloadIfNear,
		async show() {
			if (ads === null || !adsActive()) {
				return false;
			}
			try {
				const result = await ads.show(PLACEMENT.taskBreak);
				if (result.status === 'shown') {
					store.setInterstitialCount(0);
					return true;
				}
			} catch {
				// Never thrown by the SDK; kept so a surprise cannot cost the timeline.
			}
			preloadIfNear();
			return false;
		},
	};
}
