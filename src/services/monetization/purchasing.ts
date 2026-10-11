import type { PurchaseOutcome, RestoreResult } from '../../domain/monetization';
import { toPurchaseOutcome } from '../../domain/monetization';
import { PRODUCT } from './catalog';
import type { PaymentEngine } from './runtime';

/** What the purchase sheet shows about the product — all of it from the store. */
export type ProductLookup =
	| { status: 'ready'; title: string; description: string; formattedPrice: string }
	| { status: 'unavailable' }
	| { status: 'error' };

/**
 * The purchase sheet's view of the payment SDK. It returns app outcomes, so no
 * SDK type reaches a screen (FR-16, FR-17).
 */
export interface Purchasing {
	lookupProduct(): Promise<ProductLookup>;
	buy(): Promise<PurchaseOutcome>;
	restore(): Promise<RestoreResult>;
}

export function createPurchasing(payment: PaymentEngine): Purchasing {
	return {
		async lookupProduct() {
			try {
				const result = await payment.getProducts([PRODUCT.removeAds]);
				if (!result.ok) {
					return { status: 'error' };
				}
				const { products, missing } = result;
				const product = products.find(entry => entry.productKey === PRODUCT.removeAds);
				if (product) {
					return {
						status: 'ready',
						title: product.title,
						description: product.description,
						// Never built by the app: only the store knows the currency, its
						// placement and the separators for this user (FR-7).
						formattedPrice: product.formattedPrice,
					};
				}
				// Unapproved or not sold here is not a network error (AC-3.5).
				return missing.length > 0 ? { status: 'unavailable' } : { status: 'error' };
			} catch {
				return { status: 'error' };
			}
		},
		async buy() {
			try {
				return toPurchaseOutcome((await payment.purchase(PRODUCT.removeAds)).kind);
			} catch {
				return 'error';
			}
		},
		async restore() {
			try {
				const outcome = await payment.restore();
				if (!outcome.ok) {
					return 'failed';
				}
				// "Nothing found" is a successful answer, never shown as success (AC-4.3).
				return outcome.restored ? 'restored' : 'nothingFound';
			} catch {
				return 'failed';
			}
		},
	};
}
