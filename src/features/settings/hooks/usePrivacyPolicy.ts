import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { useLocale } from '@chipmobilesdk/rn-i18n';

import { useDatabase } from '../../../app/providers/DatabaseProvider';
import {
	PRIVACY_POLICY_OPEN_FAILED_CODE,
	privacyPolicyUrl,
} from '../../../domain/privacyPolicy';

const SETTINGS_OPERATION = 'settings';

/**
 * Why the last tap did not show the policy:
 * - `open_failed`: no app on the device took the address (AC-10.3);
 * - `unpublished`: this build has no site yet, which the release check keeps
 *   to local builds (AC-7.5).
 */
export type PrivacyPolicyFailure = 'open_failed' | 'unpublished';

export interface UsePrivacyPolicy {
	/** The page in the app's language; `null` while no site is published. */
	url: string | null;
	failure: PrivacyPolicyFailure | null;
	open: () => void;
}

/** Opens the published privacy policy in the device browser (US-10, plan D-23). */
export function usePrivacyPolicy(): UsePrivacyPolicy {
	const { locale } = useLocale();
	const { errorLog } = useDatabase();
	const url = privacyPolicyUrl(locale);
	const [failure, setFailure] = useState<PrivacyPolicyFailure | null>(null);

	const open = useCallback(() => {
		if (url === null) {
			setFailure('unpublished');
			return;
		}
		setFailure(null);
		Linking.openURL(url).catch(() => {
			setFailure('open_failed');
			errorLog.report({
				code: PRIVACY_POLICY_OPEN_FAILED_CODE,
				operation: SETTINGS_OPERATION,
			});
		});
	}, [url, errorLog]);

	return { url, failure, open };
}
