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
        const page = await tasks.list({
          includeSoftDeleted: true,
          page: {size: 500},
        });
        const stale = page.records.filter(
          r => r.deletedAt !== undefined && r.deletedAt !== null,
        );
        if (stale.length === 0) {
          return 0;
        }
        const outcome = await handle.batch(
          stale.map(r => ({
            type: 'delete' as const,
            collection: COLLECTION.tasks,
            id: r.id,
          })),
        );
        return outcome.applied;
      } catch (error) {
        throw toDataError(error, 'task.purgeAllSoftDeleted');
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
