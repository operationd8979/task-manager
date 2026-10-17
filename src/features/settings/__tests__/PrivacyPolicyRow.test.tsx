import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import { PRIVACY_POLICY_OPEN_FAILED_CODE } from '../../../domain/privacyPolicy';
import { i18n } from '../../../i18n';
import { PrivacyPolicyRow } from '../components/PrivacyPolicyRow';

const mockReport = jest.fn();
jest.mock('../../../app/providers/DatabaseProvider', () => ({
	useDatabase: () => ({ errorLog: { report: mockReport } }),
}));

/** The published site this build would carry; `null` is a local build's. */
const mockSite = { current: 'https://owner.github.io' as string | null };
jest.mock('../../../domain/privacyPolicy', () => {
	const actual = jest.requireActual('../../../domain/privacyPolicy');
	return {
		...actual,
		privacyPolicyUrl: (locale: string) => actual.privacyPolicyUrl(locale, mockSite.current),
	};
});

const VI_PAGE = 'https://owner.github.io/task-manager/privacy/vi/';

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
afterEach(() => {
	ReactTestRenderer.act(() => mounted.splice(0).forEach(tree => tree.unmount()));
	// The RN Jest preset's Linking.openURL is itself a mock, so restoring a spy
	// on it does not reset its calls; clearing does.
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

function render() {
	let tree!: ReactTestRenderer.ReactTestRenderer;
	ReactTestRenderer.act(() => {
		tree = ReactTestRenderer.create(
			<I18nProvider i18n={i18n}>
				<PrivacyPolicyRow />
			</I18nProvider>,
		);
	});
	mounted.push(tree);
	const row = () =>
		tree.root.find(
			node => node.props.accessibilityRole === 'link' && typeof node.props.onPress === 'function',
		);
	const text = () =>
		tree.root
			.findAllByType(Text)
			.map(node => node.props.children)
			.flat()
			.join(' | ');
	return { tree, row, text };
}

/** Lets the open promise settle and its state update render. */
async function settle() {
	await ReactTestRenderer.act(async () => {
		await Promise.resolve();
	});
}

describe('PrivacyPolicyRow (US-10)', () => {
	beforeEach(() => {
		mockSite.current = 'https://owner.github.io';
		mockReport.mockClear();
	});

	it('is a link labelled as leaving the app, with no purchase state involved (AC-10.1)', () => {
		const { row, text } = render();
		expect(row().props.accessibilityLabel).toBe('Chính sách quyền riêng tư');
		expect(row().props.accessibilityHint).toBe('Mở trang web trong trình duyệt.');
		expect(text()).toContain('Chính sách quyền riêng tư');
	});

	it('opens the page in the app language (AC-10.2)', async () => {
		const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
		const { row, text } = render();
		ReactTestRenderer.act(() => row().props.onPress());
		await settle();
		expect(openURL).toHaveBeenCalledWith(VI_PAGE);
		expect(text()).not.toContain('Không mở được trang');
		expect(mockReport).not.toHaveBeenCalled();
	});

	it('says the page could not open, with its address, and logs it (AC-10.3)', async () => {
		jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no activity'));
		const { row, text } = render();
		ReactTestRenderer.act(() => row().props.onPress());
		await settle();
		expect(text()).toContain(
			`Không mở được trang. Hãy mở địa chỉ này trong trình duyệt: ${VI_PAGE}`,
		);
		expect(text()).not.toContain('no activity');
		expect(mockReport).toHaveBeenCalledWith({
			code: PRIVACY_POLICY_OPEN_FAILED_CODE,
			operation: 'settings',
		});
	});

	it('clears the failure when a retry opens the page', async () => {
		const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('busy'));
		const { row, text } = render();
		ReactTestRenderer.act(() => row().props.onPress());
		await settle();
		openURL.mockResolvedValueOnce(true);
		ReactTestRenderer.act(() => row().props.onPress());
		await settle();
		expect(text()).not.toContain('Không mở được trang');
	});

	it('says a local build has no page yet, without trying to open one', () => {
		mockSite.current = null;
		const openURL = jest.spyOn(Linking, 'openURL');
		const { row, text } = render();
		ReactTestRenderer.act(() => row().props.onPress());
		expect(openURL).not.toHaveBeenCalled();
		expect(text()).toContain('Bản dựng này chưa có trang chính sách quyền riêng tư.');
	});
});
