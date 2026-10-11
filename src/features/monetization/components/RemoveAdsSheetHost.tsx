import React from 'react';

import { useInterruptionBlocker } from '../../../app/providers/InterruptionProvider';
import { useMonetization } from '../../../app/providers/MonetizationProvider';
import { RemoveAdsSheet } from './RemoveAdsSheet';

/**
 * Mounts the Remove-ads sheet wherever it was asked for — the timeline's banner
 * link or Settings — from one place below the bottom-sheet provider, so the
 * sheet appears over whichever screen is showing (plan D-4).
 */
export function RemoveAdsSheetHost() {
	const monetization = useMonetization();
	const request = monetization?.removeAdsRequest ?? null;
	// An open sheet is the user mid-task: nothing may cut in (FR-10).
	useInterruptionBlocker('overlay', request !== null);
	if (monetization === null || request === null) {
		return null;
	}
	return <RemoveAdsSheet mode={request.mode} onClose={monetization.closeRemoveAds} />;
}
