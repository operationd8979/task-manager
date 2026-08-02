import React, {useMemo} from 'react';
import {Pressable, View} from 'react-native';
import {StyleSheet} from 'react-native-unistyles';

import {Text} from '../../../components/Text';
import {isOverdue, overdueByMinutes, type Task} from '../../../domain/task';
import {
  durationLabel,
  reminderOffsetLabel,
  timeRangeLabel,
} from '../../../lib/format';
import {t} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {ROW_MIN_HEIGHT, TAP_TARGET_MIN} from '../../../theme/tokens';

/** Placeholders until the icon set is chosen (decisions.md D-06). */
const CHECK_GLYPH = '✓';
const DRAG_GLYPH = '⣿';
const MORE_GLYPH = '⋯';

export interface TaskRowProps {
  task: Task;
  now: Date;
  onToggleStatus: (task: Task) => void;
  onOpen: (task: Task) => void;
  onMore: (task: Task) => void;
}

/**
 * The hardest component in the feature: up to five attributes have to coexist
 * on one row and still be scannable.
 *
 * Rule: compress the normal, spell out the abnormal. No attribute is carried by
 * colour alone (Principle V, FR-016) — every one has a shape or a word.
 *
 * Conditional styling goes through Unistyles variants. Style arrays do not
 * typecheck against its style objects, and a dynamic function anywhere in a
 * stylesheet widens the type of every other entry in that stylesheet.
 */
export function TaskRow({
  task,
  now,
  onToggleStatus,
  onOpen,
  onMore,
}: TaskRowProps) {
  const done = task.status === 'done';
  const overdue = isOverdue(task, now);
  const lateBy = overdue ? overdueByMinutes(task, now) : 0;

  styles.useVariants({done, overdue});

  const labels = useMemo(() => {
    const out: string[] = [];
    if (done) {
      out.push(t('row.done'));
    }
    if (overdue) {
      out.push(t('row.overdue', {duration: durationLabel(lateBy)}));
    }
    if (task.reminderEnabled) {
      out.push(
        task.reminderOffsetMinutes === 0
          ? t('row.reminderOnTime')
          : t('row.reminder', {
              offset: reminderOffsetLabel(task.reminderOffsetMinutes),
            }),
      );
    }
    return out;
  }, [done, overdue, lateBy, task.reminderEnabled, task.reminderOffsetMinutes]);

  // Screen readers get the row as one sentence rather than four fragments.
  const rowLabel = [
    timeRangeLabel(task.startTime, task.endTime),
    task.title,
    ...labels,
  ].join(', ');

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{checked: done}}
        accessibilityLabel={
          done
            ? t('row.toggleProcessing', {title: task.title})
            : t('row.toggleDone', {title: task.title})
        }
        onPress={() => onToggleStatus(task)}
        style={styles.checkTarget}>
        <View style={styles.checkBox}>
          {done ? <Text style={styles.checkGlyph}>{CHECK_GLYPH}</Text> : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rowLabel}
        onPress={() => onOpen(task)}
        style={styles.body}>
        <Text style={styles.clock}>
          {timeRangeLabel(task.startTime, task.endTime)}
        </Text>
        <Text style={styles.title}>{task.title}</Text>
        {task.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {task.note}
          </Text>
        ) : null}
        {labels.length > 0 ? (
          <View style={styles.labels}>
            {labels.map(label => (
              <Text key={label} style={styles.label}>
                {label}
              </Text>
            ))}
          </View>
        ) : null}
      </Pressable>

      {/* Only the handle starts a drag; the whole row would fight the scroll. */}
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={t('row.dragHandle', {title: task.title})}
        style={styles.handle}>
        <Text style={styles.handleGlyph}>{DRAG_GLYPH}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('row.more')}
        onPress={() => onMore(task)}
        style={styles.more}>
        <Text style={styles.moreGlyph}>{MORE_GLYPH}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create(raw => {
  const theme = appTheme(raw);
  return {
    row: {
      minHeight: ROW_MIN_HEIGHT.oneLabel,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.color.border,
      variants: {
        done: {
          // A completed row recedes, but stays fully legible.
          true: {backgroundColor: theme.color.surface, opacity: 0.72},
          false: {backgroundColor: theme.color.background, opacity: 1},
        },
      },
    },
    checkTarget: {
      width: TAP_TARGET_MIN,
      height: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBox: {
      width: 22,
      height: 22,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      variants: {
        done: {
          true: {
            backgroundColor: theme.color.primary,
            borderColor: theme.color.primary,
          },
          false: {
            backgroundColor: 'transparent',
            borderColor: theme.color.onBackground,
          },
        },
      },
    },
    checkGlyph: {
      ...theme.typography.caption,
      color: theme.appColor.onAccent,
      fontWeight: '800',
    },
    body: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingRight: theme.spacing.xs,
      gap: 2,
    },
    clock: {
      ...theme.appType.clock,
      color: theme.appColor.textMuted,
    },
    title: {
      ...theme.typography.body,
      color: theme.color.onBackground,
      variants: {
        done: {
          true: {textDecorationLine: 'line-through'},
          false: {textDecorationLine: 'none'},
        },
      },
    },
    note: {
      ...theme.typography.label,
      color: theme.appColor.textMuted,
    },
    labels: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: 2,
    },
    label: {
      ...theme.typography.caption,
      variants: {
        overdue: {
          true: {
            color: theme.appColor.accentInk,
            backgroundColor: theme.appColor.accentSoft,
            paddingHorizontal: theme.spacing.xs,
          },
          false: {
            color: theme.appColor.textMuted,
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          },
        },
      },
    },
    handle: {
      width: TAP_TARGET_MIN,
      height: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    handleGlyph: {
      ...theme.typography.label,
      color: theme.appColor.textMuted,
    },
    more: {
      width: TAP_TARGET_MIN,
      height: TAP_TARGET_MIN,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreGlyph: {
      ...theme.typography.title,
      color: theme.color.onBackground,
    },
  };
});
