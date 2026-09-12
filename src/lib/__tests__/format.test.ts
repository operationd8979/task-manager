import { ENGLISH, JAPANESE, VIETNAMESE, i18n } from '../../i18n';
import {
	dayLabel,
	durationLabel,
	monthList,
	reminderOffsetLabel,
	repeatPatternLabel,
	weekdayList,
	weekdayShort,
} from '../format';

/**
 * The formatting layer in each of the three languages.
 *
 * These are the strings the catalogue cannot hold whole, because they are
 * assembled at runtime — which makes them the ones most likely to stay
 * Vietnamese after a language switch and not be noticed, since each is a
 * fragment inside a sentence that did translate.
 *
 * `2026-08-03` is a Monday, and August is the month with the most different
 * shape across the three: "03/08", "8/3" and "8月3日".
 */
const MONDAY = '2026-08-03';

afterAll(async () => {
	// Module state outlives a test file's tests. Put it back so the order tests
	// run in cannot decide what a later one sees.
	await i18n.setLocale(VIETNAMESE);
});

describe('runtime-composed labels', () => {
	it('orders the day bar the way each language writes a date', async () => {
		await i18n.setLocale(VIETNAMESE);
		expect(dayLabel(MONDAY)).toBe('Thứ Hai 03/08');

		await i18n.setLocale(ENGLISH);
		expect(dayLabel(MONDAY)).toBe('Monday 8/3');

		await i18n.setLocale(JAPANESE);
		expect(dayLabel(MONDAY)).toBe('8月3日 月曜日');
	});

	it('picks the English plural form from the amount', async () => {
		await i18n.setLocale(ENGLISH);
		expect(durationLabel(1)).toBe('1 minute');
		expect(durationLabel(20)).toBe('20 minutes');
		expect(durationLabel(60)).toBe('1 hour');
		expect(durationLabel(5 * 60)).toBe('5 hours');
		expect(durationLabel(48 * 60)).toBe('2 days');
	});

	it('uses one form in Vietnamese and Japanese, which have one', async () => {
		await i18n.setLocale(VIETNAMESE);
		expect(durationLabel(1)).toBe('1 phút');
		expect(durationLabel(20)).toBe('20 phút');
		expect(durationLabel(5 * 60)).toBe('5 giờ');

		await i18n.setLocale(JAPANESE);
		expect(durationLabel(20)).toBe('20分');
		expect(durationLabel(5 * 60)).toBe('5時間');
	});

	it('translates the repeat pattern, not just the sentence around it', async () => {
		await i18n.setLocale(VIETNAMESE);
		expect(repeatPatternLabel({ frequency: 'monthlyLastDay' })).toBe(
			'cuối tháng',
		);
		expect(
			repeatPatternLabel({ frequency: 'monthlyByDay', daysOfMonth: [1, 15] }),
		).toBe('ngày 1, 15');
		expect(weekdayList([1, 3, 5])).toBe('T2, T4, T6');

		await i18n.setLocale(ENGLISH);
		expect(repeatPatternLabel({ frequency: 'monthlyLastDay' })).toBe(
			'the last day',
		);
		expect(weekdayList([1, 3, 5])).toBe('Mon, Wed, Fri');

		await i18n.setLocale(JAPANESE);
		expect(repeatPatternLabel({ frequency: 'monthlyLastDay' })).toBe('月末');
		expect(weekdayList([1, 3, 5])).toBe('月, 水, 金');
	});

	it('names the months a monthly series will skip', async () => {
		await i18n.setLocale(VIETNAMESE);
		expect(monthList([2, 4])).toBe('tháng 2, tháng 4');

		await i18n.setLocale(ENGLISH);
		expect(monthList([2, 4])).toBe('February, April');

		await i18n.setLocale(JAPANESE);
		expect(monthList([2, 4])).toBe('2月, 4月');
	});

	it('spells out an on-time reminder rather than showing a bare zero', async () => {
		await i18n.setLocale(VIETNAMESE);
		expect(reminderOffsetLabel(0)).toBe('đúng giờ');

		await i18n.setLocale(ENGLISH);
		expect(reminderOffsetLabel(0)).toBe('on time');
		expect(reminderOffsetLabel(10)).toBe('−10′');
	});

	it('changes what it returns as soon as the language changes', async () => {
		// The switch is in-memory and takes effect on the next call — no restart,
		// which is what `settings.languageHint` promises the user.
		await i18n.setLocale(VIETNAMESE);
		const before = weekdayShort(7);
		await i18n.setLocale(ENGLISH);
		expect(weekdayShort(7)).not.toBe(before);
		expect(weekdayShort(7)).toBe('Sun');
	});
});
