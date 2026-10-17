import {
	useCallback,
	useEffect,
	useRef,
	type ComponentRef,
	type RefObject,
} from 'react';
import {
	Keyboard,
	TextInput,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	type View,
} from 'react-native';

import { revealOffset } from '../lib/reveal';

/** All this needs from the scroll view: the ability to move it. */
interface Scrollable {
	scrollTo: (options: { y: number; animated: boolean }) => void;
}

export interface RevealFocusedFieldOptions {
	scroll: RefObject<Scrollable | null>;
	/** The first view inside the scroll content; fields are measured against it. */
	content: RefObject<ComponentRef<typeof View> | null>;
	/**
	 * Height docked over the bottom of the viewport while the keyboard is up —
	 * a sheet's footer, which its library parks directly on top of the keyboard.
	 */
	coveredBottom: RefObject<number>;
	/** Room kept between the field and whatever covers it. */
	margin: number;
}

/**
 * Keeps the focused text field in sight above the keyboard, by MEASURING it.
 *
 * A fixed spacer under the form only guesses: it is ugly when the keyboard is
 * down and still wrong for a taller keyboard, a different device, or a note
 * that grows a line. This measures the field against the scroll content and
 * the viewport it actually has, and scrolls exactly as far as needed —
 * nowhere when it is already visible.
 *
 * It runs when:
 * - the keyboard opens (a short sheet just moves up; nothing re-lays out);
 * - the viewport changes size — the sheet shrinks it to end at the keyboard,
 *   one animation frame at a time, and the LAST of those layouts is the final
 *   size, so no guess about when the animation ends is needed;
 * - a field gains focus or grows while the keyboard is already up (exported
 *   as `reveal` for the field to call).
 *
 * Android's own ScrollView also scrolls a focused child into its frame when
 * the frame shrinks, but the bottom of that frame is under the docked footer,
 * which is exactly where it leaves the note field. The two agree on direction,
 * so they do not fight; this finishes the job.
 */
export function useRevealFocusedField({
	scroll,
	content,
	coveredBottom,
	margin,
}: RevealFocusedFieldOptions) {
	const offset = useRef(0);
	const viewportHeight = useRef(0);

	const reveal = useCallback(
		(animated: boolean) => {
			if (!Keyboard.isVisible()) {
				return;
			}
			const field = TextInput.State.currentlyFocusedInput();
			const body = content.current;
			if (field == null || body == null) {
				return;
			}
			field.measureLayout(
				body,
				(_left, top, _width, height) => {
					const next = revealOffset({
						fieldTop: top,
						fieldHeight: height,
						offset: offset.current,
						visibleHeight: viewportHeight.current - coveredBottom.current,
						margin,
					});
					if (next !== null) {
						scroll.current?.scrollTo({ y: next, animated });
					}
				},
				() => {
					// Not a failure: every sheet in a stack tries, and only the one
					// that contains the focused field can measure it against itself.
				},
			);
		},
		[scroll, content, coveredBottom, margin],
	);

	useEffect(() => {
		const subscription = Keyboard.addListener('keyboardDidShow', () =>
			reveal(true),
		);
		return () => subscription.remove();
	}, [reveal]);

	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			offset.current = event.nativeEvent.contentOffset.y;
		},
		[],
	);

	/**
	 * Not animated: this fires once per frame while the viewport shrinks, and
	 * following it frame by frame is what keeps the field glued above the
	 * keyboard instead of chasing it.
	 */
	const onViewportLayout = useCallback(
		(event: LayoutChangeEvent) => {
			viewportHeight.current = event.nativeEvent.layout.height;
			reveal(false);
		},
		[reveal],
	);

	return { reveal, onScroll, onViewportLayout };
}
