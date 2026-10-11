import React, { useEffect } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';
import type { PlacementState } from '@chipmobilesdk/rn-ads';

import { i18n } from '../../../i18n';
import { BannerSlot } from '../components/BannerSlot';

/**
 * SCR-1's banner slot against a stand-in banner host. The real host is the ads
 * SDK's (its own suite covers loading); what is ours is how the slot reacts to
 * each placement state, the link, and that it survives re-renders.
 */
const mockMonetization = {
	current: null as null | {
		Banner: React.ComponentType<{ placementKey: string; onStateChange?: (s: PlacementState) => void }> | null;
		openRemoveAds: jest.Mock;
	},
};
const mockInset = { value: 0 };

jest.mock('../../../app/providers/MonetizationProvider', () => ({
	useMonetization: () => mockMonetization.current,
}));
jest.mock('../../../app/providers/BottomInsetProvider', () => ({
	useBottomInset: () => mockInset,
}));

/** The pressables themselves: the element that owns both role and handler. */
const buttons = (tree: ReactTestRenderer.ReactTestRenderer) =>
	tree.root.findAll(
		node =>
			node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function',
	);

/** Reports a fixed placement state and counts how often it is mounted. */
function fakeBanner(state: PlacementState, mounts: { count: number }) {
	return function FakeBanner({ onStateChange }: { onStateChange?: (s: PlacementState) => void }) {
		useEffect(() => {
			mounts.count += 1;
			onStateChange?.(state);
		}, [onStateChange]);
		return null;
	};
}

function render(state: PlacementState | null) {
	const mounts = { count: 0 };
	const openRemoveAds = jest.fn();
	mockMonetization.current = {
		Banner: state === null ? null : fakeBanner(state, mounts),
		openRemoveAds,
	};
	mockInset.value = 0;
	let tree!: ReactTestRenderer.ReactTestRenderer;
	ReactTestRenderer.act(() => {
		tree = ReactTestRenderer.create(
			<I18nProvider i18n={i18n}>
				<BannerSlot bottomInset={24} />
			</I18nProvider>,
		);
	});
	// The strip plus banner measure 104 pt once laid out.
	const content = tree.root.findAll(node => typeof node.props.onLayout === 'function')[0];
	if (content) {
		ReactTestRenderer.act(() => {
			content.props.onLayout({ nativeEvent: { layout: { height: 104 } } });
		});
	}
	return { tree, content, mounts, openRemoveAds };
}

describe('BannerSlot', () => {
	it.each<PlacementState>(['idle', 'loading', 'undecided', 'throttled', 'failed', 'unavailable'])(
		'stays collapsed and out of reach while the placement is %s (AC-1.2, AC-2.8)',
		state => {
			const { content } = render(state);
			expect(content.props.accessibilityElementsHidden).toBe(true);
			expect(content.props.pointerEvents).toBe('none');
			expect(mockInset.value).toBe(0);
		},
	);

	it('opens once an ad is ready and lifts the toast by its height (AC-2.1, AC-2.6)', () => {
		const { content } = render('ready');
		expect(content.props.accessibilityElementsHidden).toBe(false);
		expect(mockInset.value).toBe(104);
	});

	it('opens the Remove-ads sheet from its link (AC-2.10)', () => {
		const { tree, openRemoveAds } = render('ready');
		const link = buttons(tree)[0];
		expect(link.props.accessibilityLabel).toBe('Bỏ quảng cáo. Mở trang mua gói bỏ quảng cáo');
		ReactTestRenderer.act(() => link.props.onPress());
		expect(openRemoveAds).toHaveBeenCalledTimes(1);
	});

	it('keeps the same banner host across re-renders, so a day change asks for nothing (AC-2.2)', () => {
		const { tree, mounts } = render('ready');
		for (let day = 0; day < 10; day += 1) {
			ReactTestRenderer.act(() => {
				tree.update(
					<I18nProvider i18n={i18n}>
						<BannerSlot bottomInset={24} />
					</I18nProvider>,
				);
			});
		}
		expect(mounts.count).toBe(1);
	});

	it('renders only the inset where ads do not exist — iOS, owners, no-ads builds (FR-15)', () => {
		const { tree } = render(null);
		expect(buttons(tree)).toHaveLength(0);
		expect(mockInset.value).toBe(0);
		// The same lookup does find the link when there is a banner.
		expect(buttons(render('ready').tree)).toHaveLength(1);
	});
});
