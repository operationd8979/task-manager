/**
 * The chosen language survives a restart (001 FR-058b).
 *
 * The double below has react-native-mmkv v4's shape — `createMMKV` and
 * `remove`, no `MMKV` class — so the v3 `new MMKV()` this module once called
 * fails here exactly as it did on devices, where it silently fell back to memory.
 */
const disk = new Map<string, Map<string, string>>();
const mockCreateMMKV = jest.fn((config: { id: string }) => {
	const file = disk.get(config.id) ?? new Map<string, string>();
	disk.set(config.id, file);
	return {
		getString: (key: string) => file.get(key),
		set: (key: string, value: string) => {
			file.set(key, value);
		},
		remove: (key: string) => file.delete(key),
	};
});
jest.mock('react-native-mmkv', () => ({ createMMKV: mockCreateMMKV }));

type StorageModule = typeof import('../storage');

/** A fresh copy of the module, as after an app restart. */
function launch(): StorageModule['localeStorage'] {
	let storage!: StorageModule;
	jest.isolateModules(() => {
		storage = require('../storage');
	});
	return storage.localeStorage;
}

describe('localeStorage (001 FR-058b)', () => {
	beforeEach(() => {
		disk.clear();
		mockCreateMMKV.mockClear();
	});

	it('keeps the chosen language across a restart', async () => {
		await launch().setItem('locale', 'ja-JP');
		await expect(launch().getItem('locale')).resolves.toBe('ja-JP');
		expect(mockCreateMMKV).toHaveBeenCalledWith(expect.objectContaining({ id: 'taskmanager.i18n' }));
	});

	it('forgets a removed choice across a restart', async () => {
		const first = launch();
		await first.setItem('locale', 'en-US');
		await first.removeItem('locale');
		await expect(launch().getItem('locale')).resolves.toBeNull();
	});
});
