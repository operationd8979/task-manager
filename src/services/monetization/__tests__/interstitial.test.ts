import { createInterstitialController, type FullScreenPort } from '../interstitial';
import { createMonetizationLocalStore } from '../localStore';

function fakeAds(placement = 'idle', showStatus = 'shown') {
	const state = { placement };
	const ads: FullScreenPort & { load: jest.Mock; show: jest.Mock } = {
		load: jest.fn(async () => {
			state.placement = 'ready';
		}),
		show: jest.fn(async () => ({ status: showStatus })),
		getPlacementState: () => state.placement,
	};
	return { ads, state };
}

function setup(options: { active?: boolean; count?: number; placement?: string; showStatus?: string } = {}) {
	const { ads, state } = fakeAds(options.placement, options.showStatus);
	const store = createMonetizationLocalStore();
	store.setInterstitialCount(options.count ?? 0);
	let active = options.active ?? true;
	const controller = createInterstitialController({ ads, store, adsActive: () => active });
	return { controller, ads, state, store, setActive: (value: boolean) => (active = value) };
}

describe('createInterstitialController', () => {
	it('is due on the third new item, and preloads on the second (AC-8.1, D-7)', () => {
		const { controller, ads } = setup();
		expect(controller.noteNewItemSaved()).toBe(false);
		expect(ads.load).not.toHaveBeenCalled();
		expect(controller.noteNewItemSaved()).toBe(false);
		expect(ads.load).toHaveBeenCalledTimes(1);
		expect(controller.noteNewItemSaved()).toBe(true);
	});

	it('never loads again while an ad is loading or ready (found on a device)', () => {
		const { controller, ads } = setup({ count: 1, placement: 'ready' });
		controller.noteNewItemSaved();
		controller.noteNewItemSaved();
		expect(ads.load).not.toHaveBeenCalled();
	});

	it('resets the counter only when an ad really showed (FR-11)', async () => {
		const { controller, store } = setup({ count: 2 });
		controller.noteNewItemSaved();
		await expect(controller.show()).resolves.toBe(true);
		expect(store.getInterstitialCount()).toBe(0);
	});

	it('keeps the counter due when no ad was ready, and loads one for next time (AC-8.7)', async () => {
		const { controller, store, ads } = setup({ count: 3, showStatus: 'not_ready' });
		await expect(controller.show()).resolves.toBe(false);
		expect(store.getInterstitialCount()).toBe(3);
		expect(ads.load).toHaveBeenCalled();
	});

	it('counts for an owner but never shows them one (AC-1.5, FR-11)', async () => {
		const { controller, ads, store } = setup({ active: false, count: 2 });
		expect(controller.noteNewItemSaved()).toBe(false);
		expect(store.getInterstitialCount()).toBe(3);
		await expect(controller.show()).resolves.toBe(false);
		expect(ads.show).not.toHaveBeenCalled();
		expect(ads.load).not.toHaveBeenCalled();
	});

	it('survives a restart with the count intact (AC-8.2)', () => {
		const first = setup();
		first.controller.noteNewItemSaved();
		first.controller.noteNewItemSaved();
		const restarted = createInterstitialController({
			ads: fakeAds().ads,
			store: first.store,
			adsActive: () => true,
		});
		expect(restarted.noteNewItemSaved()).toBe(true);
	});
});
