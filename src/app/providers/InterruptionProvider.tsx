import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
	createInterruptionTracker,
	type InterruptionReason,
	type InterruptionTracker,
} from '../../lib/interruptions';

const InterruptionContext = createContext<InterruptionTracker | null>(null);

/**
 * Holds what the user is in the middle of, for anything that must not cut in:
 * the consent form and the full-screen ad (specs/002-ads-and-remove-ads FR-10).
 *
 * Mounted outside the boot branch in App.tsx, so "Delete all data" rebooting
 * the rest of the tree does not drop a wait that is already in progress.
 */
export function InterruptionProvider({ children }: { children: React.ReactNode }) {
	const [tracker] = useState(createInterruptionTracker);

	// Being in the background is itself a reason not to show anything. Only a
	// state that says so counts: `unknown` at launch is not "away", or the wait
	// would never end on a platform that reports it until the first change.
	useEffect(() => {
		const away = (state: string | null) => state === 'background' || state === 'inactive';
		let release: (() => void) | null = away(AppState.currentState)
			? tracker.acquire('background')
			: null;
		const subscription = AppState.addEventListener('change', state => {
			if (!away(state)) {
				release?.();
				release = null;
			} else if (release === null) {
				release = tracker.acquire('background');
			}
		});
		return () => {
			subscription.remove();
			release?.();
		};
	}, [tracker]);

	return (
		<InterruptionContext.Provider value={tracker}>
			{children}
		</InterruptionContext.Provider>
	);
}

/** Null outside the provider, so components still render in isolation. */
export function useInterruptions(): InterruptionTracker | null {
	return useContext(InterruptionContext);
}

/** Holds `reason` while `active` is true. A no-op outside the provider. */
export function useInterruptionBlocker(reason: InterruptionReason, active: boolean) {
	const tracker = useInterruptions();
	useEffect(() => {
		if (!active || tracker === null) {
			return undefined;
		}
		return tracker.acquire(reason);
	}, [active, reason, tracker]);
}
