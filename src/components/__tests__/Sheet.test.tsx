import React, { useState } from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import { i18n } from '../../i18n';
import { Sheet } from '../Sheet';

/**
 * Tapping outside a new-task sheet with unsaved edits closed it, and then New
 * task did nothing.
 *
 * The scrim's `'close'` behaviour hid the sheet before the owner was asked. The
 * form answered "unsaved changes" by staying mounted, so the screen still
 * thought it open, and setting it open again changed nothing. A tap on the scrim
 * now asks the owner, like × and back; and a sheet the library closed itself (a
 * pan down) comes back if the owner keeps it.
 *
 * The global mock renders the sheet inert; this one records what the library is
 * asked to do.
 */
const mockLibrary = {
	present: jest.fn(),
	onDismiss: undefined as undefined | (() => void),
	backdrop: undefined as undefined | Record<string, unknown>,
};

jest.mock('@gorhom/bottom-sheet', () => {
	const ReactLib = require('react');
	const { View } = require('react-native');
	const passthrough = ({ children }: { children?: React.ReactNode }) =>
		ReactLib.createElement(View, null, children);
	const BottomSheetModal = ReactLib.forwardRef(
		(
			props: {
				children?: React.ReactNode;
				onDismiss?: () => void;
				backdropComponent?: (p: object) => React.ReactNode;
			},
			ref: React.Ref<unknown>,
		) => {
			ReactLib.useImperativeHandle(ref, () => ({ present: mockLibrary.present }));
			mockLibrary.onDismiss = props.onDismiss;
			return ReactLib.createElement(
				View,
				null,
				props.backdropComponent?.({ style: {} }),
				props.children,
			);
		},
	);
	return {
		__esModule: true,
		BottomSheetModal,
		BottomSheetScrollView: passthrough,
		BottomSheetFooter: passthrough,
		BottomSheetBackdrop: (props: Record<string, unknown>) => {
			mockLibrary.backdrop = props;
			return null;
		},
	};
});

jest.mock('react-native-safe-area-context', () => ({
	useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

/** An owner that may refuse to close, as the task form does with unsaved edits. */
function Owner({ refuse, onCloseRequested }: { refuse: boolean; onCloseRequested: () => void }) {
	const [open, setOpen] = useState(true);
	if (!open) {
		return null;
	}
	return (
		<Sheet
			title="Công việc mới"
			onClose={() => {
				onCloseRequested();
				if (!refuse) {
					setOpen(false);
				}
			}}>
			{null}
		</Sheet>
	);
}

describe('Sheet closing', () => {
	const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
	beforeEach(() => {
		mockLibrary.present.mockClear();
		mockLibrary.onDismiss = undefined;
		mockLibrary.backdrop = undefined;
	});
	afterEach(() => {
		ReactTestRenderer.act(() => mounted.splice(0).forEach(tree => tree.unmount()));
	});

	const render = (element: React.ReactElement) => {
		let tree!: ReactTestRenderer.ReactTestRenderer;
		ReactTestRenderer.act(() => {
			tree = ReactTestRenderer.create(<I18nProvider i18n={i18n}>{element}</I18nProvider>);
		});
		mounted.push(tree);
		return tree;
	};

	it('makes a tap on the scrim a request to the owner, never a close', () => {
		const onClose = jest.fn();
		render(<Sheet title="Công việc mới" onClose={onClose}>{null}</Sheet>);

		// Snapping to where it already is keeps the tap handler and moves nothing.
		expect(mockLibrary.backdrop?.pressBehavior).toBe(0);
		ReactTestRenderer.act(() => (mockLibrary.backdrop?.onPress as () => void)());
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('leaves the scrim inert on a blocking sheet', () => {
		render(
			<Sheet title="Áp dụng cho" blocking onClose={jest.fn()}>
				{null}
			</Sheet>,
		);

		expect(mockLibrary.backdrop?.pressBehavior).toBe('none');
		expect(mockLibrary.backdrop?.onPress).toBeUndefined();
	});

	it('comes back after a pan down when the owner keeps it open', () => {
		const onCloseRequested = jest.fn();
		render(<Owner refuse onCloseRequested={onCloseRequested} />);
		expect(mockLibrary.present).toHaveBeenCalledTimes(1);

		ReactTestRenderer.act(() => mockLibrary.onDismiss?.());

		expect(onCloseRequested).toHaveBeenCalledTimes(1);
		// Shown again, so the owner's "unsaved changes" prompt is on screen and the
		// screen's idea of "open" matches what the user sees.
		expect(mockLibrary.present).toHaveBeenCalledTimes(2);
	});

	it('stays closed after a pan down when the owner agrees', () => {
		const onCloseRequested = jest.fn();
		const tree = render(<Owner refuse={false} onCloseRequested={onCloseRequested} />);

		ReactTestRenderer.act(() => mockLibrary.onDismiss?.());

		expect(onCloseRequested).toHaveBeenCalledTimes(1);
		expect(mockLibrary.present).toHaveBeenCalledTimes(1);
		expect(tree.toJSON()).toBeNull();
	});
});
