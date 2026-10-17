import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { layout } from '@chipmobilesdk/rn-theme';

import type { RemoveAdsMode } from '../../../app/providers/MonetizationProvider';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { Notice } from '../../../components/Notice';
import { Sheet } from '../../../components/Sheet';
import { Skeleton, SkeletonGroup } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { useT } from '../../../i18n/useT';
import { BAR_HEIGHT } from '../../../theme/tokens';
import {
	useRemoveAdsFlow,
	type RemoveAdsFlow,
	type RemoveAdsView,
} from '../hooks/useRemoveAdsFlow';

const SUCCESS_GLYPH = '✓';

export interface RemoveAdsSheetProps {
	mode: RemoveAdsMode;
	onClose: () => void;
}

/**
 * Buy, restore and their outcomes in one sheet, opened from the banner link and
 * from Settings (SCR-2; plan D-4, D-16). Price, title and description come from
 * the store, never from the app (FR-7).
 */
export function RemoveAdsSheet({ mode, onClose }: RemoveAdsSheetProps) {
	const t = useT();
	const flow = useRemoveAdsFlow(mode);
	return (
		<Sheet title={t('removeAds.title')} onClose={onClose}>
			<Body flow={flow} onClose={onClose} />
		</Sheet>
	);
}

function Body({ flow, onClose }: { flow: RemoveAdsFlow; onClose: () => void }) {
	const t = useT();
	const { view } = flow;
	switch (view.kind) {
		case 'loading':
			return <Loading />;
		case 'ready':
			return <Ready flow={flow} view={view} />;
		case 'pending':
			return (
				<View style={styles.stack}>
					<Notice
						tone="warning"
						label={t('removeAds.pendingLabel')}
						title={t('removeAds.pendingTitle')}
						body={t('removeAds.pendingBody')}
					/>
					<RestoreLink flow={flow} />
				</View>
			);
		case 'success':
		case 'restored':
			return <Done restored={view.kind === 'restored'} onClose={onClose} />;
		case 'unavailable':
			return (
				<View style={styles.stack}>
					<EmptyState
						title={t('removeAds.unavailableTitle')}
						body={t('removeAds.unavailableBody')}
						actionLabel={flow.canRestore ? t('removeAds.restore') : undefined}
						onAction={flow.canRestore ? flow.restore : undefined}
					/>
					{view.note === 'nothingFound' ? <NothingFound /> : null}
				</View>
			);
		case 'error':
			return (
				<View style={styles.stack}>
					<ErrorState
						title={
							view.failed === 'restore'
								? t('removeAds.restoreFailedTitle')
								: t('removeAds.errorTitle')
						}
						body={t('removeAds.errorBody')}
						retryLabel={t('removeAds.retry')}
						onRetry={flow.retry}
					/>
					{view.failed === 'restore' ? null : <RestoreLink flow={flow} />}
				</View>
			);
	}
}

/** Shaped like the ready state it stands in for (Principle IV). */
function Loading() {
	const t = useT();
	return (
		<SkeletonGroup>
			<View style={styles.stack} accessibilityLabel={t('removeAds.loading')}>
				<Skeleton width="60%" height={24} />
				<Skeleton width="80%" height={18} />
				<Skeleton height={16} />
				<Skeleton height={BAR_HEIGHT.action} />
				<Text style={styles.muted}>{t('removeAds.loading')}</Text>
			</View>
		</SkeletonGroup>
	);
}

function Ready({
	flow,
	view,
}: {
	flow: RemoveAdsFlow;
	view: Extract<RemoveAdsView, { kind: 'ready' }>;
}) {
	const t = useT();
	const blocked = view.note === 'devBlocked';
	return (
		<View style={styles.stack}>
			<View style={styles.product}>
				<Text style={styles.title}>{view.product.title}</Text>
				<Text style={styles.muted}>{view.product.description}</Text>
			</View>
			<Text style={styles.body}>{t('removeAds.pitch')}</Text>
			<View style={styles.priceRow}>
				<Text style={styles.caption}>{t('removeAds.priceLabel')}</Text>
				<Text style={styles.title}>{view.product.formattedPrice}</Text>
			</View>
			{blocked ? (
				<Notice
					tone="warning"
					label={t('removeAds.devBlockedLabel')}
					title={t('removeAds.devBlockedTitle')}
					body={t('removeAds.devBlockedBody')}
				/>
			) : null}
			{flow.canBuy ? (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('removeAds.buy')}
					accessibilityState={{ disabled: blocked || flow.busy, busy: flow.busy }}
					disabled={blocked || flow.busy}
					onPress={flow.buy}
					// A development build can never buy; the button says so by turning
					// from filled to outlined, not by colour alone (design D-6).
					style={blocked ? styles.primaryBlocked : styles.primary}>
					<Text style={blocked ? styles.primaryBlockedLabel : styles.primaryLabel}>
						{t('removeAds.buy')}
					</Text>
				</Pressable>
			) : null}
			<RestoreLink flow={flow} />
			{view.note === 'nothingFound' ? <NothingFound /> : null}
			<Text style={[styles.muted, styles.centered]}>{t('removeAds.footnote')}</Text>
		</View>
	);
}

function Done({ restored, onClose }: { restored: boolean; onClose: () => void }) {
	const t = useT();
	return (
		<View style={styles.stack} accessibilityLiveRegion="polite">
			<View style={styles.successTag}>
				<View style={styles.successMark}>
					<Text style={styles.successGlyph}>{SUCCESS_GLYPH}</Text>
				</View>
				<Text style={styles.successLabel}>{t('removeAds.successLabel')}</Text>
			</View>
			<Text style={styles.title}>
				{restored ? t('removeAds.restoredTitle') : t('removeAds.successTitle')}
			</Text>
			<Text style={styles.body}>
				{restored ? t('removeAds.restoredBody') : t('removeAds.successBody')}
			</Text>
			<Text style={styles.muted}>{t('removeAds.successNote')}</Text>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('removeAds.done')}
				onPress={onClose}
				style={styles.primary}>
				<Text style={styles.primaryLabel}>{t('removeAds.done')}</Text>
			</Pressable>
		</View>
	);
}

/** Restore's honest answer when the account never bought (AC-4.3). */
function NothingFound() {
	const t = useT();
	return (
		<Notice
			tone="neutral"
			label={t('removeAds.nothingFoundLabel')}
			body={t('removeAds.nothingFoundBody')}
		/>
	);
}

function RestoreLink({ flow }: { flow: RemoveAdsFlow }) {
	const t = useT();
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={t('removeAds.restore')}
			accessibilityState={{ disabled: flow.busy }}
			disabled={flow.busy}
			onPress={flow.restore}
			style={styles.link}>
			<Text style={styles.linkLabel}>{t('removeAds.restore')}</Text>
		</Pressable>
	);
}

/** The shape both states of the purchase button share. */
const PRIMARY_BOX = { ...layout.center, minHeight: BAR_HEIGHT.action };

const styles = StyleSheet.create(theme => ({
	stack: {
		gap: theme.spacing.md,
	},
	product: {
		gap: theme.spacing.xs,
	},
	title: theme.text.title,
	body: theme.text.body,
	muted: theme.text.labelMuted,
	centered: {
		textAlign: 'center',
	},
	caption: theme.text.caption,
	priceRow: {
		...layout.rowBetween,
		...theme.border.top,
		paddingTop: theme.spacing.smPlus,
	},
	primary: {
		...PRIMARY_BOX,
		paddingHorizontal: theme.spacing.md,
		backgroundColor: theme.tone.accent.fill,
	},
	primaryLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.onFill,
	},
	// Inactive, so the contrast-exempt disabled state colour is the right one
	// for its outline; the label stays readable (Principle V).
	primaryBlocked: {
		...PRIMARY_BOX,
		paddingHorizontal: theme.spacing.md,
		borderWidth: theme.borderWidth.thin,
		borderColor: theme.color.disabled,
		backgroundColor: theme.color.surfaceContainerHigh,
	},
	primaryBlockedLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.color.onSurface,
	},
	link: {
		...theme.box.touchTarget,
		...layout.selfCenter,
		paddingHorizontal: theme.spacing.md,
	},
	linkLabel: {
		...theme.typography.body,
		...theme.font.heavy,
		color: theme.tone.accent.fg,
	},
	successTag: {
		...layout.rowCenter,
		gap: theme.spacing.sm,
	},
	successMark: {
		...layout.center,
		width: theme.size.touchTarget / 2,
		height: theme.size.touchTarget / 2,
		backgroundColor: theme.color.success,
	},
	successGlyph: {
		...theme.typography.caption,
		...theme.font.heavy,
		color: theme.color.onSuccess,
	},
	successLabel: {
		...theme.typography.caption,
		color: theme.color.success,
	},
}));
