/**
 * @format
 */

// MUST be the first import. Unistyles has to be configured before the first
// component that consumes a style renders; otherwise the app renders unstyled
// and reports no error at all.
import './src/theme/setup';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
