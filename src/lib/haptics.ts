import { Vibration } from 'react-native';

/**
 * Three feedback levels (design/ux-ui-spec.md §5.4):
 *   light   — drag start, each 15-minute snap
 *   medium  — marking done, applying a scope
 *   warning — save failure, validation error
 * Navigation alone never vibrates.
 *
 * KNOWN LIMITATION: React Native's core `Vibration` API only produces a plain
 * buzz, so the three levels currently differ in duration rather than in
 * texture. Real impact styles need a native haptics package, which the plan's
 * dependency list does not include — see the note in the completion report.
 * Every call site already asks for the right level, so replacing the backend is
 * a change to this file alone.
 */

const PATTERN = {
	light: 10,
	medium: 20,
	warning: 40,
} as const;

export type HapticLevel = keyof typeof PATTERN;

export function haptic(level: HapticLevel): void {
	Vibration.vibrate(PATTERN[level]);
}
