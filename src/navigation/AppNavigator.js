import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

// ── Auth screens ──────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Farmer screens ────────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import FarmsListScreen from '../screens/FarmsListScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WalletScreen from '../screens/WalletScreen';

// ── Shared detail screens ─────────────────────────────────────────────────────
import FarmDetailScreen from '../screens/FarmDetailScreen';
import ParcelDetailScreen from '../screens/ParcelDetailScreen';
import ComplianceScreen from '../screens/ComplianceScreen';

// ── Polygon capture flow (S00–S08) ────────────────────────────────────────────
import LandingScreen from '../screens/S00_LandingScreen';
import FarmIDEntryScreen from '../screens/S01_FarmIDEntryScreen';
import FarmConfirmationScreen from '../screens/S02_FarmConfirmationScreen';
import WalkBoundaryScreen from '../screens/S03_WalkBoundaryScreen';
import AddFarmScreen from '../screens/S04_AddFarmScreen';
import ReviewPolygonScreen from '../screens/S05_ReviewPolygonScreen';
import OfflineSavedScreen from '../screens/S06_OfflineSavedScreen';
import SubmittedScreen from '../screens/S07_SubmittedScreen';
import QueueListScreen from '../screens/S08_QueueListScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOpts = {
  headerShown: false,
  contentStyle: { backgroundColor: C.steel100 },
  animation: 'slide_from_right',
};

const tabBarStyle = {
  backgroundColor: C.white,
  borderTopColor: C.steel200,
  borderTopWidth: 1,
  height: 62,
  paddingBottom: 8,
  paddingTop: 6,
};

// ── Polygon capture stack ─────────────────────────────────────────────────────
function CaptureStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen
        name="CaptureLanding"
        component={LandingScreen}
        options={{ animation: 'fade', contentStyle: { backgroundColor: '#0d0803' } }}
      />
      <Stack.Screen name="FarmIDEntry"       component={FarmIDEntryScreen} />
      <Stack.Screen name="FarmConfirmation"  component={FarmConfirmationScreen} />
      <Stack.Screen name="AddFarm"           component={AddFarmScreen} />
      <Stack.Screen name="WalkBoundary"      component={WalkBoundaryScreen} />
      <Stack.Screen name="ReviewPolygon"     component={ReviewPolygonScreen} />
      <Stack.Screen name="OfflineSaved"      component={OfflineSavedScreen} />
      <Stack.Screen name="Submitted"         component={SubmittedScreen} />
      <Stack.Screen name="QueueList"         component={QueueListScreen} />
    </Stack.Navigator>
  );
}

// ── Farmer tab navigator ──────────────────────────────────────────────────────
function FarmerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.c700,
        tabBarInactiveTintColor: C.subtle,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard:  focused ? 'grid'               : 'grid-outline',
            Farms:      focused ? 'leaf'               : 'leaf-outline',
            Deliveries: focused ? 'cube'               : 'cube-outline',
            Compliance: focused ? 'shield-checkmark'   : 'shield-checkmark-outline',
            Wallet:     focused ? 'wallet'             : 'wallet-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      {/* Dashboard */}
      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Dashboard' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="HomeMain"     component={HomeScreen} />
            <Stack.Screen name="Wallet"       component={WalletScreen} />
            <Stack.Screen name="Profile"      component={ProfileScreen} />
            <Stack.Screen name="FarmDetail"   component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
            <Stack.Screen name="QueueList"    component={QueueListScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* Farms — includes full capture flow accessible via FAB */}
      <Tab.Screen name="Farms" options={{ tabBarLabel: 'My Farms' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="FarmsList"      component={FarmsListScreen} />
            <Stack.Screen name="FarmDetail"     component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail"   component={ParcelDetailScreen} />
            {/* Capture flow accessible from FAB */}
            <Stack.Screen name="CaptureLanding" component={LandingScreen}
              options={{ animation: 'fade', contentStyle: { backgroundColor: '#0d0803' } }} />
            <Stack.Screen name="FarmIDEntry"    component={FarmIDEntryScreen} />
            <Stack.Screen name="FarmConfirmation" component={FarmConfirmationScreen} />
            <Stack.Screen name="AddFarm"        component={AddFarmScreen} />
            <Stack.Screen name="WalkBoundary"   component={WalkBoundaryScreen} />
            <Stack.Screen name="ReviewPolygon"  component={ReviewPolygonScreen} />
            <Stack.Screen name="OfflineSaved"   component={OfflineSavedScreen} />
            <Stack.Screen name="Submitted"      component={SubmittedScreen} />
            <Stack.Screen name="QueueList"      component={QueueListScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* Deliveries */}
      <Tab.Screen
        name="Deliveries"
        component={DeliveriesScreen}
        options={{ tabBarLabel: 'Deliveries' }}
      />

      {/* Compliance — KYC Documents + EUDR (matches web sidebar) */}
      <Tab.Screen name="Compliance" options={{ tabBarLabel: 'Compliance' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="ComplianceMain" component={ComplianceScreen} />
            <Stack.Screen name="FarmDetail"     component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail"   component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      {/* Wallet */}
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{ tabBarLabel: 'Wallet' }}
      />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {user ? (
          <RootStack.Screen name="Main" component={FarmerTabs} />
        ) : (
          <RootStack.Screen name="Auth">
            {() => (
              <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="Login"    component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </Stack.Navigator>
            )}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
});
