import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	FlatList,
	Pressable,
	StyleSheet as RNStyleSheet,
	View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

import { useDatabase } from '../../../app/providers/DatabaseProvider';
import { useReminders } from '../../../app/providers/ReminderProvider';
import { useUndo } from '../../../app/providers/UndoProvider';
import { ErrorState } from '../../../components/ErrorState';
import { EmptyState } from '../../../components/EmptyState';
import { Skeleton, SkeletonGroup } from '../../../components/Skeleton';
import { Text } from '../../../components/Text';
import { countdownOpensAt } from '../../../domain/countdown';
import { DEFAULT_SETTINGS, type AppSettings } from '../../../domain/settings';
import { withStartTime, type Task } from '../../../domain/task';
import { withTimeFrom, type RecurringRule } from '../../../domain/recurrence';
import type { TimelineItem } from '../../../domain/timeline';
import { addDays, compareDate, today, type LocalTime } from '../../../lib/date';
import { dayLabel } from '../../../lib/format';
import { t } from '../../../lib/strings';
import { createRecurrenceRepository } from '../../../services/db/recurrenceRepository';
import { createSettingsRepository } from '../../../services/db/settingsRepository';
import { createTaskRepository } from '../../../services/db/taskRepository';
import { appTheme } from '../../../theme/theme';
import {
	BAR_HEIGHT,
	LIST_BOTTOM_PADDING,
	ROW_MIN_HEIGHT,
} from '../../../theme/tokens';
import {
	DeleteSeriesSheet,
	RowActionsSheet,
	ScopeSheet,
	TaskFormSheet,
	TimeShiftSheet,
	type ApplyScope,
	type RowAction,
} from '../../task-editor';
import { DatePickerSheet } from '../components/DatePickerSheet';
import { DayBar } from '../components/DayBar';
import { TaskRow } from '../components/TaskRow';
import { useCreateSwipe } from '../hooks/useCreateSwipe';
import { useDaySwipe } from '../hooks/useDaySwipe';
import {
	useTimelineClock,
	type CountdownWindow,
} from '../hooks/useTimelineClock';
import { useTimelineDay } from '../hooks/useTimelineDay';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4', 's5', 's6'];

/** How far the day slides in from, and how long it takes. */
const DAY_TRAVEL_PX = 28;
const DAY_DURATION_MS = 180;

/**
 * Plain React Native styles, deliberately not Unistyles ones.
 *
 * The Unistyles Babel plugin only rewrites components imported from
 * 'react-native'; Reanimated's Animated.View is not one, so it must be handed
 * an ordinary style object. Neither of these carries a themed value, so there
 * is nothing lost by keeping them out of the theme.
 */
const plain = RNStyleSheet.create({ fill: { flex: 1 } });

/**
 * A write that has to pass the apply-scope sheet first.
 *
 * Only rescheduling reaches it now. Deleting a session used to as well, with
 * "chỉ lần này" meaning skip — but those are two different jobs, so they are
 * two entries in the row sheet, and neither has a scope left to ask about
 * (change.md §1). The end time travels with the start: a reschedule moves the
 * whole span, and dropping the end here is what left occurrences ending before
 * they began.
 */
interface ScopedShift {
	startTime: LocalTime;
	endTime: LocalTime | null;
}

type Overlay =
	| { kind: 'none' }
	| { kind: 'calendar' }
	| { kind: 'form'; task?: Task }
	// Editing a repeating session means editing the RULE behind it; there is no
	// per-session content editor, so this carries the rule rather than a row.
	| { kind: 'seriesForm'; rule: RecurringRule }
	| { kind: 'actions'; item: TimelineItem }
	// Holds the row, not a resolved Task: a recurring session has no record
	// behind it, and this sheet only ever reads the date and the start time.
	| { kind: 'shift'; item: TimelineItem; mode: 'time' | 'move' };

export function TimelineScreen() {
	const navigation = useNavigation();
	const insets = useSafeAreaInsets();
	const { handle } = useDatabase();
	const undo = useUndo();
	const reminders = useReminders();
	const repository = useMemo(() => createTaskRepository(handle), [handle]);
	const recurrence = useMemo(
		() => createRecurrenceRepository(handle),
		[handle],
	);

	// The only navigation state worth remembering. Opening the app always lands
	// on today rather than restoring a previous day (design/ia §2).
	const [date, setDate] = useState(() => today());
	const [overlay, setOverlay] = useState<Overlay>({ kind: 'none' });
	const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
	/** A reschedule of a recurring session, waiting on the scope answer. */
	const [pendingScope, setPendingScope] = useState<{
		rule: RecurringRule;
		date: string;
		title: string;
		action: ScopedShift;
	} | null>(null);
	/** A series the user has asked to end, waiting on the warning. */
	const [pendingDelete, setPendingDelete] = useState<RecurringRule | null>(null);

	const { state, reload, setStatus } = useTimelineDay(date);

	/**
	 * Which way the day last moved, so the new day enters from the side it came
	 * from. A ref rather than state: it is only ever read by the effect that the
	 * date change already triggers, and holding it in state would render twice.
	 */
	const travel = useRef(1);
	/**
	 * The single way the viewed day changes. Every caller goes through it so the
	 * transition direction is recorded in exactly one place — a stray `setDate`
	 * would animate the wrong way round.
	 */
	const goTo = useCallback((next: (current: string) => string) => {
		setDate(current => {
			const target = next(current);
			travel.current = compareDate(target, current) < 0 ? -1 : 1;
			return target;
		});
	}, []);

	useEffect(() => {
		let cancelled = false;
		createSettingsRepository(handle)
			.getAll()
			.then(next => {
				if (!cancelled) {
					setSettings(next);
				}
			})
			// Settings have working defaults, so a read failure degrades rather than
			// blocks; the Settings screen is where it is surfaced and retried.
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [handle]);

	/**
	 * A notification tap moves the timeline to that day (FR-043).
	 *
	 * If the record is gone the day simply shows what it has — falling back to
	 * today rather than reporting an error, because a notification outliving its
	 * task is ordinary, not exceptional.
	 */
	useEffect(() => {
		const target = reminders.pendingTarget;
		if (!target) {
			return;
		}
		goTo(() => target.taskDate || today());
		reminders.clearPendingTarget();
	}, [reminders, goTo]);

	/**
	 * When each row would start counting down, for the screen's single clock.
	 *
	 * Built here rather than in the rows because the clock has to know about all
	 * of them at once to decide whether to tick at all — see useTimelineClock.
	 * EVERY task gets a window off the one app-wide setting, reminder or not;
	 * only rows that are done or skipped are left out, because neither is still
	 * going to happen.
	 */
	const countdownWindows = useMemo<CountdownWindow[]>(() => {
		if (state.status !== 'ready') {
			return [];
		}
		const window = settings.countdownMinutes;
		const out: CountdownWindow[] = [];
		for (const item of state.items) {
			if (item.status === 'done' || item.isSkipped) {
				continue;
			}
			const opensAt = countdownOpensAt(item, window);
			if (opensAt === null) {
				continue;
			}
			out.push({
				opensAt: opensAt.getTime(),
				startsAt: opensAt.getTime() + window * 60_000,
			});
		}
		return out;
	}, [state, settings.countdownMinutes]);

	// One timer for the whole screen. It also refreshes the QUÁ HẠN labels at
	// least once a minute, which a value computed per render never did.
	const now = useTimelineClock(countdownWindows);

	const goPrevious = useCallback(() => goTo(d => addDays(d, -1)), [goTo]);
	const goNext = useCallback(() => goTo(d => addDays(d, 1)), [goTo]);
	const goToday = useCallback(() => goTo(() => today()), [goTo]);
	const swipe = useDaySwipe({ onPrevious: goPrevious, onNext: goNext });

	/**
	 * The day slides and fades in when the date changes (S-01).
	 *
	 * Driven by a shared value rather than by a layout animation: this runs on
	 * the UI thread, survives the list re-rendering underneath it, and cannot
	 * leave a row half-animated if the read finishes mid-transition (SC-006).
	 */
	const dayProgress = useSharedValue(1);
	const dayOffset = useSharedValue(0);
	useEffect(() => {
		dayOffset.value = travel.current * DAY_TRAVEL_PX;
		dayProgress.value = 0;
		dayProgress.value = withTiming(1, { duration: DAY_DURATION_MS });
	}, [date, dayProgress, dayOffset]);

	const dayStyle = useAnimatedStyle(() => ({
		opacity: dayProgress.value,
		transform: [{ translateX: (1 - dayProgress.value) * dayOffset.value }],
	}));

	const closeOverlay = useCallback(() => setOverlay({ kind: 'none' }), []);

	const toggleStatus = useCallback(
		(item: TimelineItem) => {
			// Optimistic: the row flips before the write lands, and rolls back if it
			// fails. See useTimelineDay.setStatus (SC-005).
			setStatus(item, item.status === 'done' ? 'processing' : 'done');
		},
		[setStatus],
	);

	/**
	 * Puts a skipped session back on the day.
	 *
	 * The inverse of "Chỉ lần này" on a delete, and deliberately NOT routed
	 * through the apply-scope sheet: it touches exactly the one session whose
	 * button was pressed, so there is no scope to ask about (FR-026a).
	 */
	const restoreSkipped = useCallback(
		(item: TimelineItem) => {
			if (item.source.kind !== 'occurrence') {
				return;
			}
			const { ruleId, date: occurrenceDate } = item.source;
			recurrence
				.upsertOverride(ruleId, occurrenceDate, { isSkipped: false })
				.then(() => {
					reload();
					// The session is happening again, so its reminder has to come back.
					reminders.sync();
				})
				.catch(reload);
		},
		[recurrence, reload, reminders],
	);

	/**
	 * Resolves a task-backed row to its record before opening a sheet.
	 *
	 * Occurrence rows fall through: every write to one has to pass the
	 * apply-scope sheet first (FR-026), which arrives with US5. Doing nothing is
	 * the correct interim behaviour — silently editing the whole series is the
	 * failure this feature exists to prevent. Status toggling still works,
	 * because that path never asks about scope (FR-026a).
	 */
	const withTask = useCallback(
		(item: TimelineItem, open: (task: Task) => void) => {
			if (item.source.kind !== 'task') {
				return;
			}
			const { taskId } = item.source;
			repository
				.find(taskId)
				.then(found => {
					if (found) {
						open(found);
					}
				})
				.catch(reload);
		},
		[repository, reload],
	);

	/**
	 * The occurrence counterpart: resolves a session's RULE before opening a
	 * sheet. Editing or deleting a session is always an act on the series, so
	 * every one of those paths starts here.
	 */
	const withRule = useCallback(
		(item: TimelineItem, open: (rule: RecurringRule) => void) => {
			if (item.source.kind !== 'occurrence') {
				return;
			}
			recurrence
				.findRule(item.source.ruleId)
				.then(found => {
					if (found) {
						open(found);
					}
				})
				.catch(reload);
		},
		[recurrence, reload],
	);

	/**
	 * Drops one session of a series, and only that one (change.md §1).
	 *
	 * No scope question and no confirmation: it touches exactly the session whose
	 * button was pressed, the row stays on the day struck through, and the row's
	 * own restore button undoes it long after the toast is gone.
	 *
	 * Undo writes `isSkipped: false` rather than clearing the override, so a
	 * session that also had its own time or status keeps them.
	 */
	const skipOccurrence = useCallback(
		(item: TimelineItem) => {
			if (item.source.kind !== 'occurrence') {
				return;
			}
			const { ruleId, date: occurrenceDate } = item.source;
			recurrence
				.upsertOverride(ruleId, occurrenceDate, { isSkipped: true })
				.then(() => {
					reload();
					// Nothing about a session the user cancelled may reach the OS.
					reminders.sync();
					undo.offer({
						message: t('undo.skipped', {
							title: item.title,
							date: occurrenceDate,
						}),
						undo: async () => {
							await recurrence.upsertOverride(ruleId, occurrenceDate, {
								isSkipped: false,
							});
							reload();
							reminders.sync();
						},
						commit: async () => undefined,
					});
				})
				.catch(reload);
		},
		[recurrence, reload, reminders, undo],
	);

	/**
	 * Opens the scope sheet for a write against a recurring session.
	 *
	 * It appears AFTER the user has committed the edit and immediately before the
	 * write — asking sooner would ask before they know what they are changing
	 * (design/ia §5 F-3).
	 */
	const askScope = useCallback(
		(item: TimelineItem, action: ScopedShift) => {
			if (item.source.kind !== 'occurrence') {
				return;
			}
			const { ruleId, date: occurrenceDate } = item.source;
			recurrence
				.findRule(ruleId)
				.then(rule => {
					if (rule) {
						setPendingScope({
							rule,
							date: occurrenceDate,
							title: item.title,
							action,
						});
					}
				})
				.catch(reload);
		},
		[recurrence, reload],
	);

	const shiftTime = useCallback(
		(item: TimelineItem, nextStart: LocalTime) => {
			// Drag moves the whole span. Writing the start alone left 09:00–10:00
			// sitting at 10:00–10:00 after one step.
			const next = withStartTime(item, nextStart);
			if (item.source.kind === 'occurrence') {
				askScope(item, next);
				return;
			}
			repository.update(item.source.taskId, next).then(reload).catch(reload);
		},
		[repository, reload, askScope],
	);

	const applyScope = useCallback(
		(scope: ApplyScope) => {
			const pending = pendingScope;
			if (!pending) {
				return;
			}
			setPendingScope(null);
			const { rule, date: occurrenceDate, action } = pending;
			const previous = {
				defaultStartTime: rule.defaultStartTime,
				defaultEndTime: rule.defaultEndTime,
				timeHistory: rule.timeHistory,
			};

			/**
			 * A whole-series reschedule goes through `withTimeFrom`, exactly as the
			 * edit screen does: dragging a row is a different gesture for the same
			 * decision, and it must not be the one route that rewrites what time
			 * last month's sessions happened at (change.md §4).
			 */
			const write =
				scope === 'thisOnly'
					? recurrence.upsertOverride(rule.id, occurrenceDate, {
						startTime: action.startTime,
						endTime: action.endTime,
					})
					: recurrence
						.updateRule(
							rule.id,
							withTimeFrom(rule, today(), action.startTime, action.endTime),
						)
						.then(() => undefined);

			write
				.then(() => {
					reload();
					// The fire times moved, so the schedule has to be re-derived.
					reminders.sync();
					// The toast restates the scope that was applied, because that is
					// the thing the user most needs to confirm (ux-ui-spec §4).
					undo.offer({
						message: t(
							scope === 'thisOnly'
								? 'undo.scopeThisOnly'
								: 'undo.scopeWholeSeries',
							{ change: t('scope.changedTime', { time: action.startTime }) },
						),
						undo: async () => {
							if (scope === 'thisOnly') {
								await recurrence.clearOverride(rule.id, occurrenceDate);
							} else {
								// The history goes back too — restoring the time alone
								// would leave behind a segment claiming the series used to
								// run at a time it is about to run at again.
								await recurrence.updateRule(rule.id, previous);
							}
							reload();
							reminders.sync();
						},
						commit: async () => undefined,
					});
				})
				.catch(reload);
		},
		[pendingScope, recurrence, reload, undo, reminders],
	);

	/**
	 * Ends a series from today, keeping every session already behind us
	 * (change.md §1, §5).
	 *
	 * Not a delete: occurrences are computed from the rule, so removing the rule
	 * would take the user's history with it — a year of "done" sessions vanishing
	 * because they ended a habit today. Setting the end date leaves the past
	 * exactly as it was and stops the future, which is what "xóa" means for
	 * something that has already happened.
	 *
	 * The one case that IS a delete is a series with nothing behind it: a rule
	 * whose sessions all lie ahead has no history to protect, and an ended rule
	 * with no visible sessions would be a record the user can never reach again.
	 */
	const endSeries = useCallback(
		(rule: RecurringRule) => {
			setPendingDelete(null);
			const from = today();

			if (compareDate(rule.startDate, from) >= 0) {
				// A hard delete has nothing left on disk to restore from, so the
				// snapshot is READ FIRST and undo replays it (FR-031a).
				recurrence
					.snapshotRule(rule.id)
					.then(async snapshot => {
						await recurrence.deleteRuleCascade(rule.id);
						reload();
						reminders.sync();
						if (!snapshot) {
							return;
						}
						undo.offer({
							message: t('undo.seriesRemoved', { title: rule.title }),
							undo: async () => {
								await recurrence.restoreRule(snapshot);
								reload();
								reminders.sync();
							},
							// Nothing to finalise: the rows are already gone.
							commit: async () => undefined,
						});
					})
					.catch(reload);
				return;
			}

			const previousEnd = rule.endDate;
			const cutoff = addDays(from, -1);
			// Never moves an end date FORWARD. Deleting from a past day of a series
			// that already ended would otherwise revive the days in between.
			const nextEnd =
				previousEnd !== null && compareDate(previousEnd, cutoff) < 0
					? previousEnd
					: cutoff;

			recurrence
				.updateRule(rule.id, { endDate: nextEnd })
				.then(() => {
					reload();
					reminders.sync();
					undo.offer({
						message: t('undo.seriesDeleted', { title: rule.title }),
						undo: async () => {
							await recurrence.updateRule(rule.id, { endDate: previousEnd });
							reload();
							reminders.sync();
						},
						commit: async () => undefined,
					});
				})
				.catch(reload);
		},
		[recurrence, reload, undo, reminders],
	);

	/**
	 * Delete is immediate, with undo instead of a confirmation step (FR-011).
	 *
	 * Soft delete is what makes both halves true at once: the row leaves every
	 * read straight away, the write is already on disk (FR-046), and undo is a
	 * restore rather than a rebuild from memory.
	 */
	const deleteTask = useCallback(
		(task: Task) => {
			closeOverlay();
			repository
				.softDelete(task.id)
				.then(() => {
					reload();
					undo.offer({
						message: t('undo.deleted', { title: task.title }),
						undo: async () => {
							await repository.restore(task.id);
							reload();
							// Reminders are derived data, so putting the record back and
							// re-deriving IS restoring them (FR-011a, T060).
							reminders.sync();
						},
						commit: async () => {
							await repository.purge(task.id);
							reminders.sync();
						},
					});
				})
				.catch(reload);
		},
		[repository, reload, undo, closeOverlay, reminders],
	);

	const handleAction = useCallback(
		(item: TimelineItem, action: RowAction) => {
			closeOverlay();
			switch (action) {
				case 'move':
					// Both kinds open the same sheet; only the date field differs. A
					// session's date is decided by its rule's repeat pattern, so for one
					// of those this is the đổi-giờ sheet and nothing more (FR-018b).
					setOverlay({
						kind: 'shift',
						item,
						mode: item.source.kind === 'occurrence' ? 'time' : 'move',
					});
					break;
				case 'edit':
					// A session has no record of its own, so "Sửa" edits the series it
					// belongs to — and says so on the sheet it opens (change.md §4).
					if (item.source.kind === 'occurrence') {
						withRule(item, rule => setOverlay({ kind: 'seriesForm', rule }));
					} else {
						withTask(item, task => setOverlay({ kind: 'form', task }));
					}
					break;
				case 'skip':
					skipOccurrence(item);
					break;
				case 'delete':
					if (item.source.kind === 'occurrence') {
						// Never immediate, unlike a one-off task: undo cannot be the only
						// safeguard on something that removes a hundred future sessions,
						// so this one asks first and names the number (change.md §1).
						withRule(item, setPendingDelete);
					} else {
						withTask(item, deleteTask);
					}
					break;
			}
		},
		[deleteTask, withTask, withRule, skipOccurrence, closeOverlay],
	);

	const applyShift = useCallback(
		(item: TimelineItem, next: { taskDate: string; startTime: LocalTime }) => {
			closeOverlay();
			// Same rule as the drag path: the span moves, it does not stretch.
			const shifted = withStartTime(item, next.startTime);

			// A session's new time still has to pass the apply-scope sheet, so this
			// route and the drag reach the same decision (FR-026).
			if (item.source.kind === 'occurrence') {
				askScope(item, shifted);
				return;
			}

			repository
				.update(item.source.taskId, { taskDate: next.taskDate, ...shifted })
				.then(() => {
					// Follow the task if it left the day being viewed, for the same
					// reason saving does (design/ia §5 F-2).
					if (next.taskDate !== date) {
						goTo(() => next.taskDate);
					} else {
						reload();
					}
				})
				.catch(reload);
		},
		[repository, reload, date, closeOverlay, goTo, askScope],
	);

	const handleSaved = useCallback(
		(savedDate: string) => {
			closeOverlay();
			// Reminders are derived, so every write only has to ask for a re-derive.
			reminders.sync();
			// Follow the record if it landed on another day — otherwise the user
			// saves something and appears to lose it (design/ia §5 F-2).
			if (savedDate !== date) {
				goTo(() => savedDate);
			} else {
				reload();
			}
		},
		[closeOverlay, date, reload, reminders, goTo],
	);

	const openSettings = useCallback(
		() => navigation.navigate('Settings'),
		[navigation],
	);

	const openCreate = useCallback(() => setOverlay({ kind: 'form' }), []);
	const openEdit = useCallback(
		(item: TimelineItem) => {
			if (item.source.kind === 'occurrence') {
				withRule(item, rule => setOverlay({ kind: 'seriesForm', rule }));
				return;
			}
			withTask(item, task => setOverlay({ kind: 'form', task }));
		},
		[withTask, withRule],
	);
	const openActions = useCallback(
		(item: TimelineItem) => setOverlay({ kind: 'actions', item }),
		[],
	);
	const openCalendar = useCallback(() => setOverlay({ kind: 'calendar' }), []);
	const createSwipe = useCreateSwipe({ onCreate: openCreate });

	return (
		<SafeAreaView style={styles.screen} edges={['top']}>
			<DayBar
				date={date}
				label={dayLabel(date)}
				onPrevious={goPrevious}
				onNext={goNext}
				onToday={goToday}
				onOpenCalendar={openCalendar}
				onOpenSettings={openSettings}
			/>

			{/* In the flow, directly under the day bar — not a modal. The state is
          still true tomorrow, so there is nothing to dismiss (FR-039). */}
			{reminders.notification === 'denied' ? (
				<ErrorState
					title={t('permission.deniedTitle')}
					body={t('permission.deniedBody')}
					retryLabel={t('permission.openSettings')}
					onRetry={() => {
						reminders.openSettings('notifications').catch(() => undefined);
					}}
				/>
			) : null}

			<GestureDetector gesture={swipe.gesture}>
				<View style={styles.body}>
					{/* Wraps the day's content, not the gesture target: the swipe has to
              stay live while the transition is still running. */}
					<Animated.View style={[plain.fill, dayStyle]}>
						{state.status === 'loading' ? (
							<SkeletonGroup>
								<View style={styles.skeletonList}>
									{SKELETON_ROWS.map(key => (
										<Skeleton key={key} height={ROW_MIN_HEIGHT.oneLabel} />
									))}
								</View>
								{state.slow ? (
									<Text style={styles.slow}>{t('timeline.loadingSlow')}</Text>
								) : null}
							</SkeletonGroup>
						) : null}

						{state.status === 'empty' ? (
							<EmptyState
								title={t('timeline.emptyTitle')}
								body={t('timeline.emptyBody')}
								actionLabel={t('timeline.newTask')}
								onAction={openCreate}
							/>
						) : null}

						{state.status === 'error' ? (
							<ErrorState
								title={t('timeline.errorTitle')}
								body={t('timeline.errorBody')}
								retryLabel={t('timeline.retry')}
								onRetry={reload}
								secondaryLabel={t('day.settings')}
								onSecondary={openSettings}
							/>
						) : null}

						{state.status === 'ready' ? (
							<FlatList
								data={state.items}
								keyExtractor={item => item.key}
								renderItem={({ item }) => (
									<TaskRow
										task={item}
										now={now}
										countdownMinutes={settings.countdownMinutes}
										onToggleStatus={toggleStatus}
										onRestoreSkipped={restoreSkipped}
										onOpen={openEdit}
										onMore={openActions}
										onShiftTime={shiftTime}
										remindersMayBeLate={
											reminders.exactAlarm.required &&
											!reminders.exactAlarm.granted
										}
										swipeRef={swipe.ref}
									/>
								)}
								contentContainerStyle={styles.listContent}
								// The clock is not part of `data`, so the list is told
								// explicitly that a tick invalidates the rendered rows —
								// otherwise the countdown freezes on whatever it first drew.
								extraData={now}
								// No entrance animations, no shadows: the list has to hold
								// 60 FPS on a low-end device (SC-006).
								removeClippedSubviews
							/>
						) : null}
					</Animated.View>
				</View>
			</GestureDetector>

			{/* The bar is the swipe target as well as the button — see
          useCreateSwipe for why the gesture stops at this edge. */}
			<GestureDetector gesture={createSwipe}>
				<View style={styles.actionBar}>
					<Pressable
						accessibilityRole="button"
						accessibilityLabel={t('timeline.newTask')}
						accessibilityHint={t('timeline.newTaskSwipeHint')}
						onPress={openCreate}
						style={styles.action}>
						<Text style={styles.actionLabel}>{t('timeline.newTask')}</Text>
					</Pressable>
					{/* Android draws its back/gesture bar over the app, so the label has
              to be lifted clear of it while the fill stays edge-to-edge. */}
					<View style={{ height: insets.bottom }} />
				</View>
			</GestureDetector>

			{overlay.kind === 'form' ? (
				<TaskFormSheet
					task={overlay.task}
					viewingDate={date}
					onSaved={handleSaved}
					onClose={closeOverlay}
				/>
			) : null}

			{overlay.kind === 'seriesForm' ? (
				<TaskFormSheet
					rule={overlay.rule}
					viewingDate={date}
					onSaved={handleSaved}
					onClose={closeOverlay}
				/>
			) : null}

			{overlay.kind === 'actions' ? (
				<RowActionsSheet
					title={overlay.item.title}
					isOccurrence={overlay.item.source.kind === 'occurrence'}
					onAction={action => handleAction(overlay.item, action)}
					onClose={closeOverlay}
				/>
			) : null}

			{pendingDelete ? (
				<DeleteSeriesSheet
					rule={pendingDelete}
					from={today()}
					onConfirm={() => endSeries(pendingDelete)}
					onCancel={() => setPendingDelete(null)}
				/>
			) : null}

			{pendingScope ? (
				<ScopeSheet
					rule={pendingScope.rule}
					date={pendingScope.date}
					title={pendingScope.title}
					onChoose={applyScope}
					onCancel={() => setPendingScope(null)}
				/>
			) : null}

			{overlay.kind === 'shift' ? (
				<TimeShiftSheet
					subject={overlay.item}
					mode={overlay.mode}
					onApply={next => applyShift(overlay.item, next)}
					onClose={closeOverlay}
				/>
			) : null}

			{overlay.kind === 'calendar' ? (
				<DatePickerSheet
					selected={date}
					firstDayOfWeek={settings.firstDayOfWeek}
					onSelect={next => {
						goTo(() => next);
						closeOverlay();
					}}
					onClose={closeOverlay}
				/>
			) : null}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create(raw => {
	const theme = appTheme(raw);
	return {
		screen: {
			flex: 1,
			backgroundColor: theme.color.background,
		},
		body: {
			flex: 1,
		},
		skeletonList: {
			padding: theme.spacing.md,
			gap: theme.spacing.sm,
		},
		slow: {
			...theme.typography.label,
			color: theme.appColor.textMuted,
			paddingHorizontal: theme.spacing.md,
		},
		listContent: {
			paddingBottom: LIST_BOTTOM_PADDING,
		},
		actionBar: {
			backgroundColor: theme.appColor.accentFill,
		},
		action: {
			minHeight: BAR_HEIGHT.action,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: theme.spacing.md,
		},
		actionLabel: {
			...theme.typography.body,
			color: theme.appColor.onAccent,
			fontWeight: '800',
		},
	};
});
