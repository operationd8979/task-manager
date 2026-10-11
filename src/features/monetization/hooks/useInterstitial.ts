import { useCallback, useEffect, useRef, useState } from 'react';

import { useInterruptions } from '../../../app/providers/InterruptionProvider';
import { useMonetization } from '../../../app/providers/MonetizationProvider';
import { interstitialStep, type Interruption } from '../../../domain/monetization';
import type { LocalDate } from '../../../lib/date';

export interface TimelineSignal {
	/** The day the timeline is showing. */
	date: LocalDate;
	/**
	 * The day's load state. A NEW value that is ready means the list was drawn
	 * again after the save — the saved item is on screen.
	 */
	state: object;
	ready: boolean;
}

interface Attempt {
	date: LocalDate;
	stateAtSave: object;
}

/**
 * Pause between the new task appearing and the ad: long enough to see the save
 * land (AC-8.1), short enough to read as part of the same moment.
 */
export const SHOW_AFTER_SETTLE_MS = 600;

/**
 * The full-screen ad after every third new item (US-8): counted on a create,
 * shown only once the timeline shows the new item and the user is not in the
 * middle of anything (FR-10, D-13). Never attempted at launch or on resume —
 * only right after a save (AC-8.9).
 */
export function useInterstitial(timeline: TimelineSignal): {
	noteNewItemSaved(savedDate: LocalDate): void;
} {
	const controller = useMonetization()?.interstitial ?? null;
	const interruptions = useInterruptions();
	const [attempt, setAttempt] = useState<Attempt | null>(null);
	/** What the user was in the middle of when the wait last looked. */
	const previous = useRef<ReadonlySet<Interruption>>(new Set());
	/** A show waiting out the settle pause; cleared only on unmount. */
	const scheduled = useRef<ReturnType<typeof setTimeout> | null>(null);
	const timelineRef = useRef(timeline);
	timelineRef.current = timeline;

	useEffect(
		() => () => {
			if (scheduled.current !== null) {
				clearTimeout(scheduled.current);
			}
		},
		[],
	);

	const noteNewItemSaved = useCallback(
		(savedDate: LocalDate) => {
			if (controller?.noteNewItemSaved()) {
				previous.current = interruptions?.active() ?? new Set();
				setAttempt({ date: savedDate, stateAtSave: timelineRef.current.state });
			}
		},
		[controller, interruptions],
	);

	const savedItemShown =
		attempt !== null &&
		timeline.date === attempt.date &&
		timeline.ready &&
		timeline.state !== attempt.stateAtSave;

	useEffect(() => {
		if (attempt === null || controller === null || interruptions === null) {
			return undefined;
		}
		const evaluate = () => {
			const current = interruptions.active();
			const step = interstitialStep({
				previous: previous.current,
				current,
				savedItemShown,
			});
			previous.current = current;
			if (step === 'wait') {
				return;
			}
			setAttempt(null);
			if (step === 'cancel') {
				// The counter stays due; the next new item tries again (AC-8.6).
				return;
			}
			// After a short settle, so the new item is seen first (AC-8.1), and only
			// if nothing started in between.
			scheduled.current = setTimeout(() => {
				scheduled.current = null;
				if (interruptions.active().size === 0) {
					controller.show().catch(() => undefined);
				}
			}, SHOW_AFTER_SETTLE_MS);
		};
		evaluate();
		return interruptions.subscribe(evaluate);
	}, [attempt, savedItemShown, controller, interruptions]);

	return { noteNewItemSaved };
}
