import {
  isInPast,
  reminderFireAt,
  reminderId,
  type TargetRef,
} from '../reminder';

/**
 * Identifiers must be COMPUTED and STABLE, because that is the whole basis of
 * idempotent reconciliation (contracts/reminders.md). A generated-and-stored id
 * would be a second source of truth.
 */
describe('reminderId', () => {
  const task: TargetRef = {kind: 'task', taskId: 'abc'};
  const occurrence: TargetRef = {
    kind: 'occurrence',
    ruleId: 'rule-123',
    date: '2026-08-10',
  };

  it('uses the documented shapes', () => {
    expect(reminderId(task)).toBe('task:abc');
    expect(reminderId(occurrence)).toBe('recurring:rule-123:2026-08-10');
  });

  it('is stable across calls — no randomness, no clock', () => {
    expect(reminderId(occurrence)).toBe(reminderId({...occurrence}));
  });

  it('distinguishes two sessions of the same series', () => {
    expect(reminderId({...occurrence, date: '2026-08-17'})).not.toBe(
      reminderId(occurrence),
    );
  });
});

describe('reminderFireAt', () => {
  const base = {
    reminderEnabled: true,
    reminderOffsetMinutes: 15 as const,
    taskDate: '2026-08-03',
    startTime: '09:00' as const,
  };

  it('is null when the reminder is off', () => {
    expect(reminderFireAt({...base, reminderEnabled: false})).toBeNull();
  });

  it('subtracts the offset from the start time', () => {
    const fireAt = reminderFireAt(base);
    expect(fireAt?.getHours()).toBe(8);
    expect(fireAt?.getMinutes()).toBe(45);
  });

  it('fires at the start time when the offset is zero', () => {
    const fireAt = reminderFireAt({...base, reminderOffsetMinutes: 0});
    expect(fireAt?.getHours()).toBe(9);
    expect(fireAt?.getMinutes()).toBe(0);
  });

  it('crosses midnight backwards when it has to', () => {
    const fireAt = reminderFireAt({
      ...base,
      startTime: '00:30',
      reminderOffsetMinutes: 60,
    });
    // 2026-08-02 23:30 local.
    expect(fireAt?.getDate()).toBe(2);
    expect(fireAt?.getHours()).toBe(23);
  });
});

describe('isInPast', () => {
  it('treats the exact moment as past — the OS would fire it instantly', () => {
    const at = new Date('2026-08-03T09:00:00');
    expect(isInPast(at, at)).toBe(true);
  });

  it('is false for a future moment', () => {
    expect(
      isInPast(new Date('2026-08-03T09:00:00'), new Date('2026-08-03T08:59:00')),
    ).toBe(false);
  });
});
