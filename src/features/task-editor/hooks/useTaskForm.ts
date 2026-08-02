import {useCallback, useMemo, useState} from 'react';

import {useDatabase} from '../../../app/providers/DatabaseProvider';
import type {ReminderOffset} from '../../../domain/reminder';
import {
  validateTask,
  type FieldError,
  type NewTask,
  type Task,
  type TaskStatus,
} from '../../../domain/task';
import {DataError} from '../../../services/db/errors';
import {createTaskRepository} from '../../../services/db/taskRepository';
import type {LocalDate, LocalTime} from '../../../lib/date';

export type FormMode = 'create' | 'edit';

export interface TaskFormValues {
  title: string;
  note: string;
  taskDate: LocalDate;
  startTime: LocalTime;
  endTime: LocalTime | null;
  status: TaskStatus;
  reminderEnabled: boolean;
  reminderOffsetMinutes: ReminderOffset;
}

export type SaveState =
  | {status: 'idle'}
  | {status: 'saving'}
  | {status: 'failed'};

export interface UseTaskFormOptions {
  /** Absent for a new task. */
  task?: Task;
  /** The day the timeline is showing; the default for a new task. */
  viewingDate: LocalDate;
  /** From settings, so a new task inherits the user's chosen offset (FR-036c). */
  defaultReminderOffset: ReminderOffset;
  onSaved: (saved: Task) => void;
}

const DEFAULT_START: LocalTime = '09:00';

export function useTaskForm({
  task,
  viewingDate,
  defaultReminderOffset,
  onSaved,
}: UseTaskFormOptions) {
  const {handle, errorLog} = useDatabase();
  const repository = useMemo(() => createTaskRepository(handle), [handle]);

  const mode: FormMode = task ? 'edit' : 'create';

  const initial = useMemo<TaskFormValues>(
    () =>
      task
        ? {
            title: task.title,
            note: task.note ?? '',
            taskDate: task.taskDate,
            startTime: task.startTime,
            endTime: task.endTime,
            status: task.status,
            reminderEnabled: task.reminderEnabled,
            reminderOffsetMinutes: task.reminderOffsetMinutes,
          }
        : {
            // Principle I: every field with a predictable value ships a default.
            title: '',
            note: '',
            taskDate: viewingDate,
            startTime: DEFAULT_START,
            endTime: null,
            status: 'processing',
            reminderEnabled: false,
            reminderOffsetMinutes: defaultReminderOffset,
          },
    [task, viewingDate, defaultReminderOffset],
  );

  const [values, setValues] = useState<TaskFormValues>(initial);
  const [save, setSave] = useState<SaveState>({status: 'idle'});
  /** Errors only appear after a save attempt or after the field is touched. */
  const [touched, setTouched] = useState<ReadonlySet<keyof TaskFormValues>>(
    () => new Set(),
  );
  const [submitted, setSubmitted] = useState(false);

  const dirty = useMemo(
    () => (Object.keys(values) as Array<keyof TaskFormValues>).some(
      key => values[key] !== initial[key],
    ),
    [values, initial],
  );

  const toDraft = useCallback(
    (v: TaskFormValues): NewTask => ({
      title: v.title.trim(),
      note: v.note.trim() === '' ? null : v.note.trim(),
      taskDate: v.taskDate,
      startTime: v.startTime,
      endTime: v.endTime,
      status: v.status,
      reminderEnabled: v.reminderEnabled,
      reminderOffsetMinutes: v.reminderOffsetMinutes,
    }),
    [],
  );

  // Validates on every keystroke (Delivery Baselines: forms validate while
  // typing), but only surfaces what the user has already engaged with.
  const allErrors = useMemo(() => validateTask(toDraft(values)), [
    values,
    toDraft,
  ]);

  const visibleErrors = useMemo<FieldError[]>(
    () =>
      submitted
        ? allErrors
        : allErrors.filter(e =>
            touched.has(e.field as keyof TaskFormValues),
          ),
    [allErrors, submitted, touched],
  );

  const errorFor = useCallback(
    (field: keyof TaskFormValues) =>
      visibleErrors.find(e => e.field === field),
    [visibleErrors],
  );

  const setField = useCallback(
    <K extends keyof TaskFormValues>(field: K, value: TaskFormValues[K]) => {
      setValues(current => ({...current, [field]: value}));
      setTouched(current => new Set(current).add(field));
    },
    [],
  );

  const submit = useCallback(async () => {
    setSubmitted(true);
    if (allErrors.length > 0) {
      // The screen scrolls to allErrors[0]; nothing is written.
      return;
    }

    setSave({status: 'saving'});
    try {
      const draft = toDraft(values);
      const saved =
        task === undefined
          ? await repository.create(draft)
          : await repository.update(task.id, draft);
      setSave({status: 'idle'});
      onSaved(saved);
    } catch (error) {
      // Entered values are kept untouched — losing them is the thing that
      // makes a save failure unforgivable (Delivery Baselines).
      void errorLog.record({
        code: error instanceof DataError ? error.code : 'UNKNOWN',
        operation: 'task.save',
        recordId: task?.id,
      });
      setSave({status: 'failed'});
    }
  }, [allErrors, toDraft, values, task, repository, onSaved, errorLog]);

  return {
    mode,
    values,
    setField,
    /** All errors, in field order — the screen focuses the first one. */
    errors: allErrors,
    errorFor,
    dirty,
    save,
    submit,
  };
}
