/**
 * Unistyles configuration. This module MUST be imported before the first
 * component that consumes a style renders — see index.js. Getting the order
 * wrong produces an app that renders with no styling and no error.
 */
import { StyleSheet } from 'react-native-unistyles';
import { createUnistylesConfig } from '@chipmobilesdk/rn-theme';

import { themeConfig } from './config';

const unistylesConfig = createUnistylesConfig(
	themeConfig,
	// Boot following the system; the stored preference, "Tự động" included, is
	// applied with `applyDisplayMode` (theme/mode.ts) once settings have been
	// read. `adaptiveThemes` and `initialTheme` cannot be combined — the
	// package rejects that.
	{ adaptiveThemes: true },
);

type AppThemes = typeof unistylesConfig.themes;
type AppBreakpoints = typeof unistylesConfig.breakpoints;

/**
 * The only augmentation of Unistyles in the app: the package no longer ships
 * one. Every stylesheet's `theme` is therefore the configured theme, app
 * extensions included, with no cast.
 */
declare module 'react-native-unistyles' {
	export interface UnistylesThemes extends AppThemes {}
	export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure(unistylesConfig);
