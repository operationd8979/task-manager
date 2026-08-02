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
      // Headers are drawn by the screens themselves: the timeline's day bar is
      // an interactive control, not a title.
      screenOptions={{headerShown: false}}>
      <Stack.Screen name={ROUTES.timeline} component={TimelineScreen} />
      <Stack.Screen name={ROUTES.settings} component={SettingsScreen} />
    </Stack.Navigator>
  );
}
