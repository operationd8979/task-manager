import { revealOffset, type RevealGeometry } from '../reveal';

/** A 300pt gap above the keyboard, 16pt margin, not scrolled. */
const base: RevealGeometry = {
	fieldTop: 0,
	fieldHeight: 50,
	offset: 0,
	visibleHeight: 300,
	margin: 16,
};

describe('revealOffset', () => {
	it('leaves a field that is already in sight alone', () => {
		expect(revealOffset({ ...base, fieldTop: 100 })).toBeNull();
	});

	it('brings a field under the keyboard up to just above it', () => {
		// The note field at 600–700 with the keyboard covering everything past 300.
		const next = revealOffset({ ...base, fieldTop: 600, fieldHeight: 100 });
		expect(next).toBe(600 + 100 + 16 - 300);
	});

	it('accounts for how far the content is already scrolled', () => {
		// Same field, already scrolled 380: its bottom (700) is at 320 in the
		// viewport — still 36pt too low for the 16pt margin.
		expect(
			revealOffset({ ...base, fieldTop: 600, fieldHeight: 100, offset: 380 }),
		).toBe(416);
	});

	it('scrolls back down to a field scrolled out of sight above', () => {
		expect(revealOffset({ ...base, fieldTop: 40, offset: 200 })).toBe(24);
	});

	it('never asks for a negative offset', () => {
		expect(revealOffset({ ...base, fieldTop: 8, offset: 100 })).toBe(0);
	});

	it('keeps the bottom — where the caret is — for a field taller than the gap', () => {
		const next = revealOffset({ ...base, fieldTop: 100, fieldHeight: 400 });
		expect(next).toBe(100 + 400 + 16 - 300);
	});

	it('ignores sub-point differences', () => {
		// 0.5pt short of the margin is not worth moving the screen for.
		expect(
			revealOffset({ ...base, fieldTop: 234.5, fieldHeight: 50 }),
		).toBeNull();
	});

	it('does nothing while there is no visible area to reveal into', () => {
		expect(
			revealOffset({ ...base, fieldTop: 600, visibleHeight: 0 }),
		).toBeNull();
	});
});
