import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LandingScreen from '../screens/S00_LandingScreen';
import FarmIDEntryScreen from '../screens/S01_FarmIDEntryScreen';
import FarmConfirmationScreen from '../screens/S02_FarmConfirmationScreen';
import WalkBoundaryScreen from '../screens/S03_WalkBoundaryScreen';
import SatelliteAnalysisScreen from '../screens/S04_SatelliteAnalysisScreen';
import ReviewPolygonScreen from '../screens/S05_ReviewPolygonScreen';
import OfflineSavedScreen from '../screens/S06_OfflineSavedScreen';
import SubmittedScreen from '../screens/S07_SubmittedScreen';
import QueueListScreen from '../screens/S08_QueueListScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FDF8F3' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Landing"
        component={LandingScreen}
        options={{ animation: 'fade', contentStyle: { backgroundColor: '#0d0803' } }}
      />
      <Stack.Screen name="FarmIDEntry" component={FarmIDEntryScreen} />
      <Stack.Screen name="FarmConfirmation" component={FarmConfirmationScreen} />
      <Stack.Screen name="WalkBoundary" component={WalkBoundaryScreen} />
      <Stack.Screen name="SatelliteAnalysis" component={SatelliteAnalysisScreen} />
      <Stack.Screen name="ReviewPolygon" component={ReviewPolygonScreen} />
      <Stack.Screen name="OfflineSaved" component={OfflineSavedScreen} />
      <Stack.Screen name="Submitted" component={SubmittedScreen} />
      <Stack.Screen name="QueueList" component={QueueListScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;
