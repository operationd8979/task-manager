const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Which build environment's ad units and payment mode get bundled
 * (specs/002-ads-and-remove-ads/plan.md D-2).
 *
 * Chosen by RESOLUTION, not by inlining an env var: Metro's transform cache is
 * keyed by file content, so an inlined value can survive a switch and bake the
 * wrong environment into a release bundle. A resolver runs on every bundle.
 */
const APP_ENV_FILE_SUFFIX = {
	development: null, // appEnv.ts itself
	test: 'testtrack',
	production: 'production',
};
const appEnv = process.env.APP_ENV || 'development';
if (!(appEnv in APP_ENV_FILE_SUFFIX)) {
	throw new Error(
		`APP_ENV must be one of ${Object.keys(APP_ENV_FILE_SUFFIX).join(', ')}; got "${appEnv}"`,
	);
}
const appEnvSuffix = APP_ENV_FILE_SUFFIX[appEnv];
const MONETIZATION_DIR = `${path.sep}services${path.sep}monetization${path.sep}`;

function resolveRequest(context, moduleName, platform) {
	if (
		appEnvSuffix !== null &&
		moduleName === './appEnv' &&
		context.originModulePath.includes(MONETIZATION_DIR)
	) {
		return context.resolveRequest(
			context,
			`./appEnv.${appEnvSuffix}`,
			platform,
		);
	}
	return context.resolveRequest(context, moduleName, platform);
}

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
		resolveRequest,
	},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
