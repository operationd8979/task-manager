import { SafeAreaView } from 'react-native-safe-area-context';
import { withUnistyles } from 'react-native-unistyles';

/**
 * A screen's safe-area root whose theme-dependent style follows a light/dark
 * switch at once (001 FR-052c).
 *
 * Unistyles updates React Native's own views in place, but `SafeAreaView` is
 * react-native-safe-area-context's native view, which its Babel plugin does not
 * reach. Its background therefore changed only when the screen happened to
 * re-render: Settings did on the switch, the timeline did not, and kept the old
 * background while its chevrons — drawn from `useUnistyles` — took the new
 * colour and vanished against it. `withUnistyles` re-renders it on the theme
 * dependencies of the style it is given.
 */
export const ThemedSafeAreaView = withUnistyles(SafeAreaView);
