/**
 * Ads and payments ship on Android only (specs/002-ads-and-remove-ads FR-15,
 * plan D-12). Leaving the two bridges out of iOS autolinking keeps the iOS
 * binary exactly as it was: Google Mobile Ads aborts an iOS launch that has no
 * app id configured, and nothing on iOS calls either bridge.
 */
module.exports = {
	dependencies: {
		'react-native-google-mobile-ads': { platforms: { ios: null } },
		'react-native-iap': { platforms: { ios: null } },
	},
};
