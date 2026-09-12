import {
	deleteScopeData,
	openDatabase,
	setDiagnosticLogger,
} from '@chipmobilesdk/rn-local-db';
import type { DatabaseHandle, EffectivePosture } from '@chipmobilesdk/rn-local-db';

import { createErrorLog, type ErrorLog } from '../logging/errorLog';
import { COLLECTIONS, MIGRATIONS, SCHEMA_VERSION } from './schema';
import { toDataError } from './errors';

const DATABASE_NAME = 'timeline_task_manager';

/**
 * The app has no accounts, so there is no identity to scope by. `guest` is the
 * whole of it — which also means the package's "sign-out is not deletion"
 * section does not apply: there is no sign-out.
 */
const SCOPE = { kind: 'guest' } as const;

export interface DatabaseGateway {
	readonly handle: DatabaseHandle;
	readonly errorLog: ErrorLog;
	/**
	 * FR-054: a real delete, not a soft one.
	 *
	 * The handle is closed BEFORE the data goes, so this gateway is dead by
	 * the time the promise settles — failure included, since the close happens
	 * first. Every repository still holding this handle then fails with
	 * CLOSED_HANDLE or SCOPE_DELETED and no amount of retrying revives it: the
	 * caller MUST open a new gateway (App.tsx does, through the boot sequence).
	 */
	destroyAll(): Promise<void>;
	close(): Promise<void>;
	backupPosture(): EffectivePosture;
}

/**
 * The raw open, kept apart from `openGateway` so the recovery below can repeat
 * it without repeating the configuration. The configuration IS the identity of
 * the database: a second copy of it, free to drift, would eventually open a
 * different one.
 */
function openHandle(): Promise<DatabaseHandle> {
	return openDatabase({
		name: DATABASE_NAME,
		scope: SCOPE,
		schemaVersion: SCHEMA_VERSION,
		collections: COLLECTIONS,
		migrations: MIGRATIONS,
		// Backup exclusion is the package default. On iOS it is enforced; on
		// Android it depends on this repo's manifest — see the XML added under
		// android/app/src/main/res/xml/ (FR-049).
	});
}

/**
 * Opens the database once. Encryption is off on purpose: task titles are not
 * credentials or payment data under the constitution's Security section, and
 * enabling it would pull in react-native-quick-crypto plus a SQLCipher build
 * flag for no requirement (research.md R5).
 */
export async function openGateway(): Promise<DatabaseGateway> {
	let handle: DatabaseHandle;
	try {
		handle = await openHandle();
	} catch (error) {
		const failure = toDataError(error, 'db.open');
		if (failure.code !== 'SCOPE_DELETED') {
			throw failure;
		}

		// A wipe that did not finish — the process killed mid-delete, or a file
		// that would not go — leaves the scope marked `deleting`, and the package
		// refuses to open over it rather than serve half-deleted data as healthy.
		// Finishing the delete is the documented way out, and it is what the user
		// asked for to begin with: `destroyAll` is the only thing that marks a
		// scope this way. Without this the state survives every Retry AND every
		// relaunch — the one failure the app could not come back from.
		try {
			await deleteScopeData({ name: DATABASE_NAME, scope: SCOPE });
			handle = await openHandle();
		} catch (unfinished) {
			throw toDataError(unfinished, 'db.open');
		}
	}

	const errorLog = createErrorLog(handle);

	// Route the package's own failure diagnostics into the same rotating local
	// log. `outcome` carries a diagnostic code and is present only on failure;
	// successful operations are not worth a log entry and would churn the cap.
	setDiagnosticLogger(event => {
		if (!event.outcome) {
			return;
		}
		errorLog
			.record({
				code: event.outcome,
				operation: `storage.${event.operation}`,
			})
			.catch(() => {
				// The logger already swallows its own failures; this only satisfies
				// the floating-promise rule.
			});
	});

	return {
		handle,
		errorLog,

		async destroyAll() {
			try {
				await handle.close();
				await deleteScopeData({ name: DATABASE_NAME, scope: SCOPE });
			} catch (error) {
				throw toDataError(error, 'db.destroyAll');
			}
		},

		async close() {
			await handle.close();
		},

		backupPosture() {
			return handle.backupPosture;
		},
	};
}
