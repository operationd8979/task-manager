import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { useReminders } from '../../../app/providers/ReminderProvider';
import { Chevron } from '../../../components/Chevron';
import { Chip, ChipRow } from '../../../components/Chip';
import { ErrorState } from '../../../components/ErrorState';
import { Segmented } from '../../../components/Segmented';
import { Skeleton, SkeletonGroup } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { COUNTDOWN_OFFSETS } from '../../../domain/countdown';
import type { DisplayMode } from '../../../domain/settings';
import type { Weekday } from '../../../lib/date';
import { t } from '../../../lib/strings';
import { applyDisplayMode } from '../../../theme/mode';
import { appTheme } from '../../../theme/theme';
import {
	BAR_HEIGHT,
	DAY_ICON_SIZE,
	GLYPH_ALIGN,
	NAV_CHEVRON_SIZE,
	TAP_TARGET_MIN,
} from '../../../theme/tokens';
import { useSettings } from '../hooks/useSettings';

export function SettingsScreen() {
	const navigation = useNavigation();
	const settings = useSettings();
	const reminders = useReminders();
	const [confirmDestroy, setConfirmDestroy] = useState(false);

	return (
		<SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
			<View style={styles.bar}>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={t('settings.back')}
					onPress={() => navigation.goBack()}
					style={styles.back}>
					<Chevron direction="left" size={NAV_CHEVRON_SIZE} />
				</Pressable>
				<Text style={styles.barTitle}>{t('day.settings')}</Text>
			</View>

			{settings.state.status === 'loading' ? (
				<SkeletonGroup>
					<View style={styles.section}>
						<Skeleton height={TAP_TARGET_MIN} />
						<Skeleton height={TAP_TARGET_MIN} />
						<Skeleton height={TAP_TARGET_MIN} />
					</View>
				</SkeletonGroup>
			) : null}

			{settings.state.status === 'error' ? (
				<ErrorState
					title={t('timeline.errorTitle')}
					body={t('timeline.errorBody')}
					retryLabel={t('timeline.retry')}
					onRetry={settings.reload}
				/>
			) : null}

			{settings.state.status === 'ready' ? (
				<ScrollView contentContainerStyle={styles.content}>
					<Text style={styles.sectionTitle}>{t('settings.reminders')}</Text>

					{/* Permission state is a WORD, never a coloured dot (Principle V). */}
					<PermissionRow
						label={t('settings.notificationPermission')}
						granted={reminders.notification === 'granted'}
						onOpen={() => {
							reminders.openSettings('notifications').catch(() => undefined);
						}}
					/>
					{reminders.exactAlarm.required ? (
						<PermissionRow
							label={t('settings.exactAlarmPermission')}
							granted={reminders.exactAlarm.granted}
							note={
								reminders.exactAlarm.granted
									? undefined
									: t('settings.mayBeLate')
							}
							onOpen={() => {
								reminders.openSettings('exact-alarm').catch(() => undefined);
							}}
						/>
					) : null}

					{/* Its own section, away from the reminder rows above it. The two
              were one setting once, and the countdown kept being read as
              "when the phone rings" — which it has nothing to do with. */}
					<Text style={styles.sectionTitle}>{t('settings.countdown')}</Text>

					<View style={styles.row}>
						<Text style={styles.rowLabel}>{t('settings.countdownOffset')}</Text>
						<ChipRow>
							{COUNTDOWN_OFFSETS.map(offset => (
								<Chip
									key={offset}
									label={t('settings.countdownBefore', { minutes: offset })}
									selected={
										settings.state.status === 'ready' &&
										settings.state.settings.countdownMinutes === offset
									}
									onPress={() => {
										settings
											.update('countdownMinutes', offset)
											.catch(() => undefined);
									}}
								/>
							))}
						</ChipRow>
						{/* Says what it covers AND what it does not touch: this is the one
                setting that changes every row at once, so "mọi công việc" has
                to be stated rather than inferred. */}
						<Text style={styles.hint}>{t('settings.countdownHint')}</Text>
						{settings.saveFailed === 'countdownMinutes' ? (
							<Text style={styles.failed}>{t('settings.saveFailed')}</Text>
						) : null}
					</View>

					<Text style={styles.sectionTitle}>{t('settings.display')}</Text>

					<View style={styles.row}>
						<Text style={styles.rowLabel}>{t('settings.displayMode')}</Text>
						<Segmented<DisplayMode>
							accessibilityLabel={t('settings.displayMode')}
							value={settings.state.settings.displayMode}
							onChange={next => {
								// Applied immediately, before the write confirms — the theme is
								// presentation, and waiting on storage would feel broken.
								applyDisplayMode(next);
								settings.update('displayMode', next).catch(() => undefined);
							}}
							options={[
								{
									value: 'auto',
									label: t('settings.modeAuto'),
									hint: t('settings.modeAutoHint'),
								},
								{ value: 'light', label: t('settings.modeLight') },
								{ value: 'dark', label: t('settings.modeDark') },
							]}
						/>
						{settings.saveFailed === 'displayMode' ? (
							<Text style={styles.failed}>{t('settings.saveFailed')}</Text>
						) : null}
					</View>

					<View style={styles.row}>
						<Text style={styles.rowLabel}>{t('settings.firstDayOfWeek')}</Text>
						<Segmented<'1' | '7'>
							accessibilityLabel={t('settings.firstDayOfWeek')}
							value={String(settings.state.settings.firstDayOfWeek) as '1' | '7'}
							onChange={next => {
								settings
									.update('firstDayOfWeek', Number(next) as Weekday)
									.catch(() => undefined);
							}}
							options={[
								{ value: '1', label: t('settings.monday') },
								{ value: '7', label: t('settings.sunday') },
							]}
						/>
						{settings.saveFailed === 'firstDayOfWeek' ? (
							<Text style={styles.failed}>{t('settings.saveFailed')}</Text>
						) : null}
					</View>

					<Text style={styles.sectionTitle}>{t('settings.data')}</Text>
					<View style={styles.row}>
						<Text style={styles.rowLabel}>{t('settings.dataOnDevice')}</Text>
						<Text style={styles.hint}>
							{t('settings.itemCount', { count: settings.state.taskCount })}
						</Text>
					</View>

					{confirmDestroy ? (
						<View accessibilityRole="alert" style={styles.destroyConfirm}>
							<Text style={styles.destroyTitle}>
								{t('settings.destroyTitle')}
							</Text>
							{/* The one place a written confirmation survives: there is no
                  undo and no copy anywhere else (FR-011b, FR-054). */}
							<Text style={styles.hint}>
								{t('settings.destroyBody', { count: settings.state.taskCount })}
							</Text>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={t('settings.destroyConfirm')}
								onPress={() => {
									settings
										.destroyAll()
										.then(() => navigation.goBack())
										.catch(() => undefined);
								}}
								style={styles.destroyAction}>
								<Text style={styles.destroyLabel}>
									{t('settings.destroyConfirm')}
								</Text>
							</Pressable>
							<Pressable
								accessibilityRole="button"
								accessibilityLabel={t('common.cancel')}
								onPress={() => setConfirmDestroy(false)}
								style={styles.destroyAction}>
								<Text style={styles.rowLabel}>{t('common.cancel')}</Text>
							</Pressable>
						</View>
					) : (
						<Pressable
							accessibilityRole="button"
							accessibilityLabel={t('settings.destroyAll')}
							onPress={() => setConfirmDestroy(true)}
							style={styles.destroyButton}>
							<Text style={styles.destroyLabel}>{t('settings.destroyAll')}</Text>
						</Pressable>
					)}
				</ScrollView>
			) : null}
		</SafeAreaView>
	);
}

function PermissionRow({
	label,
	granted,
	note,
	onOpen,
}: {
	label: string;
	granted: boolean;
	note?: string;
	onOpen: () => void;
}) {
	return (
		<View style={styles.row}>
			<Text style={styles.rowLabel}>{label}</Text>
			<Text style={granted ? styles.hint : styles.failed}>
				{granted ? t('settings.granted') : t('settings.notGranted')}
			</Text>
			{note ? <Text style={styles.failed}>{note}</Text> : null}
			<Pressable
				accessibilityRole="button"
				accessibilityLabel={t('permission.openSettings')}
				onPress={onOpen}
				style={styles.linkAction}>
				<Text style={styles.link}>{t('permission.openSettings')}</Text>
			</Pressable>
		</View>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		screen: { flex: 1, backgroundColor: theme.color.background },
		bar: {
			minHeight: BAR_HEIGHT.day,
			flexDirection: 'row',
			alignItems: 'center',
			borderBottomWidth: 2,
			borderBottomColor: theme.color.onBackground,
		},
		// Same size as the day bar's controls: this header is the counterpart to
		// that one, and a smaller arrow here reads as a different app.
		back: {
			width: DAY_ICON_SIZE,
			height: DAY_ICON_SIZE,
			alignItems: 'center',
			justifyContent: 'center',
		},
		barTitle: {
			...theme.typography.body,
			...GLYPH_ALIGN,
			color: theme.color.onBackground,
			fontWeight: '800',
		},
		content: { padding: theme.spacing.md, gap: theme.spacing.md },
		section: { padding: theme.spacing.md, gap: theme.spacing.sm },
		sectionTitle: {
			...theme.typography.caption,
			color: theme.appColor.textMuted,
		},
		row: { gap: theme.spacing.xs },
		rowLabel: { ...theme.typography.body, color: theme.color.onBackground },
		hint: { ...theme.typography.label, color: theme.appColor.textMuted },
		failed: { ...theme.typography.label, color: theme.appColor.accentInk },
		linkAction: { minHeight: TAP_TARGET_MIN, justifyContent: 'center' },
		link: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
			fontWeight: '800',
		},
		// Outlined, not filled: a filled accent button is for the primary action,
		// never for the destructive one (design/wireframes.md W-06).
		destroyButton: {
			minHeight: BAR_HEIGHT.action,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 2,
			borderColor: theme.appColor.accentInk,
			backgroundColor: 'transparent',
			marginTop: theme.spacing.lg,
		},
		destroyLabel: {
			...theme.typography.body,
			color: theme.appColor.accentInk,
			fontWeight: '800',
		},
		destroyConfirm: {
			borderWidth: 2,
			borderColor: theme.appColor.accentInk,
			padding: theme.spacing.sm,
			gap: theme.spacing.xs,
			marginTop: theme.spacing.lg,
		},
		destroyTitle: {
			...theme.typography.body,
			color: theme.color.onBackground,
			fontWeight: '800',
		},
		destroyAction: { minHeight: TAP_TARGET_MIN, justifyContent: 'center' },
	};
});
