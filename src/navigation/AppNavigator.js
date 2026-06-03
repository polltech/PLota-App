import React, { useRef, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated, Image, TouchableOpacity } from 'react-native';
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
import CaptureModeScreen from '../screens/CaptureModeScreen';
import CaptureImportScreen from '../screens/CaptureImportScreen';
import AdvancedScreen from '../screens/AdvancedScreen';
import ReviewFarmScreen from '../screens/ReviewFarmScreen';

// ── Cooperative Officer screens ───────────────────────────────────────────────
import CoopDashboardScreen from '../screens/CoopDashboardScreen';
import CoopFarmersScreen from '../screens/CoopFarmersScreen';
import CoopFarmsScreen from '../screens/CoopFarmsScreen';
import CoopDeliveriesScreen from '../screens/CoopDeliveriesScreen';
import CoopBatchesScreen from '../screens/CoopBatchesScreen';
import CoopConsignmentsScreen from '../screens/CoopConsignmentsScreen';
import BatchesScreen from '../screens/BatchesScreen';
import CreateDeliveryScreen from '../screens/CreateDeliveryScreen';
import DeliveryDetailScreen from '../screens/DeliveryDetailScreen';
import BatchDetailScreen from '../screens/BatchDetailScreen';
import ConsignmentsScreen from '../screens/ConsignmentsScreen';

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
      <Stack.Screen name="CaptureMode"       component={CaptureModeScreen} />
      <Stack.Screen name="CaptureImport"     component={CaptureImportScreen} />
      <Stack.Screen name="WalkBoundary"      component={WalkBoundaryScreen} />
      <Stack.Screen name="AdvancedCapture"   component={AdvancedScreen} />
      <Stack.Screen name="ReviewFarm"        component={ReviewFarmScreen} />
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
            <Stack.Screen name="FarmIDEntry"      component={FarmIDEntryScreen} />
            <Stack.Screen name="FarmConfirmation" component={FarmConfirmationScreen} />
            <Stack.Screen name="AddFarm"          component={AddFarmScreen} />
            <Stack.Screen name="CaptureMode"      component={CaptureModeScreen} />
            <Stack.Screen name="CaptureImport"    component={CaptureImportScreen} />
            <Stack.Screen name="WalkBoundary"     component={WalkBoundaryScreen} />
            <Stack.Screen name="AdvancedCapture"  component={AdvancedScreen} />
            <Stack.Screen name="ReviewFarm"       component={ReviewFarmScreen} />
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

// ── Splash loader ─────────────────────────────────────────────────────────────
function SplashLoader() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, useNativeDriver: true })
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={s.splash}>
      <Image source={require('../../assets/logo-plotra.png')} style={s.splashLogo} resizeMode="contain" />
      <Animated.View style={{ transform: [{ rotate }], marginTop: 32 }}>
        <Ionicons name="reload-outline" size={30} color={C.c700} />
      </Animated.View>
      <Text style={s.splashText}>Loading...</Text>
    </View>
  );
}

// ── Cooperative Officer tabs ──────────────────────────────────────────────────
function CoopTabs() {
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
            CoopHome:         focused ? 'grid'             : 'grid-outline',
            CoopDeliveries:   focused ? 'cube'             : 'cube-outline',
            CoopBatches:      focused ? 'layers'           : 'layers-outline',
            CoopConsignments: focused ? 'airplane'         : 'airplane-outline',
            CoopFarmers:      focused ? 'people'           : 'people-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CoopHome" options={{ tabBarLabel: 'Dashboard' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopDashMain" component={CoopDashboardScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="CoopDeliveries" options={{ tabBarLabel: 'Deliveries' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopDeliveriesList" component={CoopDeliveriesScreen} />
            <Stack.Screen name="CreateDelivery"     component={CreateDeliveryScreen} />
            <Stack.Screen name="DeliveryDetail"     component={DeliveryDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="CoopBatches" options={{ tabBarLabel: 'Batches' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="BatchesList"    component={CoopBatchesScreen} />
            <Stack.Screen name="BatchDetail"    component={BatchDetailScreen} />
            <Stack.Screen name="DeliveryDetail" component={DeliveryDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="CoopConsignments" options={{ tabBarLabel: 'Consignments' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="ConsignmentsList"  component={CoopConsignmentsScreen} />
            <Stack.Screen name="ConsignmentDetail" component={ConsignmentsScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="CoopFarmers" options={{ tabBarLabel: 'Farmers' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopFarmersList" component={CoopFarmersScreen} />
            <Stack.Screen name="CoopFarmsList"   component={CoopFarmsScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// ── Wrong-role screen ─────────────────────────────────────────────────────────
function WrongRoleScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={s.splash}>
      <Ionicons name="lock-closed-outline" size={52} color={C.c700} />
      <Text style={[s.splashText, { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 20 }]}>
        Farmer Access Only
      </Text>
      <Text style={[s.splashText, { textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
        This app is for registered farmers. Your account ({user?.role}) must access the Plotra web portal instead.
      </Text>
      <TouchableOpacity
        onPress={logout}
        style={{ marginTop: 32, backgroundColor: C.c700, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
        activeOpacity={0.85}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, authReady } = useAuth();

  if (!authReady) {
    return <SplashLoader />;
  }

  const role = user?.role;
  const isFarmer = !user || role === 'farmer';
  const isCoopOfficer = role === 'cooperative_officer';

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {user ? (
          isFarmer ? (
            <RootStack.Screen name="Main" component={FarmerTabs} />
          ) : isCoopOfficer ? (
            <RootStack.Screen name="CoopMain" component={CoopTabs} />
          ) : (
            <RootStack.Screen name="WrongRole" component={WrongRoleScreen} />
          )
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
  splash:      { flex: 1, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  splashLogo:  { width: 90, height: 90, borderRadius: 20 },
  splashText:  { marginTop: 12, fontSize: 13, color: C.muted, fontWeight: '600' },
});
