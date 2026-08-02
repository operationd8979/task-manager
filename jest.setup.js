/**
 * Jest setup for component-level tests.
 *
 * Domain tests need none of this — `npx jest src/domain` runs against pure
 * TypeScript with no renderer, which is the point of the layer boundary
 * (Principle II). Everything below exists only so that tests which DO mount a
 * component have the native modules stubbed.
 */

// Unistyles ships its own Jest mock; using it keeps the theme shape in sync
// with the real one instead of hand-maintaining a copy.
jest.mock('react-native-unistyles', () =>
  require('react-native-unistyles/mocks'),
);

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {
      Pan: () => ({
        activeOffsetX: () => ({
          failOffsetY: () => ({onEnd: () => ({})}),
        }),
      }),
    },
  };
});

// Reanimated ships an official mock; @gorhom/bottom-sheet reaches into parts
// of it (Easing, withTiming) that a hand-written stub would have to chase.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {...mock, runOnJS: fn => fn};
});

jest.mock('@notifee/react-native', () => ({}));
