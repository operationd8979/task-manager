import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet as RNStyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import { ErrorState } from '../components/ErrorState';
import { Skeleton, SkeletonGroup } from '../components/Skeleton';
import { i18n } from '../i18n';
import { useT } from '../i18n/useT';
import { DataError } from '../services/db/errors';
import { openGateway, type DatabaseGateway } from '../services/db/gateway';
import { createSettingsRepository } from '../services/db/settingsRepository';
import { createTaskRepository } from '../services/db/taskRepository';
import { applyDisplayMode } from '../theme/mode';
import { appTheme } from '../theme/theme';
import { RootStack } from './navigation/RootStack';
import { DatabaseProvider } from './providers/DatabaseProvider';
import { ReminderProvider } from './providers/ReminderProvider';
import { UndoProvider } from './providers/UndoProvider';

/**
 * A plain React Native style, deliberately not a Unistyles one.
 *
 * The Unistyles Babel plugin only rewrites components imported from
 * 'react-native'; GestureHandlerRootView comes from another package, so it
 * receives the style object raw. Handing a third-party component Unistyles'
 * internal style shape is outside that package's contract, and this root must
 * be exactly `flex: 1` for gesture handling to cover the screen.
 */
const rootStyle = RNStyleSheet.create({ fill: { flex: 1 } });

type BootState =
	| { status: 'loading' }
	| { status: 'ready'; gateway: DatabaseGateway }
	| { status: 'failed' };

/**
 * The gateway the tree is actually given.
 *
 * `destroyAll` closes the handle before it deletes anything (see gateway.ts),
 * so the gateway it was called on is dead the moment it returns — while every
 * repository in the tree is still holding that same handle. That is what
 * left "Xóa toàn bộ dữ liệu" on a screen that could not load, behind a Retry
 * that re-read through the closed handle and failed identically every time;
 * relaunching the app was the only cure, because relaunching is what opens a
 * new handle. Rebooting here is that relaunch, without the relaunch.
 */
function withReboot(
	gateway: DatabaseGateway,
	reboot: () => void,
): DatabaseGateway {
	return {
		...gateway,
		async destroyAll() {
			try {
				await gateway.destroyAll();
			} finally {
				// In `finally` rather than after the await: the close comes first
				// inside destroyAll, so a wipe that fails part-way leaves the handle
				// exactly as dead as one that succeeds.
				reboot();
			}
		},
	};
}

/**
 * Composition root.
 *
 * The database is opened and the display-mode preference applied BEFORE the
 * first screen mounts. Doing it afterwards produces a visible dark-to-light
 * flash for anyone who picked Sáng on a dark device (research.md R6).
 */
export default function App() {
	const [boot, setBoot] = useState<BootState>({ status: 'loading' });
	const [attempt, setAttempt] = useState(0);

	/**
	 * Run the boot sequence again: open a new handle, re-apply the display mode,
	 * and rebuild the tree on top of it. Both the Retry on a failed boot and a
	 * wipe come through here.
	 */
	const reboot = useCallback(() => {
		setBoot({ status: 'loading' });
		setAttempt(n => n + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;
		let opened: DatabaseGateway | null = null;

		(async () => {
			try {
				// Before the database, not after it: the one screen below that can
				// appear WITHOUT a database is the boot-failure state, and it is the
				// screen a user in trouble actually reads. Resolving the language
				// first is what lets it come out in theirs.
				await i18n.init();

				const gateway = await openGateway();
				opened = gateway;

				const settings = await createSettingsRepository(
					gateway.handle,
				).getAll();
				applyDisplayMode(settings.displayMode);

				// Anything still soft-deleted belongs to an undo window that never
				// closed because the app was killed. FR-011a's edge case says that
				// deletion is permanent, so the sweep runs before the first screen.
				//
				// Its failure is recorded and swallowed rather than raised: a
				// housekeeping pass over rows that are already invisible to every read
				// has no business deciding whether the app starts. It got that vote
				// once, and a single undone delete on disk was enough to brick boot
				// permanently — Retry re-read the same rows and failed the same way.
				try {
					await createTaskRepository(gateway.handle).purgeAllSoftDeleted();
				} catch (error) {
					gateway.errorLog.report({
						code: error instanceof DataError ? error.code : 'UNKNOWN',
						operation: 'task.purgeAllSoftDeleted',
					});
				}

				if (cancelled) {
					await gateway.close();
					return;
				}
				setBoot({ status: 'ready', gateway: withReboot(gateway, reboot) });
			} catch (error) {
				if (!cancelled) {
					// The error log lives on the handle we just failed to open, so this
					// one failure has nowhere to be recorded. In development it goes to
					// the console — without it, a boot failure is a red box with no code
					// and the only way forward is reading package source.
					// Never shown in the UI: FR-055 forbids technical codes there.
					if (__DEV__) {
						console.error(
							'[boot] database open failed:',
							error instanceof DataError ? error.code : error,
						);
					}
					setBoot({ status: 'failed' });
				}
			}
		})();

		// Principle VII: a handle opened by an effect that lost the race must not
		// survive it — eight handles is the ceiling, and a leak here is permanent.
		return () => {
			cancelled = true;
			opened?.close().catch(() => {
				// The gateway is being discarded either way; there is no state left to
				// report into and the error log lives on the handle being closed.
			});
		};
	}, [attempt, reboot]);

	return (
		<I18nProvider i18n={i18n}>
			<GestureHandlerRootView style={rootStyle.fill}>
				<SafeAreaProvider>
					{boot.status === 'loading' ? (
						<View style={styles.boot}>
							<SkeletonGroup>
								<Skeleton height={56} />
								<Skeleton height={76} />
								<Skeleton height={76} />
								<Skeleton height={92} />
							</SkeletonGroup>
						</View>
					) : null}

					{boot.status === 'failed' ? <BootFailed onRetry={reboot} /> : null}

					{boot.status === 'ready' ? (
						<DatabaseProvider gateway={boot.gateway}>
							{/* Inside DatabaseProvider: it reads tasks and rules to rebuild
                  the reminder schedule on launch and on every foreground
                  return. */}
							<ReminderProvider>
								<BottomSheetModalProvider>
									<NavigationContainer>
										{/* Above the navigator on purpose — see UndoProvider. */}
										<UndoProvider>
											<RootStack />
										</UndoProvider>
									</NavigationContainer>
								</BottomSheetModalProvider>
							</ReminderProvider>
						</DatabaseProvider>
					) : null}
				</SafeAreaProvider>
			</GestureHandlerRootView>
		</I18nProvider>
	);
}

/**
 * Its own component so that it sits INSIDE `I18nProvider` and can subscribe to
 * the active language. `App` renders the provider, so it is above it and has no
 * translation of its own to reach for.
 */
function BootFailed({ onRetry }: { onRetry: () => void }) {
	const t = useT();
	return (
		<View style={styles.boot}>
			<ErrorState
				title={t('timeline.errorTitle')}
				body={t('timeline.errorBody')}
				retryLabel={t('timeline.retry')}
				onRetry={onRetry}
			/>
		</View>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		boot: {
			flex: 1,
			backgroundColor: theme.color.background,
			padding: theme.spacing.md,
			gap: theme.spacing.sm,
		},
	};
});
