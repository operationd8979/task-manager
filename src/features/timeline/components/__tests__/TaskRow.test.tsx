import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type {TimelineItem} from '../../../../domain/timeline';
import {TaskRow} from '../TaskRow';

/**
 * What the row SAYS in each state.
 *
 * Colour is asserted nowhere on purpose — under Jest the Unistyles variants are
 * stubbed, and a row whose only signal was colour would fail Principle V
 * anyway. These check the part that has to survive that: every state carries a
 * word, and the countdown appears exactly inside its window.
 */

const item = (patch: Partial<TimelineItem> = {}): TimelineItem => ({
  key: 'task:t1',
  source: {kind: 'task', taskId: 't1'},
  title: 'Họp nhóm',
  note: null,
  taskDate: '2026-08-03',
  startTime: '09:00',
  endTime: '10:00',
  status: 'processing',
  reminderEnabled: false,
  reminderOffsetMinutes: 5,
  hasOverride: false,
  isSkipped: false,
  ...patch,
});

function textOf(task: TimelineItem, now: Date): string {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <TaskRow
        task={task}
        now={now}
        countdownMinutes={5}
        onToggleStatus={() => undefined}
        onRestoreSkipped={() => undefined}
        onOpen={() => undefined}
        onMore={() => undefined}
        onShiftTime={() => undefined}
      />,
    );
  });
  const json = JSON.stringify(tree?.toJSON());
  ReactTestRenderer.act(() => tree?.unmount());
  return json;
}

describe('TaskRow', () => {
  it('names every state in words, not only in colour', () => {
    const before = new Date('2026-08-03T08:00:00');
    const after = new Date('2026-08-03T18:00:00');

    expect(textOf(item({status: 'done'}), before)).toContain('HOÀN THÀNH');
    expect(textOf(item(), after)).toContain('QUÁ HẠN');
    expect(textOf(item({isSkipped: true}), before)).toContain('ĐÃ BỎ QUA');
  });

  it('shows the countdown only inside the window', () => {
    expect(textOf(item(), new Date('2026-08-03T08:54:00'))).not.toContain(
      'CÒN',
    );
    expect(textOf(item(), new Date('2026-08-03T08:57:30'))).toContain(
      'CÒN 02:30',
    );
    // Past the start it is overdue, which is a different thing to say.
    expect(textOf(item(), new Date('2026-08-03T09:30:00'))).not.toContain(
      'CÒN',
    );
  });

  it('counts down a task with no reminder at all', () => {
    // The countdown is a property of the list, not of the notification. A task
    // set to "đúng giờ" with reminders off still counts down.
    const noReminder = item({
      reminderEnabled: false,
      reminderOffsetMinutes: 0,
    });
    expect(textOf(noReminder, new Date('2026-08-03T08:57:00'))).toContain(
      'CÒN 03:00',
    );
  });

  it('never counts down a session that is not going to happen', () => {
    const at = new Date('2026-08-03T08:57:30');
    expect(textOf(item({status: 'done'}), at)).not.toContain('CÒN');
    expect(textOf(item({isSkipped: true}), at)).not.toContain('CÒN');
  });

  it('claims no reminder on a skipped session', () => {
    // reconcile.ts refuses to schedule one, so the row must not say otherwise.
    const skipped = item({isSkipped: true, reminderEnabled: true});
    expect(textOf(skipped, new Date('2026-08-03T08:00:00'))).not.toContain(
      'NHẮC',
    );
  });
});
