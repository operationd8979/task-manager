import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {SettingsScreen} from '../../features/settings';
import {TimelineScreen} from '../../features/timeline';
import {ROUTES, type RootStackParamList} from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * No bottom tabs on purpose: beyond the timeline there are only two
 * destinations, and a tab bar would spend ~49pt of vertical space permanently
 * on screens the user rarely opens. Recorded in the plan's Complexity Tracking.
 */
export function RootStack() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.timeline}
      screenOptions={{
        // Headers are drawn by the screens themselves: the timeline's day bar
        // is an interactive control, not a title.
        headerShown: false,
        // Stated rather than left to the platform default so Cài đặt arrives
        // from the same edge on both, and so the direction says where it sits
        // relative to the timeline. Native-driven, so it costs the JS thread
        // nothing (SC-006).
        animation: 'slide_from_right',
        animationDuration: 220,
        // Android's back gesture should feel like the same movement in reverse
        // rather than an instant cut.
        gestureEnabled: true,
      }}>
      <Stack.Screen name={ROUTES.timeline} component={TimelineScreen} />
      <Stack.Screen name={ROUTES.settings} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
