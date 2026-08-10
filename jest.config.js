module.exports = {
	preset: '@react-native/jest-preset',
	setupFiles: ['<rootDir>/jest.setup.js'],
	// The React Native ecosystem ships untranspiled ESM. Without this, any test
	// that reaches a native package fails to parse rather than to assert.
	transformIgnorePatterns: [
		'node_modules/(?!(' +
		[
			'react-native',
			'@react-native',
			'@react-navigation',
			'react-native-unistyles',
			'react-native-gesture-handler',
			'react-native-reanimated',
			'react-native-worklets',
			'react-native-screens',
			'react-native-safe-area-context',
			'@gorhom',
			'@notifee',
			'@chipmobilesdk',
			'@op-engineering',
			'@dr.pogodin',
		].join('|') +
		')/)',
	],
};
