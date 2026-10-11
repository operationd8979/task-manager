import type { AdEvent } from '@chipmobilesdk/rn-ads';
import type { PaymentEvent } from '@chipmobilesdk/rn-payment';

import { APP_ENV } from '../appEnv';
import { adEventCode, forwardDiagnostics, paymentEventCode } from '../diagnostics';
import type { MonetizationRuntime } from '../runtime';

const adEvent = (event: object) => event as unknown as AdEvent;
const paymentEvent = (event: object) => event as unknown as PaymentEvent;

describe('adEventCode (FR-13)', () => {
	it('keeps throttled, no-fill and failed as three different entries', () => {
		expect(adEventCode(adEvent({ type: 'request_throttled', retryAfterMs: 1000 }))).toBe(
			'ads.throttled',
		);
		expect(adEventCode(adEvent({ type: 'load_failed', error: { code: 'no_fill' } }))).toBe(
			'ads.no_fill',
		);
		expect(
			adEventCode(adEvent({ type: 'load_failed', error: { code: 'network_error' } })),
		).toBe('ads.load_failed:network_error');
		expect(
			adEventCode(adEvent({ type: 'load_failed', error: { code: 'consent_required' } })),
		).toBe('ads.load_failed:consent_required');
	});

	it('logs nothing for events that are not failures', () => {
		expect(adEventCode(adEvent({ type: 'loaded' }))).toBeNull();
		expect(adEventCode(adEvent({ type: 'impression' }))).toBeNull();
	});
});

describe('paymentEventCode (FR-13)', () => {
	it('logs purchase failures and the development-build block by code only', () => {
		expect(
			paymentEventCode(paymentEvent({ type: 'purchase_failed', code: 'store_error', productKey: 'remove_ads' })),
		).toBe('payment.store_error');
		expect(paymentEventCode(paymentEvent({ type: 'environment_blocked' }))).toBe(
			'payment.environment_blocked',
		);
	});

	it('treats a cancelled purchase as normal, not as a failure (FR-16)', () => {
		expect(paymentEventCode(paymentEvent({ type: 'purchase_cancelled' }))).toBeNull();
	});
});

describe('forwardDiagnostics', () => {
	it('reports SDKs that failed to construct, then releases its subscriptions', () => {
		const report = jest.fn();
		const runtime: MonetizationRuntime = {
			env: APP_ENV,
			ads: null,
			payment: null,
			AdsProvider: null,
			AdsBanner: null,
			startupFailures: ['ads.config_unavailable'],
		};
		const stop = forwardDiagnostics(runtime, report);
		expect(report).toHaveBeenCalledWith('ads.config_unavailable');
		expect(() => stop()).not.toThrow();
	});
});
