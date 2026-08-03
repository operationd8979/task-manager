import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {BackHandler, Pressable, View} from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
  type BottomSheetScrollViewMethods,
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
  /**
   * The sheet body scrolls, so the ref belongs to the sheet rather than to the
   * screen inside it. Exposed for the one caller that needs to move the view
   * itself — bringing a validation error back into sight.
   */
  scrollRef?: React.Ref<BottomSheetScrollViewMethods>;
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
    header: {
      minHeight: BAR_HEIGHT.sheetHeader,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: theme.spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: theme.color.onBackground,
      // Opaque because it is sticky: the body scrolls underneath it.
      backgroundColor: theme.color.background,
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

export function Sheet({
  title,
  children,
  footer,
  blocking = false,
  onClose,
  scrollRef,
}: SheetProps) {
  const sheet = useRef<BottomSheetModal>(null);
  /** True once the owner has taken this sheet off screen. See `handleDismiss`. */
  const removed = useRef(false);

  /**
   * BottomSheetModal is an imperative component: it renders nothing at all
   * until `present()` is called on its ref. Every call site here is declarative
   * — the sheet is mounted exactly when it should be visible — so the bridge
   * between the two belongs in this one place rather than in six screens.
   *
   * Without it the buttons that open a sheet look dead: the press fires and the
   * state updates, but nothing is ever drawn.
   */
  useEffect(() => {
    sheet.current?.present();
    return () => {
      removed.current = true;
    };
  }, []);

  /**
   * `onDismiss` answers two different questions with one callback: "the user
   * closed this" and "the owner replaced this". Only the first is news.
   *
   * The library reports a dismissal when the EXIT ANIMATION ends, which is a
   * few hundred milliseconds after the tap that caused it. So a row action —
   * unmount this sheet, then open the next one — had its replacement wiped by
   * the reply to a close it had already handled: the sheet shut and no dialog
   * appeared. Once React has unmounted us, the owner has already decided what
   * is on screen and does not need telling.
   */
  const handleDismiss = useCallback(() => {
    if (removed.current) {
      return;
    }
    onClose?.();
  }, [onClose]);

  /**
   * On Android, back is how a sheet is dismissed. Neither the sheet library nor
   * the navigator claims it, so without this the press falls through to the
   * navigator, finds the timeline at the root of the stack, and quits the app
   * with the sheet still open.
   *
   * Always consumed, even when a sheet chose not to pass `onClose`: leaving the
   * app is never the right answer to back while a sheet is up. Listeners fire
   * most-recent-first, so a nested sheet closes before the one that opened it.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose?.();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onClose]);

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
      // `bottomInset` rather than padding inside the footer: the library shifts
      // it out of the way when the keyboard opens, and padding would sit there
      // as dead space above the keyboard.
      <BottomSheetFooter {...props} bottomInset={insets.bottom}>
        <View style={styles.footer}>{footer}</View>
      </BottomSheetFooter>
    );
  }, [footer, insets.bottom]);

  /**
   * `enableFooterMarginAdjustment` reserves the footer's own height; this adds
   * the inset the footer is lifted by, so the reserved space matches exactly
   * what covers the content.
   */
  const contentStyle = useMemo(
    () => ({paddingBottom: insets.bottom}),
    [insets.bottom],
  );

  return (
    <BottomSheetModal
      ref={sheet}
      topInset={insets.top + TOP_GAP}
      enablePanDownToClose={!blocking}
      enableDynamicSizing
      /**
       * The library's default is `switch`, which MINIMISES whichever sheet is
       * already open when a second one is presented. Every nested sheet here is
       * opened from inside its parent — repeat setup from the form, apply-scope
       * from a row action — so the default made the screen the user was working
       * in slide away the moment they opened a sub-sheet, which reads as the
       * app closing their work. `push` stacks them instead.
       */
      stackBehavior="push"
      backdropComponent={renderBackdrop}
      footerComponent={renderFooter}
      backgroundStyle={styles.background}
      handleComponent={null}
      onDismiss={handleDismiss}>
      {/*
        A scrollable, not a plain view. `enableDynamicSizing` sizes the sheet to
        its content and caps it at the screen — but a BottomSheetView reports
        its full height and then simply overflows past the cap, which is why a
        long form ran off the bottom with its last fields unreachable. A
        scrollable reports its CONTENT size instead, so the sheet grows to fit,
        stops at the cap, and scrolls the remainder. It also coordinates with
        the pan-down-to-close gesture, which a bare ScrollView fights.
      */}
      <BottomSheetScrollView
        ref={scrollRef}
        // Index 0 is the header: the close button must stay reachable
        // one-handed no matter how far the body has scrolled.
        stickyHeaderIndices={[0]}
        enableFooterMarginAdjustment={Boolean(footer)}
        // Chips and toggles stay tappable while the keyboard is up, instead of
        // spending the first tap on dismissing it.
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={contentStyle}>
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
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

