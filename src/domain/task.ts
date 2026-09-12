import type { AppI18nKey } from '../i18n/keys.generated';
import {
	compareTime,
	isLocalDate,
	isLocalTime,
	minutesOf,
	MINUTES_PER_DAY,
	timeFromMinutes,
	toDateTime,
	type LocalDate,
	type LocalTime,
} from '../lib/date';
import { isReminderOffset, type ReminderOffset } from './reminder';

export type TaskStatus = 'processing' | 'done';

export interface Task {
	id: string;
	title: string;
	note: string | null;
	taskDate: LocalDate;
	startTime: LocalTime;
	/** null means the task is a single point in time, not a span. */
	endTime: LocalTime | null;
	status: TaskStatus;
	reminderEnabled: boolean;
	reminderOffsetMinutes: ReminderOffset;
}

export type NewTask = Omit<Task, 'id'>;

/** A field-addressed validation problem, so the form can mark the right input. */
export interface FieldError {
	field: keyof NewTask;
	/**
	 * Key into the string catalogue; the domain never holds display text.
	 *
	 * Imported from the GENERATED key module rather than from `src/i18n`, which
	 * pulls in React Native. This is a type-only import and is erased, so the
	 * domain layer still runs under `npx jest src/domain` with no renderer
	 * (Principle II) — and a key that no longer exists in any locale becomes a
	 * compile error here rather than a raw key on the form.
	 */
	messageKey: AppI18nKey;
	params?: Record<string, string>;
}

/**
 * Domain validation (data-model.md §5).
 *
 * This is the enforcement point, not the form. Screens re-run it for immediate
 * feedback, but nothing reaches storage without passing here — which is also
 * what lets these rules be tested without a renderer (Principle VIII).
 */
export function validateTask(input: NewTask): FieldError[] {
	const errors: FieldError[] = [];

	if (input.title.trim().length === 0) {
		errors.push({ field: 'title', messageKey: 'validate.titleRequired' });
	}

	if (!isLocalDate(input.taskDate)) {
		errors.push({ field: 'taskDate', messageKey: 'validate.titleRequired' });
	}

	if (!isLocalTime(input.startTime)) {
		errors.push({ field: 'startTime', messageKey: 'validate.titleRequired' });
	}

	// An absent end time is valid and means "a single moment". Only a present
	// one that does not sit after the start is a problem (FR-009).
	if (input.endTime !== null) {
		if (
			!isLocalTime(input.endTime) ||
			compareTime(input.endTime, input.startTime) <= 0
		) {
			errors.push({
				field: 'endTime',
				messageKey: 'validate.endBeforeStart',
				params: { start: input.startTime },
			});
		}
	}

	if (!isReminderOffset(input.reminderOffsetMinutes)) {
		errors.push({
			field: 'reminderOffsetMinutes',
			messageKey: 'validate.titleRequired',
		});
	}

	return errors;
}

/**
 * Move something to a new start time, carrying its end time with it.
 *
 * Rescheduling means "the same work, later" — the duration is the part the user
 * did NOT ask to change. Writing `startTime` alone silently stretches or
 * inverts the span, which is what made a dragged 09:00–10:00 task come back as
 * 10:00–10:00.
 *
 * Used by every reschedule path (drag, Đổi giờ, Di chuyển) so all three agree.
 */
export function withStartTime(
	item: Pick<Task, 'startTime' | 'endTime'>,
	nextStart: LocalTime,
): { startTime: LocalTime; endTime: LocalTime | null } {
	if (item.endTime === null) {
		return { startTime: nextStart, endTime: null };
	}
	const duration = minutesOf(item.endTime) - minutesOf(item.startTime);
	return {
		startTime: nextStart,
		// Clamped to the end of the day rather than wrapped: a span that crosses
		// midnight would read as ending before it starts, and validateTask rejects
		// exactly that. Losing a few minutes beats writing an invalid record.
		endTime: timeFromMinutes(
			Math.min(minutesOf(nextStart) + duration, MINUTES_PER_DAY - 1),
		),
	};
}

/**
 * Overdue is DERIVED, never stored (data-model.md §4).
 *
 * Storing it would create data that has to be refreshed against the clock, and
 * it would be wrong the moment the device changes timezone.
 */
export function isOverdue(
	item: Pick<Task, 'taskDate' | 'startTime' | 'endTime' | 'status'>,
	now: Date,
): boolean {
	if (item.status === 'done') {
		return false;
	}
	const reference = item.endTime ?? item.startTime;
	return toDateTime(item.taskDate, reference).getTime() < now.getTime();
}

/** Minutes a task is overdue by, for the "QUÁ HẠN 5 giờ" label. */
export function overdueByMinutes(
	item: Pick<Task, 'taskDate' | 'startTime' | 'endTime' | 'status'>,
	now: Date,
): number {
	if (!isOverdue(item, now)) {
		return 0;
	}
	const reference = item.endTime ?? item.startTime;
	const due = toDateTime(item.taskDate, reference).getTime();
	return Math.floor((now.getTime() - due) / 60_000);
}

/** Sort key used by the timeline: start time, then end time, then title. */
export function compareByStart(
	a: Pick<Task, 'startTime' | 'endTime' | 'title'>,
	b: Pick<Task, 'startTime' | 'endTime' | 'title'>,
): number {
	const byStart = minutesOf(a.startTime) - minutesOf(b.startTime);
	if (byStart !== 0) {
		return byStart;
	}
	const aEnd = a.endTime === null ? -1 : minutesOf(a.endTime);
	const bEnd = b.endTime === null ? -1 : minutesOf(b.endTime);
	if (aEnd !== bEnd) {
		return aEnd - bEnd;
	}
	return a.title.localeCompare(b.title);
}
