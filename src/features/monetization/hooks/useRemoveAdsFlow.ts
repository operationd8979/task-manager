import { useCallback, useEffect, useRef, useState } from 'react';

import {
	useMonetization,
	type RemoveAdsMode,
} from '../../../app/providers/MonetizationProvider';
import type { PurchaseOutcome } from '../../../domain/monetization';
import type { ProductLookup } from '../../../services/monetization/purchasing';

export type Product = Extract<ProductLookup, { status: 'ready' }>;

/** Every state the Remove-ads sheet can be in (SCR-2; spec FR-16, FR-17). */
export type RemoveAdsView =
	| { kind: 'loading' }
	| { kind: 'ready'; product: Product; note: 'none' | 'nothingFound' | 'devBlocked' }
	| { kind: 'pending' }
	| { kind: 'success' }
	| { kind: 'restored' }
	// Carries the restore answer too: "nothing found" must be said even where the
	// product cannot be shown (AC-4.3) — found on a device without the product.
	| { kind: 'unavailable'; note: 'none' | 'nothingFound' }
	| { kind: 'error'; failed: 'load' | 'buy' | 'restore' };

export interface RemoveAdsFlow {
	view: RemoveAdsView;
	/** A store request is in flight; Buy and Restore are disabled (AC-3.7). */
	busy: boolean;
	canBuy: boolean;
	canRestore: boolean;
	buy(): void;
	restore(): void;
	retry(): void;
}

/** What the sheet shows after a tap on Buy, given the product it was showing. */
function viewAfterPurchase(outcome: PurchaseOutcome, product: Product): RemoveAdsView {
	switch (outcome) {
		case 'success':
			return { kind: 'success' };
		case 'restored':
			return { kind: 'restored' };
		case 'pending':
			return { kind: 'pending' };
		case 'unavailable':
			return { kind: 'unavailable', note: 'none' };
		case 'devBlocked':
			return { kind: 'ready', product, note: 'devBlocked' };
		case 'error':
			return { kind: 'error', failed: 'buy' };
		default:
			// Cancelled is a normal answer and says nothing (AC-3.3); a refused
			// second tap changes nothing either.
			return { kind: 'ready', product, note: 'none' };
	}
}

/**
 * The purchase sheet's state machine, kept out of the view (Principle II).
 *
 * Opening decides the first state: no payment engine reads as unavailable,
 * owners see it done, restore mode starts restoring at once (plan D-16), and a
 * pending payment is shown as pending (US-5).
 */
export function useRemoveAdsFlow(mode: RemoveAdsMode): RemoveAdsFlow {
	const monetization = useMonetization();
	const purchasing = monetization?.purchasing ?? null;
	const owned = monetization?.purchase === 'owned';
	const markPending = monetization?.markPending;
	const [view, setView] = useState<RemoveAdsView>({ kind: 'loading' });
	const [busy, setBusy] = useState(false);
	const busyRef = useRef(false);
	const mounted = useRef(true);
	useEffect(
		() => () => {
			mounted.current = false;
		},
		[],
	);
	/** The sheet may close mid-request; nothing is set once it has. */
	const show = useCallback((next: RemoveAdsView) => {
		if (mounted.current) {
			setView(next);
		}
	}, []);
	const setInFlight = useCallback((value: boolean) => {
		busyRef.current = value;
		if (mounted.current) {
			setBusy(value);
		}
	}, []);

	const load = useCallback(
		async (note: 'none' | 'nothingFound' = 'none') => {
			if (purchasing === null) {
				show({ kind: 'unavailable', note: 'none' });
				return;
			}
			show({ kind: 'loading' });
			const product = await purchasing.lookupProduct();
			if (product.status === 'ready') {
				show({ kind: 'ready', product, note });
			} else if (product.status === 'unavailable') {
				show({ kind: 'unavailable', note });
			} else {
				show({ kind: 'error', failed: 'load' });
			}
		},
		[purchasing, show],
	);

	const restore = useCallback(async () => {
		if (purchasing === null || busyRef.current) {
			return;
		}
		setInFlight(true);
		show({ kind: 'loading' });
		const result = await purchasing.restore();
		setInFlight(false);
		if (result === 'restored') {
			show({ kind: 'restored' });
		} else if (result === 'nothingFound') {
			// Said in so many words, never as success (AC-4.3).
			await load('nothingFound');
		} else {
			show({ kind: 'error', failed: 'restore' });
		}
	}, [purchasing, setInFlight, load, show]);

	const buy = useCallback(async () => {
		if (purchasing === null || busyRef.current || view.kind !== 'ready') {
			return;
		}
		const { product } = view;
		setInFlight(true);
		const outcome = await purchasing.buy();
		setInFlight(false);
		if (outcome === 'pending') {
			markPending?.();
		}
		show(viewAfterPurchase(outcome, product));
	}, [purchasing, view, setInFlight, markPending, show]);

	const opened = useRef(false);
	useEffect(() => {
		if (opened.current) {
			return;
		}
		opened.current = true;
		if (purchasing === null) {
			show({ kind: 'unavailable', note: 'none' });
		} else if (mode === 'restore') {
			restore().catch(() => undefined);
		} else if (owned) {
			show({ kind: 'success' });
		} else if (monetization?.pending) {
			show({ kind: 'pending' });
		} else {
			load().catch(() => undefined);
		}
	}, [purchasing, mode, owned, monetization?.pending, restore, load, show]);

	// A payment that settles while the sheet is open removes ads in place (AC-5.3).
	useEffect(() => {
		if (owned && (view.kind === 'pending' || view.kind === 'ready')) {
			show({ kind: 'success' });
		}
	}, [owned, view.kind, show]);

	return {
		view,
		busy,
		canBuy: monetization?.canBuy ?? false,
		canRestore: purchasing !== null,
		buy: () => {
			buy().catch(() => undefined);
		},
		restore: () => {
			restore().catch(() => undefined);
		},
		// A failed load or purchase retries by reloading the product, after which
		// Buy is one tap again; a failed restore retries the restore.
		retry: () => {
			const action =
				view.kind === 'error' && view.failed === 'restore' ? restore() : load();
			action.catch(() => undefined);
		},
	};
}
