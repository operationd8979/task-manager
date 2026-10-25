import { durationMinutes } from '../duration';

/**
 * The +30 / +45 / +1 hour chips never lit up: they were rendered with
 * `selected={false}`, so after a tap nothing said which duration was set,
 * while "No end time" did. A chip is now lit while end = start + its minutes.
 */
describe('durationMinutes', () => {
	it.each([
		['09:00', '09:30', 30],
		['09:00', '09:45', 45],
		['18:00', '19:00', 60],
		['10:15', '11:30', 75],
	])('from %s to %s is %i minutes', (start, end, minutes) => {
		expect(durationMinutes(start, end)).toBe(minutes);
	});

	it('is null with no end time, so only "No end time" is lit', () => {
		expect(durationMinutes('09:00', null)).toBeNull();
	});

	it('no longer matches a chip once a time is moved by hand', () => {
		expect(durationMinutes('09:05', '09:45')).not.toBe(45);
	});
});
