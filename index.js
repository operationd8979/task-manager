/**
 * @format
 */

// MUST be the first import. Unistyles has to be configured before the first
// component that consumes a style renders; otherwise the app renders unstyled
// and reports no error at all.
import './src/theme/setup';

import { registerBackgroundNotificationHandler } from '@chipmobilesdk/rn-notification';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { notificationEngine } from './src/services/notifications/engine';

/**
 * Ends a repeating reminder alert while the app is dead.
 *
 * MUST be at module scope, never in a component or an effect: by the time
 * anything mounts, the process the platform woke to run this has already been
 * asked for it. Without it the reminder tone still starts and still stops when
 * the user handles it — but a phone lying face-down on a table keeps ringing
 * past the fifteen-minute window, which is the one failure the bound exists to
 * prevent.
 *
 * Required because the alert tone declares `repeatAlert` (see
 * src/services/notifications/tones.ts).
 */
registerBackgroundNotificationHandler({ engine: notificationEngine() });

AppRegistry.registerComponent(appName, () => App);
