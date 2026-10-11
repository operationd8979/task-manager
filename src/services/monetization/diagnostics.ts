import type { AdEvent } from '@chipmobilesdk/rn-ads';
import type { PaymentEvent } from '@chipmobilesdk/rn-payment';

import type { MonetizationRuntime } from './runtime';

/** Every monetization entry in the local error log carries this operation. */
export const MONETIZATION_OPERATION = 'monetization';

/**
 * Error-log code for an ad event, or null when the event is not a failure
 * (FR-13). Throttled, no-fill and failed are three different entries even
 * though the user sees the same collapsed banner — only one of them is worth
 * investigating. No unit id, product id or payload is ever part of a code.
 */
export function adEventCode(event: AdEvent): string | null {
	switch (event.type) {
		case 'request_throttled':
			return 'ads.throttled';
		case 'load_failed':
			return event.error.code === 'no_fill'
				? 'ads.no_fill'
				: `ads.load_failed:${event.error.code}`;
		case 'display_failed':
			return `ads.show_failed:${event.error.code}`;
		case 'internal_error':
			return 'ads.internal_error';
		default:
			return null;
	}
}

export function paymentEventCode(event: PaymentEvent): string | null {
	switch (event.type) {
		case 'purchase_failed':
			return `payment.${event.code}`;
		case 'environment_blocked':
			return 'payment.environment_blocked';
		case 'internal_error':
			return `payment.internal_error:${event.code}`;
		default:
			return null;
	}
}

/**
 * Forwards SDK failures into the app's local error log. The log lives on the
 * database handle, which "Delete all data" replaces, so the caller re-attaches
 * with the new one; the SDK instances themselves stay.
 */
export function forwardDiagnostics(
	runtime: MonetizationRuntime,
	report: (code: string) => void,
	options: { storePersistent?: boolean } = {},
): () => void {
	runtime.startupFailures.forEach(code => report(code));
	if (options.storePersistent === false) {
		// The counter and the pending marker will not survive a restart.
		report('monetization.store_memory_only');
	}
	const forward = <E>(code: (event: E) => string | null) => (event: E) => {
		const value = code(event);
		if (value !== null) {
			report(value);
		}
	};
	const unsubscribeAds = runtime.ads?.subscribeEvents(forward(adEventCode));
	const unsubscribePayment = runtime.payment?.subscribeEvents(forward(paymentEventCode));
	return () => {
		unsubscribeAds?.();
		unsubscribePayment?.();
	};
}
