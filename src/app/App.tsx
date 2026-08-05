import React, {useEffect, useState} from 'react';
import {StyleSheet as RNStyleSheet, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StyleSheet} from 'react-native-unistyles';

import {ErrorState} from '../components/ErrorState';
import {Skeleton, SkeletonGroup} from '../components/Skeleton';
import {t} from '../lib/strings';
import {DataError} from '../services/db/errors';
import {openGateway, type DatabaseGateway} from '../services/db/gateway';
import {createSettingsRepository} from '../services/db/settingsRepository';
import {createTaskRepository} from '../services/db/taskRepository';
import {applyDisplayMode} from '../theme/mode';
import {appTheme} from '../theme/theme';
import {RootStack} from './navigation/RootStack';
import {DatabaseProvider} from './providers/DatabaseProvider';
import {ReminderProvider} from './providers/ReminderProvider';
import {UndoProvider} from './providers/UndoProvider';

/**
 * A plain React Native style, deliberately not a Unistyles one.
 *
 * The Unistyles Babel plugin only rewrites components imported from
 * 'react-native'; GestureHandlerRootView comes from another package, so it
 * receives the style object raw. Handing a third-party component Unistyles'
 * internal style shape is outside that package's contract, and this root must
 * be exactly `flex: 1` for gesture handling to cover the screen.
 */
const rootStyle = RNStyleSheet.create({fill: {flex: 1}});

type BootState =
  | {status: 'loading'}
  | {status: 'ready'; gateway: DatabaseGateway}
  | {status: 'failed'};

/**
 * Composition root.
 *
 * The database is opened and the display-mode preference applied BEFORE the
 * first screen mounts. Doing it afterwards produces a visible dark-to-light
 * flash for anyone who picked Sáng on a dark device (research.md R6).
 */
export default function App() {
  const [boot, setBoot] = useState<BootState>({status: 'loading'});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let opened: DatabaseGateway | null = null;

    (async () => {
      try {
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
        setBoot({status: 'ready', gateway});
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
          setBoot({status: 'failed'});
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
  }, [attempt]);

  if (boot.status === 'loading') {
    return (
      <GestureHandlerRootView style={rootStyle.fill}>
        <SafeAreaProvider>
          <View style={styles.boot}>
            <SkeletonGroup>
            <Skeleton height={56} />
            <Skeleton height={76} />
            <Skeleton height={76} />
              <Skeleton height={92} />
            </SkeletonGroup>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (boot.status === 'failed') {
    return (
      <GestureHandlerRootView style={rootStyle.fill}>
        <SafeAreaProvider>
          <View style={styles.boot}>
            <ErrorState
            title={t('timeline.errorTitle')}
            body={t('timeline.errorBody')}
            retryLabel={t('timeline.retry')}
            onRetry={() => {
              setBoot({status: 'loading'});
              setAttempt(n => n + 1);
            }}
            />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={rootStyle.fill}>
      <SafeAreaProvider>
        <DatabaseProvider gateway={boot.gateway}>
          {/* Inside DatabaseProvider: it reads tasks and rules to rebuild the
              reminder schedule on launch and on every foreground return. */}
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
