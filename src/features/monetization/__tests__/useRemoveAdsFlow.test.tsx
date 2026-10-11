import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type { RemoveAdsMode } from '../../../app/providers/MonetizationProvider';
import type { PurchaseOutcome, PurchaseStatus, RestoreResult } from '../../../domain/monetization';
import type { ProductLookup, Purchasing } from '../../../services/monetization/purchasing';
import { useRemoveAdsFlow, type RemoveAdsFlow } from '../hooks/useRemoveAdsFlow';

const PRODUCT: ProductLookup = {
	status: 'ready',
	title: 'Remove ads',
	description: 'No more ads',
	formattedPrice: '49.000 ₫',
};

const mockMonetization = { current: {} as Record<string, unknown> | null };
jest.mock('../../../app/providers/MonetizationProvider', () => ({
	useMonetization: () => mockMonetization.current,
}));

function purchasingWith(script: {
	lookup?: ProductLookup[];
	buy?: PurchaseOutcome | Promise<PurchaseOutcome>;
	restore?: RestoreResult;
}): Purchasing & { buy: jest.Mock; lookupProduct: jest.Mock; restore: jest.Mock } {
	const lookups = [...(script.lookup ?? [PRODUCT])];
	return {
		lookupProduct: jest.fn(async () => lookups.shift() ?? PRODUCT),
		buy: jest.fn(() => Promise.resolve(script.buy ?? 'success')),
		restore: jest.fn(async () => script.restore ?? 'restored'),
	};
}

function setup(options: {
	mode?: RemoveAdsMode;
	purchasing: Purchasing | null;
	purchase?: PurchaseStatus;
	pending?: boolean;
}) {
	const markPending = jest.fn();
	mockMonetization.current = {
		purchasing: options.purchasing,
		purchase: options.purchase ?? 'not_owned',
		pending: options.pending ?? false,
		canBuy: true,
		markPending,
	};
	const flow: { current: RemoveAdsFlow | null } = { current: null };
	function Probe() {
		flow.current = useRemoveAdsFlow(options.mode ?? 'buy');
		return null;
	}
	let tree!: ReactTestRenderer.ReactTestRenderer;
	ReactTestRenderer.act(() => {
		tree = ReactTestRenderer.create(<Probe />);
	});
	const rerender = () =>
		ReactTestRenderer.act(() => {
			tree.update(<Probe />);
		});
	return { flow, markPending, rerender };
}

const settle = () => ReactTestRenderer.act(async () => {});

describe('useRemoveAdsFlow', () => {
	it('loads the store product into the ready state (AC-3.1)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({}) });
		await settle();
		expect(flow.current?.view).toEqual({ kind: 'ready', product: PRODUCT, note: 'none' });
	});

	it('confirms a successful purchase (AC-3.2)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ buy: 'success' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(flow.current?.view.kind).toBe('success');
	});

	it('says nothing when the user cancels, and Buy stays available (AC-3.3)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ buy: 'cancelled' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(flow.current?.view).toEqual({ kind: 'ready', product: PRODUCT, note: 'none' });
	});

	it('treats "already owned" as a restore, never an error (AC-3.4)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ buy: 'restored' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(flow.current?.view.kind).toBe('restored');
	});

	it('explains a product not sold here (AC-3.5)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ lookup: [{ status: 'unavailable' }] }) });
		await settle();
		expect(flow.current?.view).toEqual({ kind: 'unavailable', note: 'none' });
	});

	it('offers Retry after a store error, which brings Buy back (AC-3.6)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ buy: 'error' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(flow.current?.view).toEqual({ kind: 'error', failed: 'buy' });
		await ReactTestRenderer.act(async () => flow.current?.retry());
		expect(flow.current?.view.kind).toBe('ready');
	});

	it('opens only one purchase flow for a double tap (AC-3.7)', async () => {
		let finish!: (outcome: PurchaseOutcome) => void;
		const purchasing = purchasingWith({});
		purchasing.buy.mockImplementation(
			() => new Promise<PurchaseOutcome>(resolve => (finish = resolve)),
		);
		const { flow } = setup({ purchasing });
		await settle();
		ReactTestRenderer.act(() => {
			flow.current?.buy();
			flow.current?.buy();
		});
		expect(purchasing.buy).toHaveBeenCalledTimes(1);
		expect(flow.current?.busy).toBe(true);
		await ReactTestRenderer.act(async () => finish('success'));
		expect(flow.current?.busy).toBe(false);
	});

	it('records a pending payment and shows it as pending (AC-5.1)', async () => {
		const { flow, markPending } = setup({ purchasing: purchasingWith({ buy: 'pending' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(markPending).toHaveBeenCalledTimes(1);
		expect(flow.current?.view.kind).toBe('pending');
	});

	it('opens straight into pending while a payment is still believed open (AC-5.2)', async () => {
		const purchasing = purchasingWith({});
		const { flow } = setup({ purchasing, pending: true });
		await settle();
		expect(flow.current?.view.kind).toBe('pending');
		expect(purchasing.lookupProduct).not.toHaveBeenCalled();
	});

	it('removes ads in place when the pending payment settles (AC-5.3)', async () => {
		const { flow, rerender } = setup({ purchasing: purchasingWith({}), pending: true });
		await settle();
		mockMonetization.current = { ...mockMonetization.current, purchase: 'owned', pending: false };
		rerender();
		await settle();
		expect(flow.current?.view.kind).toBe('success');
	});

	it('says purchases are disabled in a development build (AC-7.1)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({ buy: 'devBlocked' }) });
		await settle();
		await ReactTestRenderer.act(async () => flow.current?.buy());
		expect(flow.current?.view).toEqual({ kind: 'ready', product: PRODUCT, note: 'devBlocked' });
	});

	it.each<[RestoreResult, string, string]>([
		['restored', 'restored', 'AC-4.2'],
		['failed', 'error', 'AC-4.4'],
	])('in restore mode, restores at once: %s → %s (%s, D-16)', async (result, kind) => {
		const purchasing = purchasingWith({ restore: result });
		const { flow } = setup({ mode: 'restore', purchasing });
		await settle();
		expect(purchasing.restore).toHaveBeenCalledTimes(1);
		expect(flow.current?.view.kind).toBe(kind);
	});

	it('says "nothing found" next to the product, never success (AC-4.3)', async () => {
		const { flow } = setup({ mode: 'restore', purchasing: purchasingWith({ restore: 'nothingFound' }) });
		await settle();
		expect(flow.current?.view).toEqual({ kind: 'ready', product: PRODUCT, note: 'nothingFound' });
	});

	it('still says "nothing found" where the product is not sold (AC-4.3, found on a device)', async () => {
		const { flow } = setup({
			mode: 'restore',
			purchasing: purchasingWith({ restore: 'nothingFound', lookup: [{ status: 'unavailable' }] }),
		});
		await settle();
		expect(flow.current?.view).toEqual({ kind: 'unavailable', note: 'nothingFound' });
	});

	it('shows an owner the done state (AC-1.6)', async () => {
		const { flow } = setup({ purchasing: purchasingWith({}), purchase: 'owned' });
		await settle();
		expect(flow.current?.view.kind).toBe('success');
	});

	it('is unavailable without a payment engine, never stuck loading (FR-15)', async () => {
		const { flow } = setup({ mode: 'restore', purchasing: null });
		await settle();
		expect(flow.current?.view.kind).toBe('unavailable');
		expect(flow.current?.canRestore).toBe(false);
	});
});
