import type {
	DatabaseHandle,
	StorableValue,
	StoredRecord,
} from '@chipmobilesdk/rn-local-db';

import type {
	NewRecurringRule,
	RecurrenceFrequency,
	RecurrenceOverride,
	RecurringRule,
	TimeSegment,
} from '../../domain/recurrence';
import { isReminderOffset, type ReminderOffset } from '../../domain/reminder';
import type { TaskStatus } from '../../domain/task';
import { isLocalDate, isLocalTime, type LocalDate, type LocalTime, type Weekday } from '../../lib/date';
import { COLLECTION } from './schema';
import { toDataError } from './errors';

interface RuleRow {
	title: string;
	note: string | null;
	startDate: string;
	endDate: string | null;
	/** Sorted weekday numbers joined with commas — see data-model.md §2.2. */
	daysOfWeek: string;
	frequency: string;
	/** Sorted day-of-month numbers joined with commas, e.g. "1,15". */
	daysOfMonth: string;
	defaultStartTime: string;
	defaultEndTime: string | null;
	/** "until|start|end" triples joined with semicolons; empty when unedited. */
	timeHistory: string;
	reminderEnabled: boolean;
	reminderOffsetMinutes: number;
	[key: string]: StorableValue;
}

/** Only the keys actually present are written; absence carries meaning. */
export type OverridePatch = Partial<
	Omit<RecurrenceOverride, 'ruleId' | 'occurrenceDate'>
>;

/** A whole series and its per-session edits, as one restorable unit. */
export interface RuleSnapshot {
	rule: RecurringRule;
	overrides: readonly RecurrenceOverride[];
}

export interface RecurrenceRepository {
	listRulesEffectiveOn(date: LocalDate): Promise<RecurringRule[]>;
	findRule(id: string): Promise<RecurringRule | null>;
	createRule(input: NewRecurringRule): Promise<RecurringRule>;
	updateRule(id: string, patch: Partial<NewRecurringRule>): Promise<RecurringRule>;
	/** Removes the rule AND its overrides in one transaction. */
	deleteRuleCascade(id: string): Promise<void>;
	/**
	 * Everything `deleteRuleCascade` would remove, read before it runs.
	 *
	 * A series is deleted outright rather than soft-deleted, so undo has nothing
	 * on disk to restore from — this is what it restores from instead. Null when
	 * the rule is already gone.
	 */
	snapshotRule(id: string): Promise<RuleSnapshot | null>;
	/** Puts a snapshot back under its original ids, so references still hold. */
	restoreRule(snapshot: RuleSnapshot): Promise<void>;

	listOverridesOn(date: LocalDate): Promise<RecurrenceOverride[]>;
	findOverride(
		ruleId: string,
		date: LocalDate,
	): Promise<RecurrenceOverride | null>;
	upsertOverride(
		ruleId: string,
		date: LocalDate,
		patch: OverridePatch,
	): Promise<void>;
	clearOverride(ruleId: string, date: LocalDate): Promise<void>;

	/** Whole-collection reads, for rebuilding the reminder schedule (FR-041). */
	listAllRules(): Promise<RecurringRule[]>;
	listAllOverrides(): Promise<RecurrenceOverride[]>;
	/** How many series exist. Each counts as one thing the user created. */
	countAllRules(): Promise<number>;
}

/**
 * The override id carries its own uniqueness key.
 *
 * "At most one override per occurrence" (FR-028) becomes something that cannot
 * be expressed wrongly, rather than something a check-then-write has to defend
 * — and check-then-write has a gap between the two halves.
 */
function overrideId(ruleId: string, date: LocalDate): string {
	return `${ruleId}:${date}`;
}

export function createRecurrenceRepository(
	handle: DatabaseHandle,
): RecurrenceRepository {
	const rules = handle.collection<RuleRow>(COLLECTION.rules);
	const overrides = handle.collection(COLLECTION.overrides);

	return {
		async listRulesEffectiveOn(date) {
			try {
				// Filtered by date range only; the weekday test belongs to the domain
				// and is not something the index can answer.
				const page = await rules.list({
					filter: { op: 'lte', field: 'startDate', value: date },
					page: { size: 500 },
				});
				return page.records
					.map(toRule)
					.filter(r => r.endDate === null || r.endDate >= date);
			} catch (error) {
				throw toDataError(error, 'recurrence.listRulesEffectiveOn');
			}
		},

		async findRule(id) {
			try {
				const record = await rules.find(id);
				return record ? toRule(record) : null;
			} catch (error) {
				throw toDataError(error, 'recurrence.findRule');
			}
		},

		async createRule(input) {
			const id = newId('r');
			try {
				await rules.insert({ id, data: toRuleRow(input) });
				return { id, ...input };
			} catch (error) {
				throw toDataError(error, 'recurrence.createRule');
			}
		},

		async updateRule(id, patch) {
			try {
				const current = toRule(await rules.get(id));
				const next = { ...current, ...patch };
				await rules.update(id, { data: toRuleRow(next) });
				return next;
			} catch (error) {
				throw toDataError(error, 'recurrence.updateRule');
			}
		},

		async deleteRuleCascade(id) {
			try {
				// One transaction, not two calls: a half-applied delete leaves orphan
				// overrides that surface nowhere but skew every later count.
				await handle.transaction(async tx => {
					const page = await tx.collection(COLLECTION.overrides).list({
						filter: { op: 'eq', field: 'ruleId', value: id },
						page: { size: 500 },
					});
					for (const record of page.records) {
						await tx.collection(COLLECTION.overrides).delete(record.id);
					}
					await tx.collection(COLLECTION.rules).delete(id);
				});
			} catch (error) {
				throw toDataError(error, 'recurrence.deleteRuleCascade');
			}
		},

		async snapshotRule(id) {
			try {
				const record = await rules.find(id);
				if (!record) {
					return null;
				}
				const page = await overrides.list({
					filter: { op: 'eq', field: 'ruleId', value: id },
					page: { size: 500 },
				});
				return { rule: toRule(record), overrides: page.records.map(toOverride) };
			} catch (error) {
				throw toDataError(error, 'recurrence.snapshotRule');
			}
		},

		async restoreRule(snapshot) {
			try {
				// One transaction, mirroring the delete: a rule restored without its
				// per-session edits is not the series the user had.
				await handle.transaction(async tx => {
					await tx.collection(COLLECTION.rules).insert({
						id: snapshot.rule.id,
						data: toRuleRow(snapshot.rule),
					});
					for (const override of snapshot.overrides) {
						await tx.collection(COLLECTION.overrides).upsert({
							id: overrideId(override.ruleId, override.occurrenceDate),
							data: toOverrideRow(override),
						});
					}
				});
			} catch (error) {
				throw toDataError(error, 'recurrence.restoreRule');
			}
		},

		async listOverridesOn(date) {
			try {
				const page = await overrides.list({
					filter: { op: 'eq', field: 'occurrenceDate', value: date },
					page: { size: 500 },
				});
				return page.records.map(toOverride);
			} catch (error) {
				throw toDataError(error, 'recurrence.listOverridesOn');
			}
		},

		async findOverride(ruleId, date) {
			try {
				const record = await overrides.find(overrideId(ruleId, date));
				return record ? toOverride(record) : null;
			} catch (error) {
				throw toDataError(error, 'recurrence.findOverride');
			}
		},

		async upsertOverride(ruleId, date, patch) {
			try {
				const existing = await overrides.find(overrideId(ruleId, date));
				const data: Record<string, StorableValue> = {
					...(existing?.data ?? {}),
					ruleId,
					occurrenceDate: date,
					isSkipped: patch.isSkipped ?? Boolean(existing?.data.isSkipped),
				};
				// Only keys actually present in the patch are written. Filling the rest
				// with undefined would erase the absent/null distinction (R7).
				for (const key of Object.keys(patch) as Array<keyof OverridePatch>) {
					if (key !== 'isSkipped') {
						data[key] = patch[key] as StorableValue;
					}
				}
				await overrides.upsert({ id: overrideId(ruleId, date), data });
			} catch (error) {
				throw toDataError(error, 'recurrence.upsertOverride');
			}
		},

		async listAllRules() {
			try {
				const page = await rules.list({ page: { size: 500 } });
				return page.records.map(toRule);
			} catch (error) {
				throw toDataError(error, 'recurrence.listAllRules');
			}
		},

		async listAllOverrides() {
			try {
				const page = await overrides.list({ page: { size: 500 } });
				return page.records.map(toOverride);
			} catch (error) {
				throw toDataError(error, 'recurrence.listAllOverrides');
			}
		},

		async countAllRules() {
			try {
				return await rules.count();
			} catch (error) {
				throw toDataError(error, 'recurrence.countAllRules');
			}
		},

		async clearOverride(ruleId, date) {
			try {
				await overrides.delete(overrideId(ruleId, date));
			} catch (error) {
				throw toDataError(error, 'recurrence.clearOverride');
			}
		},
	};
}

function encodeDays(days: readonly Weekday[]): string {
	return [...days].sort((a, b) => a - b).join(',');
}

function decodeDays(value: string): Weekday[] {
	return value
		.split(',')
		.map(Number)
		.filter((n): n is Weekday => n >= 1 && n <= 7);
}

function encodeNumbers(days: readonly number[]): string {
	return [...new Set(days)].sort((a, b) => a - b).join(',');
}

function decodeNumbers(value: string | undefined): number[] {
	if (!value) {
		return [];
	}
	return value
		.split(',')
		.map(Number)
		.filter(n => Number.isInteger(n) && n >= 1 && n <= 31);
}

const FREQUENCIES: readonly RecurrenceFrequency[] = [
	'weekly',
	'monthlyByDay',
	'monthlyLastDay',
];

/**
 * Falls back to 'weekly' rather than throwing.
 *
 * Every rule written before schema v2 repeats by weekday and has no such field,
 * so this is the migration's answer as well as the corruption one — a rule that
 * lost its frequency still draws on the days it always did, instead of taking
 * the whole timeline down with it.
 */
function asFrequency(value: string | undefined): RecurrenceFrequency {
	return FREQUENCIES.find(f => f === value) ?? 'weekly';
}

function encodeTimeHistory(history: readonly TimeSegment[]): string {
	return history
		.map(s => `${s.until}|${s.startTime}|${s.endTime ?? ''}`)
		.join(';');
}

/**
 * Every triple is validated and a malformed one is DROPPED, not guessed at.
 *
 * These values decide what time a past session is shown at. A half-parsed entry
 * would put a real session at an invented hour, which reads as the app having
 * silently moved it; falling back to the rule's current time is at least a time
 * the series genuinely uses.
 */
function decodeTimeHistory(value: string | undefined): TimeSegment[] {
	if (!value) {
		return [];
	}
	const out: TimeSegment[] = [];
	for (const part of value.split(';')) {
		const [until, startTime, endTime] = part.split('|');
		if (!isLocalDate(until ?? '') || !isLocalTime(startTime ?? '')) {
			continue;
		}
		out.push({
			until,
			startTime,
			endTime: endTime ? (isLocalTime(endTime) ? endTime : null) : null,
		});
	}
	return out;
}

function toRuleRow(rule: NewRecurringRule | RecurringRule): RuleRow {
	return {
		title: rule.title,
		note: rule.note,
		startDate: rule.startDate,
		endDate: rule.endDate,
		daysOfWeek: encodeDays(rule.daysOfWeek),
		frequency: rule.frequency,
		daysOfMonth: encodeNumbers(rule.daysOfMonth),
		defaultStartTime: rule.defaultStartTime,
		defaultEndTime: rule.defaultEndTime,
		timeHistory: encodeTimeHistory(rule.timeHistory),
		reminderEnabled: rule.reminderEnabled,
		reminderOffsetMinutes: rule.reminderOffsetMinutes,
	};
}

function toRule(record: StoredRecord<RuleRow>): RecurringRule {
	const { data } = record;
	return {
		id: record.id,
		title: data.title,
		note: data.note,
		startDate: data.startDate,
		endDate: data.endDate,
		daysOfWeek: decodeDays(data.daysOfWeek),
		frequency: asFrequency(data.frequency),
		daysOfMonth: decodeNumbers(data.daysOfMonth),
		defaultStartTime: data.defaultStartTime,
		defaultEndTime: data.defaultEndTime,
		timeHistory: decodeTimeHistory(data.timeHistory),
		reminderEnabled: Boolean(data.reminderEnabled),
		reminderOffsetMinutes: asOffset(data.reminderOffsetMinutes),
	};
}

/**
 * The inverse of `toOverride`: writes back ONLY the keys the override actually
 * carries. Filling the rest with null would turn "inherits from the rule" into
 * "deliberately has no value", which is the distinction R7 exists to protect.
 */
function toOverrideRow(
	override: RecurrenceOverride,
): Record<string, StorableValue> {
	const out: Record<string, StorableValue> = {
		ruleId: override.ruleId,
		occurrenceDate: override.occurrenceDate,
		isSkipped: override.isSkipped,
	};
	for (const key of OVERRIDE_VALUE_FIELDS) {
		if (key in override) {
			out[key] = override[key] as StorableValue;
		}
	}
	return out;
}

const OVERRIDE_VALUE_FIELDS = [
	'title',
	'note',
	'startTime',
	'endTime',
	'status',
	'reminderEnabled',
	'reminderOffsetMinutes',
] as const;

/**
 * Rebuilds the override with ONLY the keys the record actually holds, so the
 * absent/present distinction survives the round trip.
 */
function toOverride(record: StoredRecord): RecurrenceOverride {
	const d = record.data;
	const out: RecurrenceOverride = {
		ruleId: String(d.ruleId),
		occurrenceDate: String(d.occurrenceDate),
		isSkipped: Boolean(d.isSkipped),
	};
	if ('title' in d) {
		out.title = d.title as string;
	}
	if ('note' in d) {
		out.note = d.note as string | null;
	}
	if ('startTime' in d) {
		out.startTime = d.startTime as LocalTime;
	}
	if ('endTime' in d) {
		out.endTime = d.endTime as LocalTime | null;
	}
	if ('status' in d) {
		out.status = d.status as TaskStatus;
	}
	if ('reminderEnabled' in d) {
		out.reminderEnabled = Boolean(d.reminderEnabled);
	}
	if ('reminderOffsetMinutes' in d) {
		out.reminderOffsetMinutes = asOffset(Number(d.reminderOffsetMinutes));
	}
	return out;
}

function asOffset(value: number): ReminderOffset {
	return isReminderOffset(value) ? value : 0;
}

function newId(prefix: string): string {
	return `${prefix}_${Date.now().toString(36)}_${Math.random()
		.toString(36)
		.slice(2, 10)}`;
}
