import { isStorageError } from '@chipmobilesdk/rn-local-db';

/**
 * Domain-level failure kinds. The UI never sees a storage error code: FR-055
 * forbids showing technical codes to the user, who has nobody to report them to.
 */
export type StorageFailureKind =
	| 'not-found'
	| 'conflict'
	| 'capacity'
	| 'corrupt'
	| 'unavailable'
	| 'programming'
	| 'unknown';

export class DataError extends Error {
	readonly kind: StorageFailureKind;
	/** Stable code, kept for the local diagnostic log only — never rendered. */
	readonly code: string;

	constructor(kind: StorageFailureKind, code: string, message: string) {
		super(message);
		this.name = 'DataError';
		this.kind = kind;
		this.code = code;
	}
}

/**
 * Explicit map over the package's documented code list. Substring matching
 * would silently mis-route a code added in a later version; an unmapped code
 * lands on 'unknown', which is visible rather than wrong.
 */
const KIND_BY_CODE: Readonly<Record<string, StorageFailureKind>> = {
	RECORD_NOT_FOUND: 'not-found',

	RECORD_CONFLICT: 'conflict',
	TRANSACTION_FAILED: 'conflict',
	TRANSACTION_STATE: 'conflict',

	DISK_FULL: 'capacity',
	RECORD_TOO_LARGE: 'capacity',
	BATCH_TOO_LARGE: 'capacity',

	CORRUPTION: 'corrupt',
	MIGRATION_FAILED: 'corrupt',
	MIGRATION_CONFIG_INVALID: 'corrupt',
	SCHEMA_DOWNGRADE: 'corrupt',

	CLOSED_HANDLE: 'unavailable',
	OPEN_FAILED: 'unavailable',
	STORAGE_ACCESS: 'unavailable',
	SCOPE_DELETED: 'unavailable',
	WRITE_FAILED: 'unavailable',

	// Ours to fix, not the user's to retry.
	QUERY_INVALID: 'programming',
	CONFIG_INVALID: 'programming',
	PAGE_SIZE_INVALID: 'programming',
	CURSOR_INVALID: 'programming',
	INVALID_SCOPE: 'programming',
};

/**
 * Translate a package error into a domain error.
 *
 * NEVER parse the message — the package documents stable codes precisely so
 * that message text stays free to change.
 */
export function toDataError(error: unknown, operation: string): DataError {
	if (!isStorageError(error)) {
		return new DataError('unknown', 'UNKNOWN', `${operation} failed`);
	}
	const kind = KIND_BY_CODE[error.code] ?? 'unknown';
	return new DataError(kind, error.code, `${operation} failed`);
}

/** Whether offering the user a retry button makes sense for this failure. */
export function isRetryable(error: DataError): boolean {
	return error.kind === 'unavailable' || error.kind === 'conflict';
}
