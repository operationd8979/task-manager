import React, {useMemo} from 'react';
import {Pressable, View} from 'react-native';
import {GestureDetector, type GestureType} from 'react-native-gesture-handler';
import {StyleSheet} from 'react-native-unistyles';

import {Text} from '../../../components/Text';
import {
  countdownSeconds,
  type CountdownOffset,
} from '../../../domain/countdown';
import {isOverdue, overdueByMinutes} from '../../../domain/task';
import type {TimelineItem} from '../../../domain/timeline';
import type {LocalTime} from '../../../lib/date';
import {
  countdownLabel,
  durationLabel,
  reminderOffsetLabel,
  timeRangeLabel,
  weekdayShort,
} from '../../../lib/format';
import {t} from '../../../lib/strings';
import {appTheme} from '../../../theme/theme';
import {GLYPH_ALIGN, ROW_MIN_HEIGHT, TAP_TARGET_MIN} from '../../../theme/tokens';
import {useTaskDrag} from '../hooks/useTaskDrag';

/** Placeholders until the icon set is chosen (decisions.md D-06). */
const CHECK_GLYPH = '✓';
const RESTORE_GLYPH = '↺';
const DRAG_GLYPH = '⣿';
const MORE_GLYPH = '⋯';

/**
 * The one visual state a row is in, in precedence order.
 *
 * Mutually exclusive by construction rather than by three booleans that could
 * contradict each other: a skipped session is not "overdue", and a finished
 * task cannot be late (`isOverdue` already returns false for it).
 */
type RowState = 'skipped' | 'done' | 'overdue' | 'normal';

export interface TaskRowProps {
  task: TimelineItem;
  now: Date;
  /** The app-wide countdown window, from settings. Not a reminder offset. */
  countdownMinutes: CountdownOffset;
  onToggleStatus: (task: TimelineItem) => void;
  /** Un-skips a session; the only way back from "Chỉ lần này" on a delete. */
  onRestoreSkipped: (task: TimelineItem) => void;
  onOpen: (task: TimelineItem) => void;
  onMore: (task: TimelineItem) => void;
  /** Drag-to-reschedule within the day (FR-018a). */
  onShiftTime: (task: TimelineItem, nextStart: LocalTime) => void;
  /** Exact-alarm permission is missing, so reminders may fire late. */
  remindersMayBeLate?: boolean;
  /** The day-swipe gesture the handle must out-rank (FR-003c). */
  swipeRef?: React.MutableRefObject<GestureType | undefined>;
}

/**
 * The hardest component in the feature: up to five attributes have to coexist
 * on one row and still be scannable.
 *
 * Rule: compress the normal, spell out the abnormal. No attribute is carried by
 * colour alone (Principle V, FR-016) — every one has a shape or a word. The
 * status colours added on top of that (red overdue, green done, grey skipped)
 * are an accelerator for people who can use them, never the only signal.
 *
 * Conditional styling goes through Unistyles variants. Style arrays do not
 * typecheck against its style objects, and a dynamic function anywhere in a
 * stylesheet widens the type of every other entry in that stylesheet.
 */
export function TaskRow({
  task,
  now,
  countdownMinutes,
  onToggleStatus,
  onRestoreSkipped,
  onOpen,
  onMore,
  onShiftTime,
  remindersMayBeLate = false,
  swipeRef,
}: TaskRowProps) {
  const skipped = task.isSkipped;
  const done = task.status === 'done';
  const overdue = !skipped && isOverdue(task, now);
  const lateBy = overdue ? overdueByMinutes(task, now) : 0;

  const state: RowState = skipped
    ? 'skipped'
    : done
    ? 'done'
    : overdue
    ? 'overdue'
    : 'normal';

  /**
   * Seconds to the start, or null when this row is not in its window.
   *
   * Every task counts down on the same app-wide window — having a reminder has
   * nothing to do with it. The exclusions are only rows that are not going to
   * happen: counting down to something already ticked off, or to a session the
   * user cancelled, is noise dressed up as urgency. (`overdue` is excluded for
   * the same reason as `done` — its start is already behind us.)
   */
  const remaining =
    state === 'normal' ? countdownSeconds(task, now, countdownMinutes) : null;

  const {gesture, previewTime} = useTaskDrag({
    task,
    onCommit: next => onShiftTime(task, next),
    blocks: swipeRef,
  });
  const dragging = previewTime !== null;

  styles.useVariants({state, dragging});

  const labels = useMemo(() => {
    const out: string[] = [];
    if (skipped) {
      out.push(t('row.skipped'));
    }
    if (done) {
      out.push(t('row.done'));
    }
    if (overdue) {
      out.push(t('row.overdue', {duration: durationLabel(lateBy)}));
    }
    if (task.repeatsOn) {
      // The glyph never stands alone: a symbol with no word is unreadable to
      // half the people who need it (design/ux-ui-spec.md §1).
      out.push(
        t('row.repeats', {
          days: task.repeatsOn.map(weekdayShort).join('–'),
        }),
      );
    }
    if (task.hasOverride) {
      out.push(t('row.edited'));
    }
    // A skipped session has no reminder — reconcile.ts refuses to schedule one
    // — so claiming otherwise on the row would be a lie the user acts on.
    if (task.reminderEnabled && !skipped) {
      const base =
        task.reminderOffsetMinutes === 0
          ? t('row.reminderOnTime')
          : t('row.reminder', {
              offset: reminderOffsetLabel(task.reminderOffsetMinutes),
            });
      // Appended as WORDS, never a lone warning glyph (design/ux-ui-spec §1).
      out.push(
        remindersMayBeLate
          ? `${base} · ${t('row.reminderMayBeLate')}`
          : base,
      );
    }
    return out;
  }, [
    skipped,
    done,
    overdue,
    lateBy,
    task.repeatsOn,
    task.hasOverride,
    task.reminderEnabled,
    task.reminderOffsetMinutes,
    remindersMayBeLate,
  ]);

  // Screen readers get the row as one sentence rather than four fragments. The
  // countdown is spelled out in words here: "04:59" is read as a time of day.
  const rowLabel = [
    timeRangeLabel(task.startTime, task.endTime),
    task.title,
    ...labels,
    ...(remaining === null
      ? []
      : [
          t('row.countdownLabel', {
            minutes: Math.floor(remaining / 60),
            seconds: remaining % 60,
          }),
        ]),
  ].join(', ');

  return (
    <View style={styles.row}>
      <View style={styles.accent} />

      {skipped ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('row.restoreSkipped', {title: task.title})}
          onPress={() => onRestoreSkipped(task)}
          style={styles.checkTarget}>
          <View style={styles.checkBox}>
            <Text style={styles.restoreGlyph}>{RESTORE_GLYPH}</Text>
          </View>
        </Pressable>
      ) : (
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
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rowLabel}
        onPress={() => onOpen(task)}
        style={styles.body}>
        <View style={styles.clockRow}>
          <Text style={styles.clock}>
            {timeRangeLabel(task.startTime, task.endTime)}
          </Text>
          {/* Beside the clock, not down with the labels: it is a fact about
              this time, and it has to be found without reading the row. */}
          {remaining === null ? null : (
            <Text style={styles.countdown}>
              {t('row.countdown', {time: countdownLabel(remaining)})}
            </Text>
          )}
        </View>
        <Text style={styles.title}>{task.title}</Text>
        {task.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {task.note}
          </Text>
        ) : null}
        {dragging ? (
          <Text style={styles.dropPreview}>
            {t('shift.dropPreview', {time: previewTime})}
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

      {/* Only the handle starts a drag; the whole row would fight the scroll.
          A skipped session keeps the space but not the gesture: rescheduling
          something that is not happening writes an override nobody asked for. */}
      {skipped ? (
        <View style={styles.handle} />
      ) : (
        <GestureDetector gesture={gesture}>
          <View
            accessibilityRole="adjustable"
            accessibilityLabel={t('row.dragHandle', {title: task.title})}
            style={styles.handle}>
            <Text style={styles.handleGlyph}>{DRAG_GLYPH}</Text>
          </View>
        </GestureDetector>
      )}

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
        state: {
          // A completed row recedes, but stays fully legible.
          done: {backgroundColor: theme.color.surface, opacity: 0.72},
          // A skipped one recedes further: it is the only row on the day that
          // is not going to happen.
          skipped: {backgroundColor: theme.color.surface, opacity: 0.6},
          overdue: {backgroundColor: theme.color.background, opacity: 1},
          normal: {backgroundColor: theme.color.background, opacity: 1},
        },
        dragging: {
          // Wins over `state`: the row being dragged has to stand out from the
          // rest of the list while the finger is down.
          true: {backgroundColor: theme.color.surface, opacity: 1},
          false: {},
        },
      },
    },
    /**
     * The status stripe down the leading edge.
     *
     * Full-bleed and only 4pt wide, so a scan down the day answers "what needs
     * me" before any word is read. It duplicates a label that is always present
     * rather than replacing one.
     */
    accent: {
      alignSelf: 'stretch',
      width: 4,
      variants: {
        state: {
          overdue: {backgroundColor: theme.color.error},
          done: {backgroundColor: theme.color.success},
          skipped: {backgroundColor: theme.color.disabled},
          normal: {backgroundColor: 'transparent'},
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
        state: {
          done: {
            backgroundColor: theme.color.success,
            borderColor: theme.color.success,
          },
          skipped: {
            backgroundColor: 'transparent',
            borderColor: theme.color.disabled,
          },
          overdue: {
            backgroundColor: 'transparent',
            borderColor: theme.color.error,
          },
          normal: {
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
    restoreGlyph: {
      ...theme.typography.caption,
      ...GLYPH_ALIGN,
      color: theme.color.disabled,
      fontWeight: '800',
    },
    body: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      paddingLeft: theme.spacing.xs,
      paddingRight: theme.spacing.xs,
      gap: 2,
    },
    clockRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    clock: {
      ...theme.appType.clock,
      variants: {
        state: {
          overdue: {color: theme.color.error},
          done: {color: theme.color.success},
          skipped: {color: theme.color.disabled},
          normal: {color: theme.appColor.textMuted},
        },
      },
    },
    /**
     * Tabular numerals are not optional here: this value changes every second,
     * and proportional digits make the whole row jitter as they do.
     */
    countdown: {
      ...theme.appType.clock,
      color: theme.appColor.accentInk,
      backgroundColor: theme.appColor.accentSoft,
      paddingHorizontal: theme.spacing.xs,
    },
    title: {
      ...theme.typography.body,
      variants: {
        state: {
          done: {
            color: theme.color.onBackground,
            textDecorationLine: 'line-through',
          },
          skipped: {
            color: theme.color.disabled,
            textDecorationLine: 'line-through',
          },
          overdue: {
            color: theme.color.onBackground,
            textDecorationLine: 'none',
          },
          normal: {
            color: theme.color.onBackground,
            textDecorationLine: 'none',
          },
        },
      },
    },
    note: {
      ...theme.typography.label,
      color: theme.appColor.textMuted,
    },
    dropPreview: {
      ...theme.typography.caption,
      color: theme.appColor.accentInk,
      fontWeight: '800',
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
        state: {
          overdue: {
            color: theme.color.error,
            backgroundColor: theme.appColor.accentSoft,
            paddingHorizontal: theme.spacing.xs,
          },
          done: {
            color: theme.color.success,
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          },
          skipped: {
            color: theme.color.disabled,
            backgroundColor: 'transparent',
            paddingHorizontal: 0,
          },
          normal: {
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
      ...theme.typography.title,
      ...GLYPH_ALIGN,
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
