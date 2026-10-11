import { createPurchasing } from '../purchasing';
import type { PaymentEngine } from '../runtime';

/** The three engine calls the facade makes, scripted per test. */
function engine(overrides: Record<string, jest.Mock>) {
	return {
		getProducts: jest.fn(),
		purchase: jest.fn(),
		restore: jest.fn(),
		...overrides,
	} as unknown as PaymentEngine;
}

describe('createPurchasing', () => {
	it('shows the store price, title and description untouched (AC-3.1, FR-7)', async () => {
		const purchasing = createPurchasing(
			engine({
				getProducts: jest.fn().mockResolvedValue({
					ok: true,
					products: [
						{ productKey: 'remove_ads', title: 'Remove ads', description: 'No more ads', formattedPrice: '49.000 ₫' },
					],
					missing: [],
					fromCache: false,
				}),
			}),
		);
		await expect(purchasing.lookupProduct()).resolves.toEqual({
			status: 'ready',
			title: 'Remove ads',
			description: 'No more ads',
			formattedPrice: '49.000 ₫',
		});
	});

	it('reports a product the store does not sell here as unavailable, not as an error (AC-3.5)', async () => {
		const purchasing = createPurchasing(
			engine({
				getProducts: jest.fn().mockResolvedValue({
					ok: true,
					products: [],
					missing: [{ productKey: 'remove_ads', reason: 'not_available_from_store' }],
					fromCache: false,
				}),
			}),
		);
		await expect(purchasing.lookupProduct()).resolves.toEqual({ status: 'unavailable' });
	});

	it('turns a failed query or a throw into a retryable error (AC-3.6)', async () => {
		await expect(
			createPurchasing(engine({ getProducts: jest.fn().mockResolvedValue({ ok: false }) })).lookupProduct(),
		).resolves.toEqual({ status: 'error' });
		await expect(
			createPurchasing(engine({ getProducts: jest.fn().mockRejectedValue(new Error('x')) })).lookupProduct(),
		).resolves.toEqual({ status: 'error' });
	});

	it('maps purchase results through the domain rule (FR-16)', async () => {
		const purchase = jest.fn().mockResolvedValue({ kind: 'user_cancelled' });
		await expect(createPurchasing(engine({ purchase })).buy()).resolves.toBe('cancelled');
		expect(purchase).toHaveBeenCalledWith('remove_ads');
	});

	it('distinguishes restored, nothing found and failed (AC-4.2, AC-4.3, AC-4.4, FR-17)', async () => {
		const restoreWith = (value: unknown) =>
			createPurchasing(engine({ restore: jest.fn().mockResolvedValue(value) })).restore();
		await expect(restoreWith({ ok: true, restored: true, entitlements: ['no_ads'] })).resolves.toBe('restored');
		await expect(restoreWith({ ok: true, restored: false, entitlements: [] })).resolves.toBe('nothingFound');
		await expect(restoreWith({ ok: false })).resolves.toBe('failed');
	});
});
