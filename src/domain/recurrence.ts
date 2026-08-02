import {
  addDays,
  compareDate,
  daysBetween,
  weekdayOf,
  type LocalDate,
  type LocalTime,
  type Weekday,
} from '../lib/date';
import type {ReminderOffset} from './reminder';
import type {TaskStatus} from './task';

export interface RecurringRule {
  id: string;
  title: string;
  note: string | null;
  startDate: LocalDate;
  /** null means the series never ends (FR-022). */
  endDate: LocalDate | null;
  daysOfWeek: readonly Weekday[];
  defaultStartTime: LocalTime;
  defaultEndTime: LocalTime | null;
  reminderEnabled: boolean;
  reminderOffsetMinutes: ReminderOffset;
}

export type NewRecurringRule = Omit<RecurringRule, 'id'>;

/**
 * An override records ONLY the fields it actually replaces.
 *
 * Every field is optional AND nullable, and those are different: absent means
 * "inherit from the rule", present-and-null means "this occurrence deliberately
 * has no value". Collapsing the two loses user data silently (research.md R7).
 */
export interface RecurrenceOverride {
  ruleId: string;
  occurrenceDate: LocalDate;
  isSkipped: boolean;
  title?: string;
  note?: string | null;
  startTime?: LocalTime;
  endTime?: LocalTime | null;
  status?: TaskStatus;
  reminderEnabled?: boolean;
  reminderOffsetMinutes?: ReminderOffset;
}

/** Fields whose presence means the user edited this occasion's CONTENT. */
const CONTENT_FIELDS = [
  'title',
  'note',
  'startTime',
  'endTime',
  'reminderEnabled',
  'reminderOffsetMinutes',
] as const;

/**
 * Does this rule produce an occurrence on that date? Overrides not considered.
 *
 * The end date is INCLUSIVE (FR-024). Writing `<` instead of `<=` here is the
 * kind of mistake that surfaces on exactly one day in each series' life.
 */
export function ruleOccursOn(rule: RecurringRule, date: LocalDate): boolean {
  if (compareDate(date, rule.startDate) < 0) {
    return false;
  }
  if (rule.endDate !== null && compareDate(date, rule.endDate) > 0) {
    return false;
  }
  return rule.daysOfWeek.includes(weekdayOf(date));
}

/** True when the override changes content, not merely status (FR-026a). */
export function overridesContent(override: RecurrenceOverride): boolean {
  return CONTENT_FIELDS.some(field => field in override);
}

/**
 * How many occurrences fall in [from, to], inclusive.
 *
 * Deliberately arithmetic rather than a day-by-day walk: the apply-scope sheet
 * calls this while the user is waiting, and a 365-iteration loop on the JS
 * thread for a number is work the user pays for (Principle VI).
 */
export function countOccurrences(
  rule: RecurringRule,
  from: LocalDate,
  to: LocalDate,
): number {
  const start =
    compareDate(from, rule.startDate) > 0 ? from : rule.startDate;
  const end =
    rule.endDate !== null && compareDate(rule.endDate, to) < 0
      ? rule.endDate
      : to;

  if (compareDate(start, end) > 0 || rule.daysOfWeek.length === 0) {
    return 0;
  }

  const span = daysBetween(start, end) + 1;
  const wholeWeeks = Math.floor(span / 7);
  let total = wholeWeeks * rule.daysOfWeek.length;

  // Remaining days form a partial week beginning at `start`.
  const leftover = span % 7;
  for (let i = 0; i < leftover; i++) {
    if (rule.daysOfWeek.includes(weekdayOf(addDays(start, wholeWeeks * 7 + i)))) {
      total += 1;
    }
  }
  return total;
}
