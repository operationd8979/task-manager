import type {
  DatabaseHandle,
  StorableValue,
  StoredRecord,
} from '@chipmobilesdk/rn-local-db';

import {isReminderOffset, type ReminderOffset} from '../../domain/reminder';
import type {NewTask, Task, TaskStatus} from '../../domain/task';
import type {LocalDate} from '../../lib/date';
import {COLLECTION} from './schema';
import {toDataError} from './errors';

/** Shape as stored. Kept private: the domain never sees StoredRecord. */
interface TaskRow {
  title: string;
  note: string | null;
  taskDate: string;
  startTime: string;
  endTime: string | null;
  status: string;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number;
  // The package constrains stored data to its own value union, so the index
  // signature has to agree with it rather than fall back to `unknown`.
  [key: string]: StorableValue;
}

export interface TaskRepository {
  /** Already ordered by start time — the index provides it (SC-004). */
  listByDate(date: LocalDate): Promise<Task[]>;
  find(id: string): Promise<Task | null>;
  create(input: NewTask): Promise<Task>;
  update(id: string, patch: Partial<NewTask>): Promise<Task>;
  setStatus(id: string, status: TaskStatus): Promise<Task>;

  /** Undo mechanism: leaves reads immediately, stays on disk (research.md R11). */
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<Task>;
  /** Hard delete, once the undo window closes. */
  purge(id: string): Promise<void>;
  /** Startup sweep: makes "closed the app while undo was pending" permanent. */
  purgeAllSoftDeleted(): Promise<number>;

  countAll(): Promise<number>;
  /** Every task, for rebuilding the reminder schedule (FR-041). */
  listAll(): Promise<Task[]>;
}

export function createTaskRepository(handle: DatabaseHandle): TaskRepository {
  const tasks = handle.collection<TaskRow>(COLLECTION.tasks);

  const readOne = async (id: string): Promise<Task | null> => {
    const record = await tasks.find(id);
    return record ? toTask(record) : null;
  };

  return {
    async listByDate(date) {
      try {
        const page = await tasks.list({
          filter: {op: 'eq', field: 'taskDate', value: date},
          sort: [{field: 'startTime', direction: 'asc'}],
          page: {size: 500},
        });
        return page.records.map(toTask);
      } catch (error) {
        throw toDataError(error, 'task.listByDate');
      }
    },

    async find(id) {
      try {
        return await readOne(id);
      } catch (error) {
        throw toDataError(error, 'task.find');
      }
    },

    async create(input) {
      const id = newId();
      try {
        await tasks.insert({id, data: toRow(input)});
        return {id, ...input};
      } catch (error) {
        throw toDataError(error, 'task.create');
      }
    },

    async update(id, patch) {
      try {
        const current = await tasks.get(id);
        const next = {...toTask(current), ...patch};
        await tasks.update(id, {data: toRow(next)});
        return next;
      } catch (error) {
        throw toDataError(error, 'task.update');
      }
    },

    async setStatus(id, status) {
      try {
        const current = await tasks.get(id);
        const next: Task = {...toTask(current), status};
        await tasks.update(id, {data: toRow(next)});
        return next;
      } catch (error) {
        throw toDataError(error, 'task.setStatus');
      }
    },

    async softDelete(id) {
      try {
        await tasks.softDelete(id);
      } catch (error) {
        throw toDataError(error, 'task.softDelete');
      }
    },

    async restore(id) {
      try {
        await tasks.restore(id);
        const restored = await tasks.get(id);
        return toTask(restored);
      } catch (error) {
        throw toDataError(error, 'task.restore');
      }
    },

    async purge(id) {
      try {
        await tasks.delete(id);
      } catch (error) {
        throw toDataError(error, 'task.purge');
      }
    },

    async purgeAllSoftDeleted() {
      try {
        // `deletedAt` is a system column, not a declared field, so it cannot be
        // filtered on — the whole collection is paged through and the stale
        // rows are picked out here. Paged rather than a single read: stopping
        // at 500 would leave the rest on disk for the next launch to find.
        const stale: string[] = [];
        let cursor: string | undefined;
        do {
          const page = await tasks.list({
            includeSoftDeleted: true,
            page: cursor === undefined ? {size: 500} : {size: 500, cursor},
          });
          for (const record of page.records) {
            if (record.deletedAt !== undefined && record.deletedAt !== null) {
              stale.push(record.id);
            }
          }
          cursor = page.hasMore ? page.cursor : undefined;
        } while (cursor !== undefined);

        if (stale.length === 0) {
          return 0;
        }

        // Deliberately NOT handle.batch. A batch resolves every id against
        // `deleted_at IS NULL`, so a soft-deleted record does not exist as far
        // as one is concerned and the delete raises RECORD_NOT_FOUND — which,
        // running at boot, turned "closed the app during the undo window" into
        // an app that never started again. `delete` on the collection carries
        // no such guard, and the transaction keeps the sweep atomic.
        await handle.transaction(async tx => {
          const collection = tx.collection(COLLECTION.tasks);
          for (const id of stale) {
            await collection.delete(id);
          }
        });
        return stale.length;
      } catch (error) {
        throw toDataError(error, 'task.purgeAllSoftDeleted');
      }
    },

    async listAll() {
      try {
        const page = await tasks.list({page: {size: 500}});
        return page.records.map(toTask);
      } catch (error) {
        throw toDataError(error, 'task.listAll');
      }
    },

    async countAll() {
      try {
        return await tasks.count();
      } catch (error) {
        throw toDataError(error, 'task.countAll');
      }
    },
  };
}

function toRow(task: NewTask | Task): TaskRow {
  return {
    title: task.title,
    note: task.note,
    taskDate: task.taskDate,
    startTime: task.startTime,
    endTime: task.endTime,
    status: task.status,
    reminderEnabled: task.reminderEnabled,
    reminderOffsetMinutes: task.reminderOffsetMinutes,
  };
}

function toTask(record: StoredRecord<TaskRow>): Task {
  const {data} = record;
  return {
    id: record.id,
    title: data.title,
    note: data.note,
    taskDate: data.taskDate,
    startTime: data.startTime,
    endTime: data.endTime,
    status: data.status === 'done' ? 'done' : 'processing',
    reminderEnabled: Boolean(data.reminderEnabled),
    reminderOffsetMinutes: asOffset(data.reminderOffsetMinutes),
  };
}

function asOffset(value: number): ReminderOffset {
  return isReminderOffset(value) ? value : 0;
}

function newId(): string {
  return `t_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
