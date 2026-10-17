import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import { ChoiceList } from '../ChoiceList';

const CHOICES = [
	{ value: 'none', label: 'Không lặp', description: 'Chỉ một lần' },
	{ value: 'weekly', label: 'Lặp theo thứ', description: 'Các thứ cố định mỗi tuần' },
] as const;

describe('ChoiceList', () => {
	const render = (onChange = jest.fn()) => {
		let tree!: ReactTestRenderer.ReactTestRenderer;
		ReactTestRenderer.act(() => {
			tree = ReactTestRenderer.create(
				<ChoiceList
					accessibilityLabel="Thiết lập lặp lại"
					choices={CHOICES}
					value="weekly"
					onChange={onChange}
				/>,
			);
		});
		const rows = tree.root.findAll(
			node =>
				node.props.accessibilityRole === 'radio' &&
				typeof node.props.onPress === 'function',
		);
		return { tree, rows };
	};

	it('is a radio group whose rows say which one is chosen', () => {
		const { tree, rows } = render();
		expect(
			tree.root.findAll(node => node.props.accessibilityRole === 'radiogroup'),
		).not.toHaveLength(0);
		expect(rows.map(row => row.props.accessibilityState.checked)).toEqual([
			false,
			true,
		]);
		ReactTestRenderer.act(() => tree.unmount());
	});

	it('reads each option together with what it does', () => {
		const { tree, rows } = render();
		expect(rows[1].props.accessibilityLabel).toBe(
			'Lặp theo thứ. Các thứ cố định mỗi tuần',
		);
		ReactTestRenderer.act(() => tree.unmount());
	});

	it('reports the option that was tapped', () => {
		const onChange = jest.fn();
		const { tree, rows } = render(onChange);
		ReactTestRenderer.act(() => rows[0].props.onPress());
		expect(onChange).toHaveBeenCalledWith('none');
		ReactTestRenderer.act(() => tree.unmount());
	});
});
