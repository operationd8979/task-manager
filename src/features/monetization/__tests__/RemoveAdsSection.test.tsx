import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import type { PurchaseStatus } from '../../../domain/monetization';
import { i18n } from '../../../i18n';
import { RemoveAdsSection } from '../components/RemoveAdsSection';

/** What the Settings section SAYS in each state (SCR-3), in Vietnamese. */
const mockMonetization = { current: null as Record<string, unknown> | null };
jest.mock('../../../app/providers/MonetizationProvider', () => ({
	useMonetization: () => mockMonetization.current,
}));

// The checking state's skeleton pulses in a loop; an unmounted tree stops it.
const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
afterEach(() => {
	ReactTestRenderer.act(() => mounted.splice(0).forEach(tree => tree.unmount()));
});

function render(state: {
	supported?: boolean;
	storeAvailable?: boolean;
	purchase?: PurchaseStatus;
	pending?: boolean;
	privacyOptions?: boolean;
	openPrivacyOptions?: jest.Mock;
}) {
	const openRemoveAds = jest.fn();
	const openPrivacyOptions = jest.fn(async () => 'shown');
	mockMonetization.current = {
		supported: true,
		storeAvailable: true,
		purchase: 'not_owned',
		pending: false,
		privacyOptions: false,
		openRemoveAds,
		openPrivacyOptions,
		...state,
	};
	let tree!: ReactTestRenderer.ReactTestRenderer;
	ReactTestRenderer.act(() => {
		tree = ReactTestRenderer.create(
			<I18nProvider i18n={i18n}>
				<RemoveAdsSection />
			</I18nProvider>,
		);
	});
	mounted.push(tree);
	const text = tree.root
		.findAllByType(Text)
		.map(node => node.props.children)
		.flat()
		.join(' | ');
	const button = (label: string) =>
		tree.root.find(
			node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
		);
	const textNow = () =>
		tree.root
			.findAllByType(Text)
			.map(node => node.props.children)
			.flat()
			.join(' | ');
	return { tree, text, textNow, button, openRemoveAds, openPrivacyOptions };
}

describe('RemoveAdsSection', () => {
	it('offers Remove ads and Restore to a free user', () => {
		const { text, button, openRemoveAds } = render({});
		expect(text).toContain('Bỏ quảng cáo');
		expect(text).toContain('Mua một lần, dùng mãi.');
		ReactTestRenderer.act(() => button('Bỏ quảng cáo').props.onPress());
		expect(openRemoveAds).toHaveBeenLastCalledWith();
	});

	it('opens the sheet in restore mode from Restore (D-16, design D-8)', () => {
		const { button, openRemoveAds } = render({});
		ReactTestRenderer.act(() => button('Khôi phục giao dịch').props.onPress());
		expect(openRemoveAds).toHaveBeenLastCalledWith({ mode: 'restore' });
	});

	it('shows "Ads removed" to an owner, with Restore but no buy row (AC-1.6)', () => {
		const { text } = render({ purchase: 'owned' });
		expect(text).toContain('Đã bỏ quảng cáo');
		expect(text).toContain('Khôi phục giao dịch');
		expect(text).not.toContain('Mua một lần, dùng mãi.');
	});

	it('tags a pending payment and offers no buy hint (AC-5.2)', () => {
		const { text } = render({ pending: true });
		expect(text).toContain('ĐANG CHỜ THANH TOÁN');
		expect(text).not.toContain('Mua một lần, dùng mãi.');
	});

	it('says it is checking while the purchase is unknown', () => {
		expect(render({ purchase: 'unknown' }).text).toContain('Đang kiểm tra giao dịch với cửa hàng…');
	});

	it('explains a device without store billing, with no dead-end buttons (FR-15)', () => {
		const { text, tree } = render({ storeAvailable: false });
		expect(text).toContain('Máy này chưa mua được trong ứng dụng.');
		expect(tree.root.findAll(node => typeof node.props.onPress === 'function')).toHaveLength(0);
	});

	it('renders nothing on iOS or without a payment engine (FR-15)', () => {
		expect(render({ supported: false }).tree.toJSON()).toBeNull();
	});
});

describe('RemoveAdsSection — Privacy options (SCR3-privacy-sl5, D-21)', () => {
	const PRIVACY = 'Tùy chọn quyền riêng tư';
	const FAILED = 'Chưa mở được biểu mẫu. Kiểm tra kết nối rồi chạm để thử lại.';

	it('offers the entry, with what it does, where it is required (AC-6.4)', async () => {
		const { text, button, openPrivacyOptions } = render({ privacyOptions: true });
		expect(text).toContain(PRIVACY);
		expect(text).toContain('Đổi lựa chọn đồng ý quảng cáo của bạn. Biểu mẫu do Google hiển thị.');

		await ReactTestRenderer.act(async () => button(PRIVACY).props.onPress());

		expect(openPrivacyOptions).toHaveBeenCalledTimes(1);
	});

	it('has no entry when it is not required, or for an owner (AC-6.5, AC-1.6)', () => {
		expect(render({}).text).not.toContain(PRIVACY);
		// The provider never sets it for an owner; the domain rule tests that.
		expect(render({ purchase: 'owned' }).text).not.toContain(PRIVACY);
	});

	it('says so when the form cannot open, and a tap that works clears it', async () => {
		const openPrivacyOptions = jest
			.fn()
			.mockResolvedValueOnce('failed')
			.mockResolvedValueOnce('shown');
		const { button, textNow } = render({ privacyOptions: true, openPrivacyOptions });

		await ReactTestRenderer.act(async () => button(PRIVACY).props.onPress());
		expect(textNow()).toContain(FAILED);

		await ReactTestRenderer.act(async () => button(PRIVACY).props.onPress());
		expect(textNow()).not.toContain(FAILED);
	});
});
