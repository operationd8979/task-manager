import type { DatabaseHandle } from '@chipmobilesdk/rn-local-db';

import { COLLECTION, ERROR_LOG_LIMIT } from '../db/schema';

/**
 * A single diagnostic entry.
 *
 * There is deliberately no field that could hold a task title or note. FR-055b
 * is enforced by this type rather than by reviewer memory: the function simply
 * cannot be handed the content it must not record.
 */
export interface ErrorLogInput {
	/** Stable code, never a parsed message. */
	code: string;
	/** e.g. 'timeline.load', 'reminder.schedule'. */
	operation: string;
	/** An identifier, never content. */
	recordId?: string;
}

export interface ErrorLogEntry extends ErrorLogInput {
	at: number;
}

export interface ErrorLog {
	record(entry: ErrorLogInput): Promise<void>;
	/**
	 * Fire-and-forget form. `record` never rejects — it swallows its own
	 * failures on purpose — so callers on an error path should not have to
	 * decorate every call with a no-op catch just to satisfy a lint rule.
	 */
	report(entry: ErrorLogInput): void;
	recent(limit: number): Promise<ErrorLogEntry[]>;
}

/**
 * Rotating, size-bounded, device-local (FR-055a/b/c).
 *
 * Failures inside the logger are swallowed on purpose: a diagnostic write that
 * throws must not take down the operation that was already failing. This is the
 * one place where a silent catch is correct, and it is silent only because the
 * alternative is an error loop.
 */
export function createErrorLog(handle: DatabaseHandle): ErrorLog {
	const collection = handle.collection<Record<string, never>>(
		COLLECTION.errorLog,
	);

	const log: ErrorLog = {
		async record(entry) {
			try {
				const at = Date.now();
				await handle.collection(COLLECTION.errorLog).insert({
					id: `${at}-${Math.random().toString(36).slice(2, 10)}`,
					data: {
						at,
						code: entry.code,
						operation: entry.operation,
						recordId: entry.recordId ?? null,
					},
				});
				await prune(handle);
			} catch {
				// Intentionally ignored — see the note above.
			}
		},

		report(entry) {
			log.record(entry).catch(() => {
				// Unreachable: record never rejects. Present so the contract holds even
				// if that ever changes.
			});
		},

		async recent(limit) {
			try {
				const page = await collection.list({
					sort: [{ field: 'at', direction: 'desc' }],
					page: { size: Math.min(limit, ERROR_LOG_LIMIT) },
				});
				return page.records.map(r => ({
					at: Number(r.data.at),
					code: String(r.data.code),
					operation: String(r.data.operation),
					recordId:
						r.data.recordId === null ? undefined : String(r.data.recordId),
				}));
			} catch {
				return [];
			}
		},
	};

	return log;
}

/** Trim oldest entries past the hard cap. */
async function prune(handle: DatabaseHandle): Promise<void> {
	const collection = handle.collection(COLLECTION.errorLog);
	const total = await collection.count();
	if (total <= ERROR_LOG_LIMIT) {
		return;
	}

	const excess = total - ERROR_LOG_LIMIT;
	const oldest = await collection.list({
		sort: [{ field: 'at', direction: 'asc' }],
		page: { size: Math.min(excess, 500) },
	});

	await handle.batch(
		oldest.records.map(r => ({
			type: 'delete' as const,
			collection: COLLECTION.errorLog,
			id: r.id,
		})),
	);
}
