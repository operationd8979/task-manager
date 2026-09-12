import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { I18nProvider } from '@chipmobilesdk/rn-i18n';

import type { TimelineItem } from '../../domain/timeline';
import { TaskRow } from '../../features/timeline/components/TaskRow';
import { ENGLISH, JAPANESE, VIETNAMESE, i18n } from '../index';

/**
 * A language change has to reach a screen that is already on screen.
 *
 * Everything else about this feature can be right — three complete catalogues,
 * a persisted preference, a picker in Cài đặt — and the app can still need a
 * restart to show any of it, because nothing told React to render again. That
 * is a single subscription, in one hook, and it is invisible until someone
 * taps the control. So it is asserted here rather than discovered on a device.
 *
 * A task row is the subject because it is the densest case: fixed labels from
 * the catalogue, a duration assembled at runtime, and a value held in a
 * `useMemo` whose dependency list is the thing that goes stale.
 */
const task: TimelineItem = {
	key: 'task:t1',
	source: { kind: 'task', taskId: 't1' },
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
};

/**
 * Three hours past the 10:00 end time, so the row carries the overdue label and
 * the duration inside it is plural in English — the case that only comes out
 * right if `count` reaches the catalogue rather than being interpolated.
 */
const NOW = new Date('2026-08-03T13:00:00');

describe('switching language', () => {
	afterEach(async () => {
		await i18n.setLocale(VIETNAMESE);
	});

	it('re-renders a mounted row, including its memoised labels', async () => {
		let tree: ReactTestRenderer.ReactTestRenderer | undefined;
		await ReactTestRenderer.act(async () => {
			tree = ReactTestRenderer.create(
				<I18nProvider i18n={i18n}>
					<TaskRow
						task={task}
						now={NOW}
						countdownMinutes={5}
						onToggleStatus={() => undefined}
						onRestoreSkipped={() => undefined}
						onOpen={() => undefined}
						onMore={() => undefined}
						onShiftTime={() => undefined}
					/>
				</I18nProvider>,
			);
		});
		const textOf = () => JSON.stringify(tree?.toJSON());

		expect(textOf()).toContain('QUÁ HẠN');
		expect(textOf()).toContain('3 giờ');

		await ReactTestRenderer.act(async () => {
			await i18n.setLocale(ENGLISH);
		});

		// No remount, no restart: the same tree, in the new language.
		expect(textOf()).toContain('LATE');
		expect(textOf()).toContain('3 hours');
		expect(textOf()).not.toContain('QUÁ HẠN');

		await ReactTestRenderer.act(async () => {
			await i18n.setLocale(JAPANESE);
		});

		expect(textOf()).toContain('超過');
		expect(textOf()).toContain('3時間');

		// The task's own title is the user's text and is never translated.
		expect(textOf()).toContain('Họp nhóm');

		await ReactTestRenderer.act(async () => tree?.unmount());
	});
});
