import {
	REPEAT_ALERT_BOUNDS,
	validateToneDeclarations,
} from '@chipmobilesdk/rn-notification';

import { reminderTones, TONE_ALERT, TONE_SILENT } from '../tones';

const toneById = (id: string) =>
	reminderTones().find(tone => tone.id === id);

/**
 * The SDK validates these at `channels.apply()`, which is on a device, at
 * startup, inside a catch that keeps the app running. A bad duration would
 * therefore ship as "reminders silently stopped ringing" rather than as a
 * failure anyone sees. Asserting it here moves that to the build.
 */
describe('reminder tones', () => {
	it('declares a configuration the SDK accepts', () => {
		expect(() => validateToneDeclarations(reminderTones())).not.toThrow();
	});

	it('rings repeatedly, bounded to fifteen minutes', () => {
		const alert = toneById(TONE_ALERT);
		expect(alert?.repeatAlert?.forMs).toBe(15 * 60 * 1000);
		expect(alert?.repeatAlert?.forMs).toBeGreaterThanOrEqual(
			REPEAT_ALERT_BOUNDS.minMs,
		);
		expect(alert?.repeatAlert?.forMs).toBeLessThanOrEqual(
			REPEAT_ALERT_BOUNDS.maxMs,
		);
	});

	/**
	 * The quiet notice is the tone for a task the user never asked to be nagged
	 * about. A repeat on it would be the loudest possible reading of "off".
	 */
	it('never repeats the silent notice', () => {
		expect(toneById(TONE_SILENT)?.repeatAlert).toBeUndefined();
	});

	/**
	 * These are the only part of a tone a user ever reads — in the notification
	 * settings screen, when they go looking for the switch that stops the noise.
	 * A label equal to the id means they are reading a developer identifier.
	 */
	it('gives every tone a label a person can read', () => {
		for (const tone of reminderTones()) {
			expect(tone.name).not.toBe(tone.id);
			expect(tone.name.trim().length).toBeGreaterThan(0);
		}
	});
});
