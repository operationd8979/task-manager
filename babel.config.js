module.exports = {
	presets: ['module:@react-native/babel-preset'],
	plugins: [
		// Unistyles 3 processes every file under `root` at build time so themed
		// styles resolve without a render-time context lookup. `root` is required
		// from RC.5 onward.
		['react-native-unistyles/plugin', { root: 'src' }],
		// Reanimated 4 ships its Babel plugin from react-native-worklets.
		// It MUST stay last: it rewrites function bodies and expects to run after
		// every other transform.
		'react-native-worklets/plugin',
	],
};
