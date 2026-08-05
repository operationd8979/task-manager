import {
  createMemoryAdapter,
  resetMemoryAdapter,
} from '@chipmobilesdk/rn-local-db/testing';
import type {DatabaseHandle} from '@chipmobilesdk/rn-local-db';

import type {NewTask} from '../../../domain/task';
import {COLLECTIONS, MIGRATIONS, SCHEMA_VERSION} from '../schema';
import {createTaskRepository} from '../taskRepository';

/**
 * The startup sweep, which is the one repository call that runs before there is
 * a screen to report a failure into.
 *
 * It threw once, on a database that merely contained an undone delete, and the
 * only symptom was an app that would not start — Retry re-read the same rows
 * and failed identically, so there was no way out short of reinstalling.
 */

const draft = (patch: Partial<NewTask> = {}): NewTask => ({
  title: 'Họp nhóm',
  note: null,
  taskDate: '2026-08-05',
  startTime: '09:00',
  endTime: '10:00',
  status: 'processing',
  reminderEnabled: false,
  reminderOffsetMinutes: 5,
  ...patch,
});

async function openHandle(): Promise<DatabaseHandle> {
  return createMemoryAdapter().open({
    name: 'timeline_task_manager_test',
    scope: {kind: 'guest'},
    schemaVersion: SCHEMA_VERSION,
    collections: COLLECTIONS,
    migrations: MIGRATIONS,
  });
}

describe('purgeAllSoftDeleted', () => {
  let handle: DatabaseHandle;

  beforeEach(async () => {
    // The in-memory store is keyed by name and scope and outlives a handle, so
    // without this each test would inherit the previous one's rows.
    await resetMemoryAdapter();
    handle = await openHandle();
  });

  afterEach(async () => {
    await handle.close();
  });

  it('purges rows left behind by an undo window that never closed', async () => {
    const repository = createTaskRepository(handle);
    const kept = await repository.create(draft({title: 'Giữ lại'}));
    const abandoned = await repository.create(draft({title: 'Đã xóa'}));
    await repository.softDelete(abandoned.id);

    await expect(repository.purgeAllSoftDeleted()).resolves.toBe(1);

    // Gone for good, not merely hidden: FR-011a's edge case makes closing the
    // app during the undo window a permanent delete.
    expect(await repository.find(abandoned.id)).toBeNull();
    expect(await repository.find(kept.id)).not.toBeNull();
  });

  it('is a no-op, not a failure, when nothing was soft-deleted', async () => {
    const repository = createTaskRepository(handle);
    await repository.create(draft());
    await expect(repository.purgeAllSoftDeleted()).resolves.toBe(0);
  });

  it('sweeps every soft-deleted row, not just the first', async () => {
    const repository = createTaskRepository(handle);
    const one = await repository.create(draft({title: 'Một'}));
    const two = await repository.create(draft({title: 'Hai'}));
    await repository.softDelete(one.id);
    await repository.softDelete(two.id);

    await expect(repository.purgeAllSoftDeleted()).resolves.toBe(2);
    expect(await repository.countAll()).toBe(0);
  });
});
