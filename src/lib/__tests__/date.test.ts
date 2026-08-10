import { nextWholeHour } from '../date';

/**
 * Runs without a renderer, like every other test under src — this is pure
 * wall-clock arithmetic (Principle II, VIII).
 */

const at = (iso: string) => new Date(iso);

describe('nextWholeHour', () => {
	it('rounds up to the next hour', () => {
		expect(nextWholeHour(at('2026-08-05T09:32:00'))).toBe('10:00');
		expect(nextWholeHour(at('2026-08-05T14:59:59'))).toBe('15:00');
	});

	it('moves on from an exact hour rather than offering the one just reached', () => {
		expect(nextWholeHour(at('2026-08-05T09:00:00'))).toBe('10:00');
	});

	it('pads a single-digit hour', () => {
		expect(nextWholeHour(at('2026-08-05T00:05:00'))).toBe('01:00');
	});

	it('clamps at the end of the day instead of wrapping to the start of it', () => {
		// 00:00 would be twenty-three hours in the PAST on the day being edited,
		// which is the opposite of what a "next hour" default is for.
		expect(nextWholeHour(at('2026-08-05T23:01:00'))).toBe('23:00');
		expect(nextWholeHour(at('2026-08-05T23:59:00'))).toBe('23:00');
	});

	it('still reaches the last hour from the one before it', () => {
		expect(nextWholeHour(at('2026-08-05T22:10:00'))).toBe('23:00');
	});
});
