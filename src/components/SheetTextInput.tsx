import React, { useRef, useState } from 'react';
import { Platform, type TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { withUnistyles } from 'react-native-unistyles';

import { useSheetField } from './Sheet';

/**
 * The OS picks these when nobody else does, and it picks them from the SYSTEM
 * theme rather than the app's: a phone in dark mode drew a pale teal caret in
 * the light form, barely visible on the field. They are props, not styles, so
 * `withUnistyles` maps them and re-renders the field on a light/dark switch.
 *
 * Android draws the selection highlight as given, behind the text, so it takes
 * the container tone that text stays readable on; the caret and handles take
 * the accent. iOS derives a translucent highlight from one tint, so it gets
 * the accent itself.
 */
const ThemedInput = withUnistyles(BottomSheetTextInput, theme => ({
	cursorColor: theme.tone.accent.fg,
	selectionHandleColor: theme.tone.accent.fg,
	selectionColor:
		Platform.OS === 'ios' ? theme.tone.accent.fg : theme.tone.accent.container,
	placeholderTextColor: theme.color.onSurfaceVariant,
}));

export interface SheetTextInputProps
	extends Omit<TextInputProps, 'value' | 'defaultValue'> {
	/** What the field shows when it opens. Read once; see below. */
	initialValue: string;
}

/**
 * The only text field a sheet renders.
 *
 * UNCONTROLLED, deliberately. A React Native TextInput's text lives in the
 * native view; a `value` prop is written back into it on every render. The
 * keyboard composes words in place — Vietnamese Telex turns "oo" into "ô" by
 * REPLACING the text it is composing — and a write-back landing in the middle
 * of that breaks the composition, after which the keyboard commits its text
 * again: "Hôm" came out "HôHôm" and "ww" came out "www", on Samsung Keyboard
 * and Gboard alike. Native apps never overwrite a field while people type. So
 * the text is handed over once and only read back through onChangeText;
 * nothing in the form ever sets it from outside.
 *
 * A `BottomSheetTextInput`, so the sheet knows the keyboard is for it, and it
 * tells the sheet when it gains focus or grows so the sheet can keep it above
 * the keyboard (useRevealFocusedField).
 */
export function SheetTextInput({
	initialValue,
	onFocus,
	onBlur,
	onLayout,
	...rest
}: Readonly<SheetTextInputProps>) {
	const { reveal } = useSheetField();
	const [defaultValue] = useState(initialValue);
	const focused = useRef(false);

	return (
		<ThemedInput
			{...rest}
			defaultValue={defaultValue}
			onFocus={event => {
				focused.current = true;
				reveal(true);
				onFocus?.(event);
			}}
			onBlur={event => {
				focused.current = false;
				onBlur?.(event);
			}}
			// A multiline field grows a line at a time as people type; following it
			// keeps the line being written above the keyboard.
			onLayout={event => {
				if (focused.current) {
					reveal(false);
				}
				onLayout?.(event);
			}}
		/>
	);
}
