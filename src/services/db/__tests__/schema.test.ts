import { COLLECTIONS, MIGRATIONS, SCHEMA_VERSION } from '../schema';

/**
 * These encode the rules `openDatabase` enforces at runtime.
 *
 * They exist because breaking one of them produces a boot failure whose only
 * visible symptom is "Chưa đọc được dữ liệu" — no code, no field name, nothing
 * to act on. Catching it here turns a source-reading session into a red test.
 */
describe('database schema config', () => {
	it('has a migration for every version from 1 to schemaVersion', () => {
		// The package rejects a gap, and "no migrations at all" IS a gap: version 1
		// must exist even when it does nothing.
		const versions = new Set(MIGRATIONS.map(m => m.version));
		for (let v = 1; v <= SCHEMA_VERSION; v++) {
			expect(versions.has(v)).toBe(true);
		}
	});

	it('declares no migration beyond schemaVersion', () => {
		for (const migration of MIGRATIONS) {
			expect(migration.version).toBeLessThanOrEqual(SCHEMA_VERSION);
		}
	});

	it('has no duplicate migration versions', () => {
		const versions = MIGRATIONS.map(m => m.version);
		expect(new Set(versions).size).toBe(versions.length);
	});

	it('uses valid identifiers for collections and fields', () => {
		// Same shape the package validates against.
		const identifier = /^[A-Za-z][A-Za-z0-9_]{0,62}$/;
		for (const collection of COLLECTIONS) {
			expect(collection.name).toMatch(identifier);
			for (const field of collection.fields) {
				expect(field.name).toMatch(identifier);
			}
		}
	});

	it('indexes only fields the collection declares', () => {
		for (const collection of COLLECTIONS) {
			const declared = new Set(collection.fields.map(f => f.name));
			for (const index of collection.indexes ?? []) {
				expect(index.fields.length).toBeGreaterThan(0);
				for (const field of index.fields) {
					expect(declared.has(field)).toBe(true);
				}
			}
		}
	});

	it('has unique collection names', () => {
		const names = COLLECTIONS.map(c => c.name);
		expect(new Set(names).size).toBe(names.length);
	});

	it('keeps soft delete on the collections undo depends on', () => {
		// Undo is implemented as softDelete + restore (research.md R11); losing the
		// flag would make deletes irreversible without any other visible change.
		const tasks = COLLECTIONS.find(c => c.name === 'tasks');
		expect(tasks?.softDelete).toBe(true);
	});
});
