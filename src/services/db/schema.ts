import type { CollectionSchema, Migration } from '@chipmobilesdk/rn-local-db';

/**
 * Collection names. Named constants rather than inline strings so a typo is a
 * compile error instead of a query against a collection that does not exist.
 */
export const COLLECTION = {
	tasks: 'tasks',
	rules: 'recurring_rules',
	overrides: 'recurrence_overrides',
	settings: 'app_settings',
	errorLog: 'error_log',
} as const;

/** Hard cap on the local diagnostic log (FR-055b). */
export const ERROR_LOG_LIMIT = 500;

export const SCHEMA_VERSION = 2;

/**
 * The chain must be CONTIGUOUS FROM 1 to schemaVersion — a database declaring
 * version 1 with no migrations is rejected at open time with
 * MIGRATION_CONFIG_INVALID, not accepted as "nothing to migrate".
 *
 * Version 1 therefore exists and does nothing: collections are created from the
 * declarations above, so the first version has no work to do. It is here so the
 * chain has a starting point that later versions can build on.
 */
export const MIGRATIONS: Migration[] = [
	{
		version: 1,
		migrate: async () => {
			// Intentionally empty — see the note above.
		},
	},
	{
		/**
		 * Monthly recurrence and the per-series time history (change.md §2, §4).
		 *
		 * Deliberately empty, and that IS the migration.
		 *
		 * A migration context can insert, upsert, find and delete by id — it
		 * cannot enumerate a collection, so there is no supported way to walk
		 * every rule and rewrite it here. It does not need one: undeclared and
		 * absent fields both read back as undefined, and the rule decoder already
		 * answers that with 'weekly', no days of the month, and no time history —
		 * which is exactly what every rule written before this version was. The
		 * new keys land on each rule the next time it is written.
		 *
		 * This holds only while nothing QUERIES the new fields. Filtering on
		 * `frequency` in a repository read would silently miss every pre-v2 rule,
		 * and would need a real backfill through the adapter's `execute` first.
		 */
		version: 2,
		migrate: async () => {
			// Intentionally empty — see the note above.
		},
	},
];

/**
 * Declaring a field makes it queryable; undeclared fields are still stored and
 * returned faithfully. Override patch fields are deliberately declared so they
 * can be filtered with `exists`, which is what keeps "absent" distinguishable
 * from "null" (data-model.md §1).
 */
export const COLLECTIONS: CollectionSchema[] = [
	{
		name: COLLECTION.tasks,
		fields: [
			{ name: 'title', type: 'string' },
			{ name: 'note', type: 'string', nullable: true },
			{ name: 'taskDate', type: 'string' },
			{ name: 'startTime', type: 'string' },
			{ name: 'endTime', type: 'string', nullable: true },
			{ name: 'status', type: 'string' },
			{ name: 'reminderEnabled', type: 'boolean' },
			{ name: 'reminderOffsetMinutes', type: 'number' },
		],
		indexes: [
			// The timeline's main read. Sort order comes from the index, so a day is
			// never re-sorted in JavaScript (SC-004).
			{ name: 'tasks_by_date_start', fields: ['taskDate', 'startTime'] },
			{ name: 'tasks_by_reminder', fields: ['reminderEnabled', 'taskDate'] },
		],
		// Soft delete IS the undo mechanism (research.md R11), not an optimisation.
		softDelete: true,
		timestamps: true,
	},
	{
		name: COLLECTION.rules,
		fields: [
			{ name: 'title', type: 'string' },
			{ name: 'note', type: 'string', nullable: true },
			{ name: 'startDate', type: 'string' },
			{ name: 'endDate', type: 'string', nullable: true },
			// Sorted weekday numbers joined with commas, e.g. "1,3,5". The field type
			// set has no array; the domain layer exposes Weekday[] and the encoding
			// stays inside the data layer (data-model.md §2.2).
			{ name: 'daysOfWeek', type: 'string' },
			// How the rule picks its dates: 'weekly', 'monthlyByDay' or
			// 'monthlyLastDay'. Only one of daysOfWeek / daysOfMonth is read, and
			// this field is what says which (data-model.md §2.2).
			{ name: 'frequency', type: 'string' },
			// Sorted day-of-month numbers joined with commas, e.g. "1,15". Empty
			// for every frequency but 'monthlyByDay'.
			{ name: 'daysOfMonth', type: 'string' },
			{ name: 'defaultStartTime', type: 'string' },
			{ name: 'defaultEndTime', type: 'string', nullable: true },
			// Times this series used to run at, oldest first, encoded as
			// "until|start|end" triples joined with semicolons. Empty until the
			// user edits a series' time, which is the only thing that writes it.
			{ name: 'timeHistory', type: 'string' },
			{ name: 'reminderEnabled', type: 'boolean' },
			{ name: 'reminderOffsetMinutes', type: 'number' },
		],
		indexes: [{ name: 'rules_by_range', fields: ['startDate', 'endDate'] }],
		softDelete: true,
		timestamps: true,
	},
	{
		name: COLLECTION.overrides,
		fields: [
			{ name: 'ruleId', type: 'string' },
			{ name: 'occurrenceDate', type: 'string' },
			{ name: 'isSkipped', type: 'boolean' },
			// Every field below may be ABSENT (inherit from the rule) or present and
			// null (this occurrence deliberately has no value). Both states must
			// survive a write-and-read cycle.
			{ name: 'title', type: 'string', nullable: true },
			{ name: 'note', type: 'string', nullable: true },
			{ name: 'startTime', type: 'string', nullable: true },
			{ name: 'endTime', type: 'string', nullable: true },
			{ name: 'status', type: 'string', nullable: true },
			{ name: 'reminderEnabled', type: 'boolean', nullable: true },
			{ name: 'reminderOffsetMinutes', type: 'number', nullable: true },
		],
		indexes: [
			{ name: 'ovr_by_rule_date', fields: ['ruleId', 'occurrenceDate'] },
			{ name: 'ovr_by_date', fields: ['occurrenceDate'] },
		],
		timestamps: true,
	},
	{
		name: COLLECTION.settings,
		fields: [{ name: 'value', type: 'string' }],
	},
	{
		name: COLLECTION.errorLog,
		fields: [
			{ name: 'at', type: 'timestamp' },
			{ name: 'code', type: 'string' },
			{ name: 'operation', type: 'string' },
			{ name: 'recordId', type: 'string', nullable: true },
		],
		indexes: [{ name: 'log_by_at', fields: ['at'] }],
		timestamps: true,
	},
];
