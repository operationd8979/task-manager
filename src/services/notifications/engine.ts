import {
	createNotifyKitEngine,
	type NotificationEngineAdapter,
} from '@chipmobilesdk/rn-notification';

let instance: NotificationEngineAdapter | null = null;

/**
 * The one engine instance the app has.
 *
 * Shared rather than created per caller because two of them would be two
 * separate background-handler registrations over one native module — and the
 * handler that ends a repeating alert has to be the same one the runtime
 * schedules its stop markers through, or an alarm keeps sounding with nothing
 * listening for its expiry.
 *
 * Creating it costs nothing: the native module is required lazily on first use,
 * which is what lets this be imported from `index.js` at module scope.
 */
export function notificationEngine(): NotificationEngineAdapter {
	return (instance ??= createNotifyKitEngine());
}
