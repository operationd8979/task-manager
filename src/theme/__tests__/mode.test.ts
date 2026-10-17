import {
	createDisplayModeApplier,
	themeFor,
	toOsColorScheme,
	type AppearanceApi,
	type OsColorScheme,
} from '../mode';

/** An `Appearance` whose system scheme and change events the test controls. */
function fakeAppearance(initial: OsColorScheme) {
	let current: OsColorScheme = initial;
	const listeners = new Set<(p: { colorScheme: OsColorScheme }) => void>();
	const api: AppearanceApi = {
		setColorScheme: jest.fn(),
		getColorScheme: () => current,
		addChangeListener: listener => {
			listeners.add(listener);
			return { remove: () => listeners.delete(listener) };
		},
	};
	return {
		api,
		/** What the OS reports after a change, e.g. the user toggling dark mode. */
		change(next: OsColorScheme) {
			current = next;
			listeners.forEach(listener => listener({ colorScheme: next }));
		},
		listenerCount: () => listeners.size,
	};
}

describe('display mode', () => {
	it('tells the OS a fixed scheme, or to follow the system for Tự động', () => {
		expect(toOsColorScheme('light')).toBe('light');
		expect(toOsColorScheme('dark')).toBe('dark');
		expect(toOsColorScheme('auto')).toBe('unspecified');
	});

	it('reads anything that is not dark as light', () => {
		expect(themeFor('dark')).toBe('dark');
		expect(themeFor('light')).toBe('light');
		expect(themeFor('unspecified')).toBe('light');
		expect(themeFor(null)).toBe('light');
	});

	it('forces the native layer to a fixed choice so the pickers match the app', () => {
		const os = fakeAppearance('dark');
		const setTheme = jest.fn();
		createDisplayModeApplier(os.api, setTheme)('light');

		expect(os.api.setColorScheme).toHaveBeenCalledWith('light');
		expect(setTheme).toHaveBeenCalledWith('light');
		// A fixed choice ignores the system from here on.
		os.change('light');
		os.change('dark');
		expect(setTheme).toHaveBeenCalledTimes(1);
	});

	it('follows the system on Tự động, including later changes', () => {
		const os = fakeAppearance('dark');
		const setTheme = jest.fn();
		createDisplayModeApplier(os.api, setTheme)('auto');

		expect(os.api.setColorScheme).toHaveBeenCalledWith('unspecified');
		expect(setTheme).toHaveBeenLastCalledWith('dark');
		os.change('light');
		expect(setTheme).toHaveBeenLastCalledWith('light');
	});

	/**
	 * The case that ruled out the theme package's adaptive mode: right after
	 * leaving Sáng, the OS still reports the forced light scheme, and the system's
	 * own dark only arrives as a change once the override is lifted.
	 */
	it('lands on the system scheme when coming back from a fixed choice', () => {
		const os = fakeAppearance('dark');
		const setTheme = jest.fn();
		const apply = createDisplayModeApplier(os.api, setTheme);

		apply('light');
		os.change('light'); // the override taking effect
		apply('auto');
		expect(setTheme).toHaveBeenLastCalledWith('light'); // still the forced value
		os.change('dark'); // the override lifted
		expect(setTheme).toHaveBeenLastCalledWith('dark');
	});

	it('never holds more than one listener', () => {
		const os = fakeAppearance('light');
		const apply = createDisplayModeApplier(os.api, jest.fn());
		apply('auto');
		apply('auto');
		expect(os.listenerCount()).toBe(1);
		apply('dark');
		expect(os.listenerCount()).toBe(0);
	});
});
