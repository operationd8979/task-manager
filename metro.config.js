const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
	resolver: {
		/**
		 * Keep Metro's file watcher out of the native build directories.
		 *
		 * Gradle writes and then deletes CMake scratch folders under
		 * `node_modules/<pkg>/android/.cxx/**` while it compiles. Metro's fallback
		 * watcher on Windows walks into one, calls `fs.watch` on it, and the
		 * directory is already gone by the time the call lands — an ENOENT thrown
		 * from `node:internal/fs/watchers` that nothing catches, so the whole dev
		 * server dies mid-bundle. Building while Metro is running is the ordinary
		 * case, not an unusual one, so the watcher has to be told that these paths
		 * are not source.
		 *
		 * A bare RegExp rather than metro-config's `exclusionList` helper, which
		 * this version no longer exports; `blockList` takes one directly. Both
		 * separators are in the character class because Metro matches against
		 * whatever the platform hands it, and on Windows that is backslashes.
		 */
		blockList: /[\\/]android[\\/]\.cxx[\\/]/,
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
