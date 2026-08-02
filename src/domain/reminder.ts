/** Reminder offsets the app supports, in minutes before the start (FR-036). */
export const REMINDER_OFFSETS = [0, 5, 10, 15, 30, 60] as const;

export type ReminderOffset = (typeof REMINDER_OFFSETS)[number];

export function isReminderOffset(value: number): value is ReminderOffset {
  return (REMINDER_OFFSETS as readonly number[]).includes(value);
}
