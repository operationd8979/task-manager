import { Platform } from 'react-native';
import {
	createChannels,
	createInteractions,
	createMmkvStore,
	createPermissionRefreshStep,
	createPermissions,
	createPlatformTimeZoneReader,
	createReAnchorStep,
	createReconciler,
	createSnapshot,
	createToneResolver,
	createVerifyStep,
	DIAGNOSTIC_CODES,
	initialize,
	isNonFailure,
	type DiagnosticCode,
	type DiagnosticEvent,
	type EventSink,
	type Interactions,
	type MaintenanceResult,
	type NotificationRequest,
	type PermissionState,
	type Permissions,
	type PlatformInfo,
	type ReconcileResult,
	type StateSnapshot,
} from '@chipmobilesdk/rn-notification';

import { notificationEngine } from './engine';
import { LEGACY_CHANNEL_IDS, REMINDER_DOMAIN, reminderTones } from './tones';

/**
 * Everything above this file talks to the SDK through this service.
 *
 * The SDK owns identity, idempotent reconciliation, channel migration,
 * permission coordination, tap routing across a cold start, and wall-clock
 * re-anchoring. What is left here is assembly: the app's tones, the app's
 * domain, and the lifecycle calls the SDK deliberately does not make on its own.
 */
export interface ReminderNotifications {
	readonly permissions: Permissions;
	readonly interactions: Interactions;
	/**
	 * Brings the OS into agreement with the desired set (FR-041, FR-042).
	 *
	 * Never automatic — the SDK will not guess what the app's data implies, so
	 * every write path has to reach this.
	 */
	reconcile(
		desired: readonly NotificationRequest[],
	): Promise<ReconcileResult>;
	/**
	 * Window refresh, re-anchoring, pending-set verification, permission re-read.
	 * Additive only: it can never cancel a reminder reconciliation created.
	 */
	runMaintenance(): Promise<MaintenanceResult | undefined>;
	/**
	 * Re-declares the tones so their name and description follow the app's
	 * language (FR-058a).
	 *
	 * Cheap and safe to call whenever: the SDK fingerprints the two label fields
	 * and touches the platform only when they actually moved. A label change is
	 * never a version change, so no channel is recreated and every setting the
	 * user adjusted on it survives.
	 */
	applyToneLabels(): Promise<void>;
	/** The readable answer to "why didn't it arrive". Diagnostics only. */
	captureSnapshot(): Promise<StateSnapshot>;
}

/**
 * Where SDK diagnostics go.
 *
 * Set by the provider once the database — and therefore the error log — exists.
 * A module-level slot rather than an init parameter because initialization is
 * memoized and must not depend on which caller got there first.
 */
let diagnosticSink: EventSink | null = null;

export function setNotificationDiagnosticSink(sink: EventSink | null): void {
	diagnosticSink = sink;
}

const sink: EventSink = event => {
	// Reported outcomes are not failures: truncation past the platform ceiling
	// and a missing exact-alarm grant are both states the app already surfaces
	// to the user, and logging them as errors would bury the real ones.
	//
	// One exception. A missing repeat-stop handler is classed as a reported
	// outcome, but its consequence is a phone that rings until someone comes
	// home to it — so it is recorded even though the SDK is being polite about
	// it. It fires only if the registration in `index.js` is ever removed.
	//
	// The cast is the honest one: an event's code is a plain string on the
	// contract, and `isNonFailure` answers false for anything it does not know.
	const code = event.code as DiagnosticCode;
	if (code !== DIAGNOSTIC_CODES.REPEAT_STOP_HANDLER_MISSING && isNonFailure(code)) {
		return;
	}
	diagnosticSink?.(event);
};

function platformInfo(): PlatformInfo {
	if (Platform.OS === 'android') {
		return { os: 'android', apiLevel: Number(Platform.Version) };
	}
	return { os: Platform.OS === 'ios' ? 'ios' : 'other' };
}

async function build(): Promise<ReminderNotifications> {
	// The same instance `index.js` registered the repeat-expiry handler on.
	const engine = notificationEngine();
	const store = createMmkvStore();
	const resolveTone = createToneResolver(reminderTones());
	const now = () => Date.now();
	// The SDK's own reader, exported from 0.1.1. `Intl` is documented in React
	// Native as not reliably updating when the device zone changes, so a
	// hand-rolled reader is how re-anchoring ends up subtly wrong on one app and
	// not another; this one falls back to `Intl` only when the native module is
	// absent.
	const timeZone = createPlatformTimeZoneReader();

	const { runtime } = await initialize(
		{ tones: reminderTones(), eventSink: sink },
		{ engine, store },
	);

	const emit = (
		code: string,
		message: string,
		context?: Record<string, unknown>,
	) => {
		const event: DiagnosticEvent = {
			code,
			severity: 'warn',
			message,
			at: now(),
			context,
		};
		sink(event);
	};

	const permissions = createPermissions({
		engine,
		state: runtime.state,
		platform: platformInfo(),
		now,
		emit,
	});

	/**
	 * Read once and kept current by the permission-refresh step below.
	 *
	 * Without the exact-alarm grant the SDK still schedules — approximately, and
	 * flagged `mayBeDelayed`. FR-036b says schedule anyway and tell the user it
	 * may be late; refusing would be worse for them, not safer.
	 */
	let exactAlarm: PermissionState = (await permissions.getPermissions())
		.exactAlarm;
	permissions.onPermissionChange(report => {
		exactAlarm = report.exactAlarm;
	});
	const canScheduleExactly = () =>
		exactAlarm === 'granted' || exactAlarm === 'notRequired';

	const channels = createChannels({ engine, state: runtime.state, now, emit });
	await channels.apply(reminderTones());

	// The pre-SDK build's channels outlive the code that made them. Left alone
	// they sit in system settings as dead entries the user can still toggle.
	// `retireTone` is a no-op for a channel that is not there, so this is safe to
	// run on every start rather than needing a migration flag of its own.
	for (const channelId of LEGACY_CHANNEL_IDS) {
		await engine.retireTone(channelId).catch(() => false);
	}

	const reconciler = createReconciler({
		engine,
		resolveTone,
		timeZone,
		now,
		canScheduleExactly,
		emit,
	});

	const interactions = createInteractions({
		engine,
		state: runtime.state,
		now,
		emit,
	});

	let lastReconcile: ReconcileResult | undefined;
	let lastMaintenance: MaintenanceResult | undefined;

	runtime.registry.register(
		createReAnchorStep({
			engine,
			timeZone,
			resolveTone,
			canScheduleExactly,
			emit,
		}),
	);
	runtime.registry.register(
		createVerifyStep({
			engine,
			// Only what the last pass actually registered. No recorded expectation
			// is not the same as expecting an empty device, which is why this is
			// undefined rather than an empty set before the first reconcile.
			expectedIds: () =>
				lastReconcile === undefined
					? undefined
					: new Set([
						...lastReconcile.created,
						...lastReconcile.replaced,
						...lastReconcile.unchanged,
					]),
			emit,
		}),
	);
	runtime.registry.register(createPermissionRefreshStep({ permissions }));

	const snapshot = createSnapshot({
		engine,
		state: runtime.state,
		now,
		permissions: () => permissions.getPermissions(),
		restrictions: () => permissions.getBackgroundRestrictions(),
		appliedTones: () => channels.appliedVersions(),
		lastReconcile: () => lastReconcile,
		lastMaintenance: () => lastMaintenance,
		// Local-only: the push subpath is never imported, so the app ships no
		// provider code, no push permission, and no entitlement.
		hasPushToken: () => false,
	});

	// A tap that launched the app from cold arrives before any handler exists.
	// The SDK buffers it durably; this is what hands it over.
	await interactions.collectInitial();

	return {
		permissions,
		interactions,

		async reconcile(desired) {
			const result = await reconciler.reconcile({
				domain: REMINDER_DOMAIN,
				desired,
			});
			lastReconcile = result;
			return result;
		},

		async runMaintenance() {
			const result = await runtime.maintenance.runAutomatic('foreground');
			lastMaintenance = result ?? lastMaintenance;
			return result;
		},

		async applyToneLabels() {
			await channels.apply(reminderTones());
		},

		captureSnapshot: () => snapshot.capture(),
	};
}

let pending: Promise<ReminderNotifications> | null = null;

/**
 * The single SDK runtime, assembled on first use.
 *
 * The failure is deliberately not cached. Holding a rejected promise here would
 * mean one bad start leaves the app unable to schedule anything for the rest of
 * the run, with no way back short of a restart.
 */
export function getNotifications(): Promise<ReminderNotifications> {
	pending ??= build().catch((error: unknown) => {
		pending = null;
		throw error;
	});
	return pending;
}
