import {buildOccurrences} from '../occurrence';
import type {RecurrenceOverride, RecurringRule} from '../recurrence';

/**
 * The five merge cases contracts/recurrence.md marks as mandatory.
 *
 * This is where silent data loss lives: an override that only knows "set" and
 * "null" cannot distinguish "this session has no end time" from "inherit the
 * rule's 10:00", and the user gets back a value they deliberately removed.
 */

const DATE = '2026-08-03'; // a Monday

const rule: RecurringRule = {
  id: 'r1',
  title: 'Tập thể dục',
  note: 'Phòng gym',
  startDate: '2026-08-03',
  endDate: null,
  daysOfWeek: [1],
  defaultStartTime: '07:00',
  defaultEndTime: '10:00',
  reminderEnabled: true,
  reminderOffsetMinutes: 15,
};

const override = (patch: Partial<RecurrenceOverride>): RecurrenceOverride => ({
  ruleId: 'r1',
  occurrenceDate: DATE,
  isSkipped: false,
  ...patch,
});

const build = (overrides: RecurrenceOverride[]) =>
  buildOccurrences([rule], overrides, DATE);

describe('buildOccurrences merge semantics', () => {
  it('inherits everything when there is no override', () => {
    const [occurrence] = build([]);
    expect(occurrence.endTime).toBe('10:00');
    expect(occurrence.title).toBe('Tập thể dục');
    expect(occurrence.hasOverride).toBe(false);
  });

  it('treats a PRESENT null endTime as "this session has no end time"', () => {
    const [occurrence] = build([override({endTime: null})]);
    expect(occurrence.endTime).toBeNull();
    expect(occurrence.hasOverride).toBe(true);
  });

  it('treats an ABSENT endTime as "inherit from the rule"', () => {
    const [occurrence] = build([override({title: 'Đổi tên'})]);
    // The override says nothing about endTime, so the rule's value stands.
    expect(occurrence.endTime).toBe('10:00');
  });

  it('still produces a skipped session, flagged rather than dropped', () => {
    // Dropping it left a hole in the day with nothing to explain it. The row is
    // drawn greyed out instead; `isSkipped` is what every consumer branches on,
    // and reconcile.ts is the one that must never schedule it.
    const [occurrence] = build([override({isSkipped: true})]);
    expect(occurrence.isSkipped).toBe(true);
    expect(occurrence.title).toBe('Tập thể dục');
  });

  it('leaves isSkipped false when no override says otherwise', () => {
    expect(build([])[0].isSkipped).toBe(false);
    expect(build([override({status: 'done'})])[0].isSkipped).toBe(false);
  });

  it('does not mark a status-only override as edited', () => {
    // Ticking a session writes status. That is not "chỉnh riêng" in the sense
    // the user means, and showing the label after every tick would drain it of
    // meaning (FR-026a).
    const [occurrence] = build([override({status: 'done'})]);
    expect(occurrence.status).toBe('done');
    expect(occurrence.hasOverride).toBe(false);
  });

  it('keeps an override that falls outside the rule range in the data', () => {
    const bounded: RecurringRule = {...rule, endDate: '2026-07-27'};
    const stray = override({startTime: '09:00'});
    // No occurrence is produced, but nothing about the override is destroyed —
    // the caller still holds it and can reuse it if the range reopens.
    expect(buildOccurrences([bounded], [stray], DATE)).toHaveLength(0);
    expect(stray.startTime).toBe('09:00');
  });

  it('applies every content field that is present', () => {
    const [occurrence] = build([
      override({
        title: 'Buổi riêng',
        note: null,
        startTime: '08:00',
        reminderEnabled: false,
      }),
    ]);
    expect(occurrence.title).toBe('Buổi riêng');
    expect(occurrence.note).toBeNull();
    expect(occurrence.startTime).toBe('08:00');
    expect(occurrence.reminderEnabled).toBe(false);
    // Untouched fields still come from the rule.
    expect(occurrence.reminderOffsetMinutes).toBe(15);
  });
});
