import {useMemo} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';

/** Distance past which a horizontal swipe commits to a day change. */
export const SWIPE_THRESHOLD_PX = 64;
/** Or enough speed, so a short flick still works. */
const SWIPE_VELOCITY = 500;
/** Below this the gesture is treated as a scroll, not a swipe. */
const ACTIVATE_AFTER_PX = 16;

export interface UseDaySwipeOptions {
  onPrevious: () => void;
  onNext: () => void;
}

/**
 * Horizontal swipe changes the day (FR-003a).
 *
 * It is accepted anywhere on the timeline, including on top of a row, so the
 * horizontal gesture carries exactly one meaning on this screen. The drag
 * handle claims its own 44pt area and wins there (FR-003c) — that boundary is
 * the HIT AREA, not the direction of travel, because deciding by direction
 * breaks the moment a finger moves diagonally.
 *
 * `failOffsetY` is what keeps vertical scrolling intact: the pan gives up as
 * soon as the movement is mostly vertical.
 */
export function useDaySwipe({onPrevious, onNext}: UseDaySwipeOptions) {
  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ACTIVATE_AFTER_PX, ACTIVATE_AFTER_PX])
        .failOffsetY([-ACTIVATE_AFTER_PX, ACTIVATE_AFTER_PX])
        .onEnd(event => {
          'worklet';
          const far = Math.abs(event.translationX) >= SWIPE_THRESHOLD_PX;
          const fast = Math.abs(event.velocityX) >= SWIPE_VELOCITY;
          if (!far && !fast) {
            return;
          }
          // Swiping left moves forward, matching the direction content travels.
          runOnJS(event.translationX < 0 ? onNext : onPrevious)();
        }),
    [onPrevious, onNext],
  );
}
