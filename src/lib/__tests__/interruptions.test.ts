import { createInterruptionTracker } from '../interruptions';

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('createInterruptionTracker', () => {
	it('counts each reason, so one holder releasing never clears another', () => {
		const tracker = createInterruptionTracker();
		const rowA = tracker.acquire('drag');
		const rowB = tracker.acquire('drag');
		rowA();
		expect(tracker.active().has('drag')).toBe(true);
		rowB();
		expect(tracker.active().size).toBe(0);
	});

	it('ignores a second release of the same hold', () => {
		const tracker = createInterruptionTracker();
		const first = tracker.acquire('overlay');
		const second = tracker.acquire('overlay');
		first();
		first();
		expect(tracker.active().has('overlay')).toBe(true);
		second();
		expect(tracker.active().has('overlay')).toBe(false);
	});

	it('resolves at once when idle, and only after the last release otherwise', async () => {
		const tracker = createInterruptionTracker();
		const idleNow = jest.fn();
		tracker.waitUntilIdle().promise.then(idleNow);
		await flush();
		expect(idleNow).toHaveBeenCalled();

		const undo = tracker.acquire('undo');
		const permission = tracker.acquire('permission');
		const later = jest.fn();
		tracker.waitUntilIdle().promise.then(later);
		undo();
		await flush();
		expect(later).not.toHaveBeenCalled();
		permission();
		await flush();
		expect(later).toHaveBeenCalled();
	});

	it('leaves no listener behind once a wait is cancelled', async () => {
		const tracker = createInterruptionTracker();
		const hold = tracker.acquire('background');
		const resolved = jest.fn();
		const wait = tracker.waitUntilIdle();
		wait.promise.then(resolved);
		wait.cancel();
		hold();
		await flush();
		expect(resolved).not.toHaveBeenCalled();
	});
});
