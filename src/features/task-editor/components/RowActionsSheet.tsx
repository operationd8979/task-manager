import React from 'react';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Sheet} from '../../../components/Sheet';
import {Text} from '../../../components/Text';
import {t, type StringKey} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {TAP_TARGET_MIN} from '../../../theme/tokens';

export type RowAction = 'move' | 'edit' | 'delete';

export interface RowActionsSheetProps {
  title: string;
  /**
   * A session of a series reads differently: "Xóa" would suggest the whole
   * series is going away, so the last action becomes "Bỏ qua buổi này"
   * (design/ia §4 S-06). It also decides what "Di chuyển" opens — a session
   * belongs to its weekday, so only its time is on offer.
   */
  isOccurrence: boolean;
  onAction: (action: RowAction) => void;
  onClose: () => void;
}

/**
 * "Đổi giờ trong ngày" used to sit above this list, but Di chuyển already
 * offers the time — the two differed only in whether the date field was there
 * as well. Two entries for one job made the sheet longer and the choice
 * harder, so the narrower one is gone.
 *
 * "Sửa" is absent for a session because editing a session's CONTENT — title,
 * note, reminder — is not built yet. Listing it anyway gave a button that
 * closed the sheet and did nothing, which is worse than not offering it.
 */
function actionsFor(
  isOccurrence: boolean,
): ReadonlyArray<{action: RowAction; key: StringKey}> {
  return [
    {action: 'move', key: 'actions.move'},
    ...(isOccurrence
      ? []
      : [{action: 'edit' as const, key: 'actions.edit' as const}]),
    {
      action: 'delete',
      key: isOccurrence ? 'scope.skipThisSession' : 'actions.delete',
    },
  ];
}

/**
 * Every per-row action lives here (S-06).
 *
 * There is no swipe shortcut: the horizontal gesture belongs to day navigation
 * (FR-003b), and a gesture-only action would have no screen-reader equivalent.
 * That makes this sheet the single path, not a fallback.
 */
export function RowActionsSheet({
  title,
  isOccurrence,
  onAction,
  onClose,
}: RowActionsSheetProps) {
  const actions = actionsFor(isOccurrence);
  return (
    <Sheet title={t('actions.title')} onClose={onClose}>
      <Text style={styles.subject} numberOfLines={2}>
        {title}
      </Text>
      <View>
        {actions.map(item => (
          <Pressable
            key={item.action}
            accessibilityRole="button"
            accessibilityLabel={t(item.key)}
            onPress={() => onAction(item.action)}
            style={styles.row}>
            <Text
              style={
                item.action === 'delete' ? styles.destructive : styles.label
              }>
              {t(item.key)}
            </Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    subject: {
      ...theme.typography.label,
      color: theme.appColor.textMuted,
    },
    row: {
      minHeight: TAP_TARGET_MIN,
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
    },
    label: {
      ...theme.typography.body,
      color: theme.color.onBackground,
    },
    destructive: {
      ...theme.typography.body,
      color: theme.appColor.accentInk,
    },
  };
});
