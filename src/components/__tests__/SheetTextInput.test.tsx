import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import { i18n } from '../../i18n';
import { Sheet } from '../Sheet';
import { SheetTextInput } from '../SheetTextInput';

jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

/**
 * "Hôm" typed with Telex came out as "HôHôm", and "ww" as "www".
 *
 * The form held the text in state and passed it back as `value`, so every
 * keystroke wrote the field's own text back into it while the keyboard was
 * still composing. The field is now uncontrolled; these keep it that way.
 */
describe('SheetTextInput', () => {
	const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
	afterEach(() => {
		ReactTestRenderer.act(() => mounted.splice(0).forEach(tree => tree.unmount()));
	});

	const element = (initialValue: string, onChangeText: (next: string) => void) => (
		<I18nProvider i18n={i18n}>
			<Sheet title="Công việc mới">
				<SheetTextInput
					accessibilityLabel="Tên công việc"
					initialValue={initialValue}
					onChangeText={onChangeText}
				/>
			</Sheet>
		</I18nProvider>
	);

	const render = (initialValue: string, onChangeText = jest.fn()) => {
		let tree!: ReactTestRenderer.ReactTestRenderer;
		ReactTestRenderer.act(() => {
			tree = ReactTestRenderer.create(element(initialValue, onChangeText));
		});
		mounted.push(tree);
		return { tree, input: () => tree.root.findByType(TextInput) };
	};

	it('hands its text to the native field once and never controls it', () => {
		const { input } = render('Họp nhóm');
		expect(input().props.defaultValue).toBe('Họp nhóm');
		expect(input().props.value).toBeUndefined();
	});

	it('does not push a re-rendered value back into the field', () => {
		const onChangeText = jest.fn();
		const { tree, input } = render('Hô', onChangeText);
		// What the form does on every keystroke: re-render with the new text.
		ReactTestRenderer.act(() => tree.update(element('Hôm', onChangeText)));
		expect(input().props.defaultValue).toBe('Hô');
		expect(input().props.value).toBeUndefined();
	});

	it('reports what is typed', () => {
		const onChangeText = jest.fn();
		const { input } = render('', onChangeText);
		ReactTestRenderer.act(() => input().props.onChangeText('Hôm nay'));
		expect(onChangeText).toHaveBeenCalledWith('Hôm nay');
	});
});
