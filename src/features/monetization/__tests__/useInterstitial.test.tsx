import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
	InterruptionProvider,
	useInterruptions,
} from '../../../app/providers/InterruptionProvider';
import type { InterruptionTracker } from '../../../lib/interruptions';
import {
	SHOW_AFTER_SETTLE_MS,
	useInterstitial,
	type TimelineSignal,
} from '../hooks/useInterstitial';

const mockController = { noteNewItemSaved: jest.fn(), preloadIfNear: jest.fn(), show: jest.fn() };
jest.mock('../../../app/providers/MonetizationProvider', () => ({
	useMonetization: () => ({ interstitial: mockController }),
}));

const DAY = '2026-10-11';

/** Renders the hook inside the real interruption tracker, timeline state in hand. */
function setup() {
	const handles: {
		tracker: InterruptionTracker | null;
		note: ((date: string) => void) | null;
	} = { tracker: null, note: null };
	let timeline: TimelineSignal = { date: DAY, state: {}, ready: true };
	function Probe() {
		handles.tracker = useInterruptions();
		handles.note = useInterstitial(timeline).noteNewItemSaved;
		return null;
	}
	let tree!: ReactTestRenderer.ReactTestRenderer;
	const render = () =>
		ReactTestRenderer.act(() => {
			const element = (
				<InterruptionProvider>
					<Probe />
				</InterruptionProvider>
			);
			if (tree) {
				tree.update(element);
			} else {
				tree = ReactTestRenderer.create(element);
			}
		});
	render();
	return {
		handles,
		/** The reload after a save hands the timeline a new, ready state. */
		reloadTimeline(next: Partial<TimelineSignal> = {}) {
			timeline = { ...timeline, state: {}, ...next };
			render();
		},
		save(date = DAY) {
			ReactTestRenderer.act(() => handles.note?.(date));
		},
		hold(reason: Parameters<InterruptionTracker['acquire']>[0]) {
			let release: () => void = () => undefined;
			ReactTestRenderer.act(() => {
				release = handles.tracker!.acquire(reason);
			});
			return () => ReactTestRenderer.act(() => release());
		},
		unmount: () => ReactTestRenderer.act(() => tree.unmount()),
	};
}

const settle = () =>
	ReactTestRenderer.act(() => {
		jest.advanceTimersByTime(SHOW_AFTER_SETTLE_MS);
	});

beforeEach(() => {
	jest.useFakeTimers();
	mockController.noteNewItemSaved.mockReset().mockReturnValue(true);
	mockController.show.mockReset().mockResolvedValue(true);
});
afterEach(() => jest.useRealTimers());

describe('useInterstitial', () => {
	it('shows once the timeline has redrawn with the new item, after a settle (AC-8.1)', () => {
		const view = setup();
		view.save();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.reloadTimeline();
		expect(mockController.show).not.toHaveBeenCalled();
		settle();
		expect(mockController.show).toHaveBeenCalledTimes(1);
		view.unmount();
	});

	it('follows a save that landed on another day (design/ia F-2)', () => {
		const view = setup();
		view.save('2026-10-12');
		view.reloadTimeline();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.reloadTimeline({ date: '2026-10-12' });
		settle();
		expect(mockController.show).toHaveBeenCalledTimes(1);
		view.unmount();
	});

	it('does nothing when no ad is due (AC-8.4, AC-1.5)', () => {
		mockController.noteNewItemSaved.mockReturnValue(false);
		const view = setup();
		view.save();
		view.reloadTimeline();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.unmount();
	});

	it('waits out a permission prompt that is already up (AC-8.5)', () => {
		const view = setup();
		const release = view.hold('permission');
		view.save();
		view.reloadTimeline();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		// Android pauses the activity to show the prompt; that is not leaving.
		const background = view.hold('background');
		background();
		release();
		settle();
		expect(mockController.show).toHaveBeenCalledTimes(1);
		view.unmount();
	});

	it('drops the ad when the user opens a sheet first (AC-8.6)', () => {
		const view = setup();
		view.save();
		const sheet = view.hold('overlay');
		view.reloadTimeline();
		sheet();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.unmount();
	});

	it('drops the ad when the user leaves the app first (AC-8.6)', () => {
		const view = setup();
		view.save();
		const background = view.hold('background');
		background();
		view.reloadTimeline();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.unmount();
	});

	it('never shows at launch, only after a save (AC-8.9)', () => {
		const view = setup();
		view.reloadTimeline();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
		view.unmount();
	});

	it('leaves no pending show behind when the timeline goes away (Principle VII)', () => {
		const view = setup();
		view.save();
		view.reloadTimeline();
		view.unmount();
		settle();
		expect(mockController.show).not.toHaveBeenCalled();
	});
});
