import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Platform, Switch } from 'react-native';
import { buildThemes } from '@chipmobilesdk/rn-theme';

import { themeConfig } from '../../theme/config';
import { Toggle } from '../Toggle';

/** The theme the Jest Unistyles mock serves (jest.setup.js). */
const theme = buildThemes(themeConfig).light;

/**
 * The reminder switch drew Material's pale teal on a phone in dark mode — the
 * OS colours, not the app's — and its "off" state was all but invisible.
 */
describe('Toggle', () => {
	afterEach(() => jest.restoreAllMocks());

	const render = (value: boolean) => {
		let tree!: ReactTestRenderer.ReactTestRenderer;
		ReactTestRenderer.act(() => {
			tree = ReactTestRenderer.create(
				<Toggle accessibilityLabel="Nhắc nhở" value={value} onValueChange={jest.fn()} />,
			);
		});
		const props = tree.root.findByType(Switch).props;
		ReactTestRenderer.act(() => tree.unmount());
		return props;
	};

	it('draws Android in the app theme in both states', () => {
		jest.replaceProperty(Platform, 'OS', 'android');
		const on = render(true);
		expect(on.thumbColor).toBe(theme.tone.accent.fill);
		expect(on.trackColor.true).toBe(theme.tone.accent.container);

		const off = render(false);
		expect(off.thumbColor).toBe(theme.color.outline);
		expect(off.trackColor.false).toBe(theme.color.outlineVariant);
	});

	it('keeps the native white thumb on iOS and themes only the tracks', () => {
		jest.replaceProperty(Platform, 'OS', 'ios');
		const on = render(true);
		expect(on.thumbColor).toBeUndefined();
		expect(on.trackColor.true).toBe(theme.tone.accent.fill);
		expect(on.ios_backgroundColor).toBe(theme.color.outlineVariant);
	});
});
