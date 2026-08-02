import React, {forwardRef, useCallback, useMemo} from 'react';
import {Pressable, View} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {StyleSheet, useUnistyles} from 'react-native-unistyles';

import {appTheme} from '../theme/theme';
import {BAR_HEIGHT, TAP_TARGET_MIN} from '../theme/tokens';
import {t} from '../lib/strings';
import {Text} from './Text';

/** Minimum gap to the screen edge, so the timeline stays visible behind. */
const TOP_GAP = 24;

export interface SheetProps {
  title: string;
  children: React.ReactNode;
  /** Pinned to the bottom of the sheet; stays visible with the keyboard open. */
  footer?: React.ReactNode;
  /**
   * A blocking sheet cannot be swiped down or dismissed by tapping the scrim.
   * Used by the apply-scope sheet: a stray tap must never write data (S-05).
   */
  blocking?: boolean;
  onClose?: () => void;
}

/** Placeholder until the icon set is chosen (decisions.md D-06). */
const CLOSE_GLYPH = '×';

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    background: {
      backgroundColor: theme.color.background,
      borderRadius: theme.radius.md,
    },
    container: {
      backgroundColor: theme.color.background,
    },
    header: {
      minHeight: BAR_HEIGHT.sheetHeader,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: theme.color.onBackground,
    },
    title: {
      ...theme.appType.sheetTitle,
      color: theme.color.onBackground,
      flexShrink: 1,
    },
    close: {
      width: TAP_TARGET_MIN,
      height: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeGlyph: {
      ...theme.typography.title,
      color: theme.color.onBackground,
    },
    body: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    footer: {
      minHeight: BAR_HEIGHT.action,
      backgroundColor: theme.color.background,
      borderTopWidth: 1,
      borderTopColor: theme.color.border,
    },
  };
});

export const Sheet = forwardRef<BottomSheetModal, SheetProps>(function SheetImpl(
  {title, children, footer, blocking = false, onClose},
  ref,
) {
  const insets = useSafeAreaInsets();
  const {theme: rawTheme} = useUnistyles();
  const scrim = appTheme(rawTheme).appColor.scrim;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={blocking ? 'none' : 'close'}
        // A plain object, not a Unistyles style: RN style arrays do not accept
        // Unistyles' style objects, and the animated opacity must survive.
        style={[props.style, {backgroundColor: scrim}]}
      />
    ),
    [blocking, scrim],
  );

  const renderFooter = useMemo(() => {
    if (!footer) {
      return undefined;
    }
    return (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View style={styles.footer}>{footer}</View>
      </BottomSheetFooter>
    );
  }, [footer, insets.bottom]);

  return (
    <BottomSheetModal
      ref={ref}
      topInset={insets.top + TOP_GAP}
      enablePanDownToClose={!blocking}
      enableDynamicSizing
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={styles.background}
      handleComponent={null}
      onDismiss={onClose}>
      <BottomSheetView style={styles.container}>
        {/* Sticky header: the close button must stay reachable one-handed. */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {blocking ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('form.close')}
              onPress={onClose}
              style={styles.close}>
              <Text style={styles.closeGlyph}>{CLOSE_GLYPH}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.body}>{children}</View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

