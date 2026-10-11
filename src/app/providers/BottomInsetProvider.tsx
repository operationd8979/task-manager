import React, { createContext, useContext } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

const BottomInsetContext = createContext<SharedValue<number> | null>(null);

/**
 * Extra chrome stacked at the bottom of the timeline, in points — today the
 * banner slot (specs/002-ads-and-remove-ads design D-2). The undo toast reads it
 * to stay above that chrome, never over the ad.
 *
 * A shared value rather than state: it animates on the UI thread, and nothing
 * re-renders when the banner comes and goes.
 */
export function BottomInsetProvider({ children }: { children: React.ReactNode }) {
	const extra = useSharedValue(0);
	return (
		<BottomInsetContext.Provider value={extra}>{children}</BottomInsetContext.Provider>
	);
}

/** Null outside the provider: a toast rendered alone simply adds nothing. */
export function useBottomInset(): SharedValue<number> | null {
	return useContext(BottomInsetContext);
}
