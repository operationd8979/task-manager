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
	/** FR-054: a real delete, not a soft one. */
	destroyAll(): Promise<void>;
	close(): Promise<void>;
	backupPosture(): EffectivePosture;
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
		handle = await openDatabase({
			name: DATABASE_NAME,
			scope: SCOPE,
			schemaVersion: SCHEMA_VERSION,
			collections: COLLECTIONS,
			migrations: MIGRATIONS,
			// Backup exclusion is the package default. On iOS it is enforced; on
			// Android it depends on this repo's manifest — see the XML added under
			// android/app/src/main/res/xml/ (FR-049).
		});
	} catch (error) {
		throw toDataError(error, 'db.open');
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
