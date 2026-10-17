import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useMonetization } from '../../../app/providers/MonetizationProvider';
import { ActionRow } from '../../../components/ActionRow';
import { Chevron } from '../../../components/Chevron';
import { Skeleton, SkeletonGroup } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { removeAdsSectionState, type PrivacyOptionsOutcome } from '../../../domain/monetization';
import { useT } from '../../../i18n/useT';
import { appTheme } from '../../../theme/theme';
import { BAR_HEIGHT, TAP_TARGET_MIN } from '../../../theme/tokens';

const OWNED_GLYPH = '✓';
/** Width of the stand-in for the row title while the purchase is checked. */
const CHECKING_TITLE_WIDTH = '40%';

/**
 * The Settings "Ads" section (SCR-3; design D-9). Restore is always offered
 * where store billing exists — owners included — and opens the sheet in restore
 * mode, so every restore result is shown in one place (plan D-16).
 */
export function RemoveAdsSection() {
	const t = useT();
	const monetization = useMonetization();
	if (monetization === null) {
		return null;
	}
	const state = removeAdsSectionState({
		supported: monetization.supported,
		storeAvailable: monetization.storeAvailable,
		purchase: monetization.purchase,
		pending: monetization.pending,
	});
	if (state === 'hidden') {
		return null;
	}

	// A fragment, not a wrapper: Settings spaces its titles and rows as siblings,
	// and this section has to sit in that rhythm like every other one.
	return (
		<>
			<Text style={styles.sectionTitle}>{t('settings.ads')}</Text>

			{state === 'unavailable' ? (
				<View style={styles.block}>
					<Text style={styles.rowLabel}>{t('settings.adsUnavailableTitle')}</Text>
					<Text style={styles.hint}>{t('settings.adsUnavailableBody')}</Text>
				</View>
			) : (
				<View>
					{state === 'checking' ? (
						<View style={[styles.row, styles.rowFirst]} accessibilityLabel={t('settings.adsChecking')}>
							<SkeletonGroup>
								<Skeleton width={CHECKING_TITLE_WIDTH} height={18} />
							</SkeletonGroup>
							<Text style={styles.hint}>{t('settings.adsChecking')}</Text>
						</View>
					) : null}

					{state === 'owned' ? (
						<View style={[styles.row, styles.rowFirst, styles.rowInline]}>
							<View style={styles.ownedMark}>
								<Text style={styles.ownedGlyph}>{OWNED_GLYPH}</Text>
							</View>
							<View style={styles.rowText}>
								<Text style={styles.rowLabel}>{t('settings.adsOwned')}</Text>
								<Text style={styles.hint}>{t('settings.adsOwnedHint')}</Text>
							</View>
						</View>
					) : null}

					{state === 'buy' || state === 'pending' ? (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t('settings.removeAds')}
							onPress={() => monetization.openRemoveAds()}
							style={[styles.row, styles.rowFirst, styles.rowInline]}>
							<View style={styles.rowText}>
								<Text style={styles.rowLabel}>{t('settings.removeAds')}</Text>
								{state === 'pending' ? (
									<Text style={styles.pendingTag}>{t('settings.adsPending')}</Text>
								) : (
									<Text style={styles.hint}>{t('settings.removeAdsHint')}</Text>
								)}
							</View>
							<Chevron direction="right" />
						</Pressable>
					) : null}

					<ActionRow
						label={t('settings.restore')}
						onPress={() => monetization.openRemoveAds({ mode: 'restore' })}
					/>

					{monetization.privacyOptions ? (
						<PrivacyOptionsRow open={monetization.openPrivacyOptions} />
					) : null}
				</View>
			)}
		</>
	);
}

/**
 * "Privacy options" (SCR3-privacy-sl5): reopens Google's consent form so the
 * user can change their choice (AC-6.4). The form is Google's; the SDK applies
 * the new choice to later ad requests by itself. Only a failure is said here,
 * under the row, and tapping again is the retry (plan D-21).
 */
function PrivacyOptionsRow({ open }: { readonly open: () => Promise<PrivacyOptionsOutcome> }) {
	const t = useT();
	const [failed, setFailed] = useState(false);
	const onPress = useCallback(() => {
		setFailed(false);
		open()
			.then(outcome => setFailed(outcome === 'failed'))
			.catch(() => setFailed(true));
	}, [open]);

	return (
		<ActionRow
			label={t('settings.privacyOptions')}
			hint={t('settings.privacyOptionsHint')}
			failure={failed ? t('settings.privacyOptionsFailed') : null}
			onPress={onPress}
		/>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		sectionTitle: {
			...theme.typography.caption,
			color: theme.appColor.textMuted,
		},
		block: {
			gap: theme.spacing.xs,
			paddingVertical: theme.appSpacing.gap12,
			borderTopWidth: 1,
			borderBottomWidth: 1,
			borderColor: theme.color.border,
		},
		row: {
			minHeight: BAR_HEIGHT.action,
			justifyContent: 'center',
			gap: theme.spacing.xs,
			paddingVertical: theme.spacing.sm,
			borderBottomWidth: 1,
			borderBottomColor: theme.color.border,
		},
		rowFirst: {
			borderTopWidth: 1,
			borderTopColor: theme.color.border,
		},
		rowInline: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: theme.appSpacing.gap12,
		},
		rowText: {
			flex: 1,
			gap: theme.spacing.xs,
		},
		rowLabel: {
			...theme.typography.body,
			color: theme.color.onBackground,
		},
		hint: {
			...theme.typography.label,
			color: theme.appColor.textMuted,
		},
		pendingTag: {
			...theme.typography.caption,
			alignSelf: 'flex-start',
			paddingHorizontal: theme.spacing.xs,
			color: theme.appColor.accentInk,
			backgroundColor: theme.appColor.accentSoft,
		},
		ownedMark: {
			width: TAP_TARGET_MIN / 2,
			height: TAP_TARGET_MIN / 2,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: theme.color.success,
		},
		ownedGlyph: {
			...theme.typography.caption,
			fontWeight: '800',
			color: theme.appColor.onAccent,
		},
	};
});
