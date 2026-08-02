import {useCallback, useMemo, useRef, useState} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import type {GestureType} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';

import type {TimelineItem} from '../../../domain/timeline';
import {minutesOf, timeFromMinutes, type LocalTime} from '../../../lib/date';
import {haptic} from '../../../lib/haptics';

/** Movement before a drag starts, so a tap is never mistaken for one. */
const START_THRESHOLD_PX = 8;
/** The grid the design commits to (FR-018a). */
const SNAP_MINUTES = 15;
/** Vertical travel that equals one snap step. */
const PX_PER_STEP = 12;
/** Beyond this sideways travel the drag is treated as abandoned. */
const CANCEL_X_PX = 96;

export interface UseTaskDragOptions {
  task: TimelineItem;
  /** Called once, on release, with the snapped time. */
  onCommit: (nextStart: LocalTime) => void;
  /** The day-swipe gesture this one must out-rank while on the handle. */
  blocks?: React.MutableRefObject<GestureType | undefined>;
}

export interface UseTaskDrag {
  /** Attach to the drag handle ONLY — never to the whole row. */
  gesture: ReturnType<typeof Gesture.Pan>;
  /** Non-null while dragging; drives the "Thả để đổi sang 10:15" label. */
  previewTime: LocalTime | null;
}

/**
 * Drag the handle to change a task's time (FR-018a).
 *
 * Two rules that are easy to get wrong and expensive to discover later:
 *
 * 1. Only the handle starts a drag. Attaching this to the row would put it in
 *    permanent conflict with vertical scrolling.
 * 2. It never crosses days. Changing the date is a deliberate act through
 *    ⋯ → Di chuyển or the form (FR-018b), and both say so in words.
 */
export function useTaskDrag({
  task,
  onCommit,
  blocks,
}: UseTaskDragOptions): UseTaskDrag {
  const [previewTime, setPreviewTime] = useState<LocalTime | null>(null);
  /** Last snap bucket, so haptics fire per step rather than per frame. */
  const lastStep = useRef<number | null>(null);

  const begin = useCallback(() => {
    lastStep.current = 0;
    setPreviewTime(task.startTime);
    haptic('light');
  }, [task.startTime]);

  const step = useCallback(
    (steps: number) => {
      if (lastStep.current === steps) {
        return;
      }
      lastStep.current = steps;
      haptic('light');
      setPreviewTime(
        timeFromMinutes(minutesOf(task.startTime) + steps * SNAP_MINUTES),
      );
    },
    [task.startTime],
  );

  const finish = useCallback(
    (steps: number | null) => {
      lastStep.current = null;
      setPreviewTime(null);
      // null means the drag was abandoned: nothing is written, which is what
      // "thả ra ngoài = hủy" has to mean for it to be a safe escape.
      if (steps !== null && steps !== 0) {
        onCommit(
          timeFromMinutes(minutesOf(task.startTime) + steps * SNAP_MINUTES),
        );
      }
    },
    [task.startTime, onCommit],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      // No axis constraint on purpose: a gesture that starts inside the handle
      // belongs to the drag whichever way the finger then travels.
      .activeOffsetY([-START_THRESHOLD_PX, START_THRESHOLD_PX])
      .onStart(() => {
        'worklet';
        runOnJS(begin)();
      })
      .onUpdate(event => {
        'worklet';
        runOnJS(step)(Math.round(event.translationY / PX_PER_STEP));
      })
      .onEnd(event => {
        'worklet';
        const abandoned = Math.abs(event.translationX) > CANCEL_X_PX;
        runOnJS(finish)(
          abandoned ? null : Math.round(event.translationY / PX_PER_STEP),
        );
      })
      .onFinalize(() => {
        'worklet';
        // Covers interruption — a call, a system gesture — so the preview label
        // can never be left on screen after the finger is gone (Principle VII).
        runOnJS(setPreviewTime)(null);
      });

    // Explicit precedence: a touch that lands in the handle belongs to the
    // drag, and the day swipe is not allowed to steal it.
    return blocks ? pan.blocksExternalGesture(blocks) : pan;
  }, [begin, step, finish, blocks]);

  return {gesture, previewTime};
}
