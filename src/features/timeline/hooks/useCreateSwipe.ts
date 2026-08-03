import {useMemo} from 'react';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';

/** Upward travel that commits to opening the form. */
const SWIPE_UP_PX = 40;
/** Or enough speed, so a short flick works too. */
const SWIPE_UP_VELOCITY = 600;
/** Movement before the gesture claims the touch, so a tap is still a tap. */
const ACTIVATE_AFTER_PX = 12;

export interface UseCreateSwipeOptions {
  onCreate: () => void;
}

/**
 * Swipe up to open the new-task form.
 *
 * It lives on the bottom action bar rather than on the whole screen, and that
 * boundary is the point: an upward swipe over the list already means "scroll",
 * and a gesture that means two things depending on how far the list happens to
 * be scrolled is a gesture nobody can rely on. The bar has nothing to scroll,
 * so up there the swipe carries exactly one meaning — and it is directly above
 * the button it opens, which is what makes it discoverable.
 *
 * The bar is still a button. This is a shortcut to it, never the only way in.
 */
export function useCreateSwipe({onCreate}: UseCreateSwipeOptions) {
  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-ACTIVATE_AFTER_PX, ACTIVATE_AFTER_PX])
        .onEnd(event => {
          'worklet';
          const far = event.translationY <= -SWIPE_UP_PX;
          const fast = event.velocityY <= -SWIPE_UP_VELOCITY;
          if (!far && !fast) {
            return;
          }
          runOnJS(onCreate)();
        }),
    [onCreate],
  );
}
