/**
 * Jest setup for component-level tests.
 *
 * Domain tests need none of this — `npx jest src/domain` runs against pure
 * TypeScript with no renderer, which is the point of the layer boundary
 * (Principle II). Everything below exists only so that tests which DO mount a
 * component have the native modules stubbed.
 */

/**
 * Unistyles compiles styles through a Babel plugin and a native runtime, so
 * under Jest `StyleSheet.create` has to be given a theme itself.
 *
 * The theme is assembled from the app's REAL token modules rather than from
 * invented values: a test that passes against made-up tokens would not notice
 * a missing one, which is precisely the failure mode worth catching.
 */
jest.mock('react-native-unistyles', () => {
  const {
    APP_COLOR_LIGHT,
    APP_SPACING,
    APP_TYPE,
    BASE_COLOR_LIGHT,
    TYPE_OVERRIDE,
    ZERO_RADIUS,
  } = require('./src/theme/tokens');

  const theme = {
    color: {
      ...BASE_COLOR_LIGHT,
      primary: '#EC3013',
      onPrimary: '#000000',
      error: APP_COLOR_LIGHT.accentInk,
    },
    typography: TYPE_OVERRIDE,
    spacing: {xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48},
    radius: ZERO_RADIUS,
    shadow: {},
    zIndex: {base: 0, raised: 10, modal: 100, overlay: 200, toast: 300},
    appColor: APP_COLOR_LIGHT,
    appSpacing: APP_SPACING,
    appType: APP_TYPE,
  };

  return {
    UnistylesRuntime: {
      setTheme: () => undefined,
      setAdaptiveThemes: () => undefined,
    },
    useUnistyles: () => ({theme}),
    StyleSheet: {
      configure: () => undefined,
      create: sheet => {
        const built = typeof sheet === 'function' ? sheet(theme, {}) : sheet;
        // Components call styles.useVariants(...) before reading any style.
        return {...built, useVariants: () => undefined};
      },
    },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const {View} = require('react-native');
  const chainable = {
    activeOffsetX: () => chainable,
    failOffsetY: () => chainable,
    onEnd: () => chainable,
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {Pan: () => chainable},
  };
});

// With the bottom sheet mocked out, the only thing the app takes from
// Reanimated is runOnJS, so a two-line stub is honest here — nothing else in
// the tree reaches for the animation runtime.
jest.mock('react-native-reanimated', () => ({
  runOnJS: fn => fn,
}));

/**
 * The bottom sheet is mocked rather than rendered.
 *
 * Its internals depend on measured layout and on gesture handlers that do not
 * exist under the test renderer, so mounting the real one tests the library
 * rather than the app. The app talks to it only through src/components/Sheet.tsx,
 * which is the seam actually worth asserting on.
 */
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const {TextInput, View} = require('react-native');
  const passthrough = ({children}) => React.createElement(View, null, children);
  return {
    __esModule: true,
    default: passthrough,
    BottomSheetModal: passthrough,
    BottomSheetModalProvider: passthrough,
    BottomSheetView: passthrough,
    BottomSheetFooter: passthrough,
    BottomSheetBackdrop: () => null,
    BottomSheetTextInput: TextInput,
  };
});

jest.mock('@notifee/react-native', () => ({}));

// Native picker dialog; under test it is a button that never opens.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const {View} = require('react-native');
  const Picker = () => React.createElement(View, null);
  return {__esModule: true, default: Picker};
});

/**
 * The storage package is native. Component tests get a handle that answers
 * "empty" for every read, which is enough to exercise the loading -> empty and
 * loading -> error paths without a device.
 */
jest.mock('@chipmobilesdk/rn-local-db', () => {
  const emptyPage = {records: [], hasMore: false};
  const collection = {
    list: async () => emptyPage,
    count: async () => 0,
    find: async () => null,
    get: async () => {
      throw new Error('RECORD_NOT_FOUND');
    },
    insert: async () => ({operation: 'created', id: 'x'}),
    update: async () => ({operation: 'updated', id: 'x'}),
    upsert: async () => ({operation: 'created', id: 'x'}),
    delete: async () => ({operation: 'deleted', id: 'x'}),
    softDelete: async () => ({operation: 'deleted', id: 'x'}),
    restore: async () => ({operation: 'restored', id: 'x'}),
  };
  return {
    openDatabase: async () => ({
      scopeKey: 'test',
      schemaVersion: 1,
      backupPosture: {requested: 'excluded', observed: 'excluded'},
      isEncrypted: false,
      collection: () => collection,
      batch: async () => ({applied: 0, outcomes: []}),
      transaction: async fn => fn({collection: () => collection}),
      close: async () => undefined,
    }),
    deleteScopeData: async () => ({removedRecords: 0}),
    setDiagnosticLogger: () => undefined,
    isStorageError: () => false,
    isCode: () => false,
    DiagnosticCodes: {},
    Budgets: {},
  };
});
