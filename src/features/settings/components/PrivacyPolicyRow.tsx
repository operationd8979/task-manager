import React from 'react';

import { ActionRow } from '../../../components/ActionRow';
import { useT } from '../../../i18n/useT';
import { usePrivacyPolicy } from '../hooks/usePrivacyPolicy';

/**
 * "Privacy policy" (US-10): a link out to the published page, on every
 * platform and for every purchase status. A failure is said under the row,
 * with the address, so the user can still reach the page by hand (AC-10.3).
 */
export function PrivacyPolicyRow() {
	const t = useT();
	const policy = usePrivacyPolicy();

	let failure: string | null = null;
	if (policy.failure === 'open_failed' && policy.url !== null) {
		failure = t('settings.privacyPolicyFailed', { url: policy.url });
	} else if (policy.failure === 'unpublished') {
		failure = t('settings.privacyPolicyUnpublished');
	}

	return (
		<ActionRow
			role="link"
			first
			label={t('settings.privacyPolicy')}
			hint={t('settings.privacyPolicyHint')}
			failure={failure}
			onPress={policy.open}
		/>
	);
}
