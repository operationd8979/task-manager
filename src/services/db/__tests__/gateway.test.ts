import {
	DiagnosticCodes,
	StorageError,
	deleteScopeData,
	openDatabase,
} from '@chipmobilesdk/rn-local-db';
import type { DatabaseHandle } from '@chipmobilesdk/rn-local-db';

import { openGateway } from '../gateway';

/**
 * The two halves of "Xóa toàn bộ dữ liệu".
 *
 * `destroyAll` closes the handle before it deletes anything, which is what
 * makes the gateway dead to its own caller the moment it returns; and a wipe
 * that does not finish leaves the scope marked `deleting`, which the package
 * refuses to open over. Both ended the same way once — a screen that could not
 * load behind a Retry that re-read through the same dead handle and failed
 * identically, with no way out short of relaunching or reinstalling.
 */

jest.mock('@chipmobilesdk/rn-local-db', () => {
	const actual = jest.requireActual('@chipmobilesdk/rn-local-db');
	return {
		...actual,
		openDatabase: jest.fn(),
		deleteScopeData: jest.fn(),
		setDiagnosticLogger: jest.fn(),
	};
});

const open = openDatabase as jest.MockedFunction<typeof openDatabase>;
const wipe = deleteScopeData as jest.MockedFunction<typeof deleteScopeData>;

function fakeHandle(trace?: string[]): DatabaseHandle {
	return {
		collection: () => ({}),
		backupPosture: 'excluded',
		close: jest.fn(async () => {
			trace?.push('close');
		}),
	} as unknown as DatabaseHandle;
}

beforeEach(() => {
	// Reset, not clear: a queued `...Once` left over from a previous test would
	// answer the next one's open call instead of its own.
	jest.resetAllMocks();
	wipe.mockResolvedValue({
		scopeKey: 'guest',
		removedRecords: 0,
		removedArtifacts: [],
		orphanedReferences: [],
		failedRemovals: [],
	});
});

describe('openGateway', () => {
	it('finishes an interrupted wipe rather than refusing to open forever', async () => {
		const handle = fakeHandle();
		open
			.mockRejectedValueOnce(new StorageError(DiagnosticCodes.SCOPE_DELETED))
			.mockResolvedValueOnce(handle);

		const gateway = await openGateway();

		expect(gateway.handle).toBe(handle);
		expect(wipe).toHaveBeenCalledTimes(1);
		expect(open).toHaveBeenCalledTimes(2);
	});

	it('deletes nothing when the open failed for any other reason', async () => {
		open.mockRejectedValue(new StorageError(DiagnosticCodes.CORRUPTION));

		// A database that merely will not open still holds the user's only copy
		// of their tasks. Recovering by deleting it is a decision this app has
		// not made.
		await expect(openGateway()).rejects.toMatchObject({ code: 'CORRUPTION' });
		expect(wipe).not.toHaveBeenCalled();
	});
});

describe('destroyAll', () => {
	it('closes the handle before the data goes', async () => {
		const trace: string[] = [];
		open.mockResolvedValueOnce(fakeHandle(trace));
		wipe.mockImplementationOnce(async () => {
			trace.push('delete');
			return {
				scopeKey: 'guest',
				removedRecords: 0,
				removedArtifacts: [],
				orphanedReferences: [],
				failedRemovals: [],
			};
		});

		const gateway = await openGateway();
		await gateway.destroyAll();

		// Which is why the caller has to open a NEW gateway afterwards: this one,
		// and every repository built on its handle, is finished (see App.tsx).
		expect(trace).toEqual(['close', 'delete']);
	});
});
