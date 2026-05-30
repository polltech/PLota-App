import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { isAdmin, isReviewer } from '../utils/roles';
import { C } from '../theme';

// ── Auth ──────────────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// ── Shared screens ────────────────────────────────────────────────────────────
import FarmDetailScreen from '../screens/FarmDetailScreen';
import ParcelDetailScreen from '../screens/ParcelDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';

// ── Farmer screens ────────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import FarmsListScreen from '../screens/FarmsListScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';

// ── Cooperative Officer screens ───────────────────────────────────────────────
import CoopDashboardScreen from '../screens/CoopDashboardScreen';
import CoopFarmersScreen from '../screens/CoopFarmersScreen';
import FarmerDetailScreen from '../screens/FarmerDetailScreen';
import CoopFarmsScreen from '../screens/CoopFarmsScreen';
import CoopDeliveriesScreen from '../screens/CoopDeliveriesScreen';
import CreateDeliveryScreen from '../screens/CreateDeliveryScreen';
import BatchesScreen from '../screens/BatchesScreen';

// ── Admin screens ─────────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminFarmersScreen from '../screens/AdminFarmersScreen';
import AdminComplianceScreen from '../screens/AdminComplianceScreen';
import AdminCoopsScreen from '../screens/AdminCoopsScreen';
import AdminMLScreen from '../screens/AdminMLScreen';

// ── EUDR Reviewer screens ─────────────────────────────────────────────────────
import ReviewerDashboardScreen from '../screens/ReviewerDashboardScreen';
import ReviewerDDSScreen from '../screens/ReviewerDDSScreen';

// ── Capture flow ──────────────────────────────────────────────────────────────
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

// ── Shared stacks ─────────────────────────────────────────────────────────────
function CaptureStack() {
  return (
    <Stack.Navigator screenOptions={screenOpts}>
      <Stack.Screen
        name="CaptureLanding"
        component={LandingScreen}
        options={{ animation: 'fade', contentStyle: { backgroundColor: '#0d0803' } }}
      />
      <Stack.Screen name="FarmIDEntry" component={FarmIDEntryScreen} />
      <Stack.Screen name="FarmConfirmation" component={FarmConfirmationScreen} />
      <Stack.Screen name="AddFarm" component={AddFarmScreen} />
      <Stack.Screen name="WalkBoundary" component={WalkBoundaryScreen} />
      <Stack.Screen name="ReviewPolygon" component={ReviewPolygonScreen} />
      <Stack.Screen name="OfflineSaved" component={OfflineSavedScreen} />
      <Stack.Screen name="Submitted" component={SubmittedScreen} />
      <Stack.Screen name="QueueList" component={QueueListScreen} />
    </Stack.Navigator>
  );
}

// ── Farmer Tab Navigator ──────────────────────────────────────────────────────
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
          const map = {
            Home: focused ? 'home' : 'home-outline',
            Farms: focused ? 'leaf' : 'leaf-outline',
            AddFarm: focused ? 'add-circle' : 'add-circle-outline',
            Deliveries: focused ? 'cube' : 'cube-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: 'Home' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Farms" options={{ tabBarLabel: 'Farms' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="FarmsList" component={FarmsListScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="AddFarm" component={CaptureStack} options={{ tabBarLabel: 'Add Farm' }} />

      <Tab.Screen name="Deliveries" component={DeliveriesScreen} options={{ tabBarLabel: 'Deliveries' }} />

      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Cooperative Officer Tab Navigator ─────────────────────────────────────────
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
          const map = {
            Dashboard: focused ? 'speedometer' : 'speedometer-outline',
            Farmers: focused ? 'people' : 'people-outline',
            Farms: focused ? 'leaf' : 'leaf-outline',
            Deliveries: focused ? 'cube' : 'cube-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Dashboard' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopDashMain" component={CoopDashboardScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Farmers" options={{ tabBarLabel: 'Farmers' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopFarmersList" component={CoopFarmersScreen} />
            <Stack.Screen name="FarmerDetail" component={FarmerDetailScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Farms" options={{ tabBarLabel: 'Farms' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopFarmsList" component={CoopFarmsScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Deliveries" options={{ tabBarLabel: 'Deliveries' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="CoopDeliveriesList" component={CoopDeliveriesScreen} />
            <Stack.Screen name="CreateDelivery" component={CreateDeliveryScreen} />
            <Stack.Screen name="Batches" component={BatchesScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Admin Tab Navigator ───────────────────────────────────────────────────────
function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.c700,
        tabBarInactiveTintColor: C.subtle,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            Dashboard: focused ? 'speedometer' : 'speedometer-outline',
            Users: focused ? 'people' : 'people-outline',
            Compliance: focused ? 'shield-checkmark' : 'shield-checkmark-outline',
            Coops: focused ? 'business' : 'business-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Dashboard' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="AdminDashMain" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
            <Stack.Screen name="AdminFarmers" component={AdminFarmersScreen} />
            <Stack.Screen name="AdminCompliance" component={AdminComplianceScreen} />
            <Stack.Screen name="AdminCoops" component={AdminCoopsScreen} />
            <Stack.Screen name="AdminML" component={AdminMLScreen} />
            <Stack.Screen name="AdminFarms" component={CoopFarmsScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Users" options={{ tabBarLabel: 'Users' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="AdminUsersList" component={AdminUsersScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Compliance" options={{ tabBarLabel: 'Compliance' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="AdminComplianceMain" component={AdminComplianceScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Coops" options={{ tabBarLabel: 'Coops' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="AdminCoopsList" component={AdminCoopsScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── EUDR Reviewer Tab Navigator ───────────────────────────────────────────────
function ReviewerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.c700,
        tabBarInactiveTintColor: C.subtle,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color, size }) => {
          const map = {
            Dashboard: focused ? 'speedometer' : 'speedometer-outline',
            DDS: focused ? 'document-text' : 'document-text-outline',
            Farms: focused ? 'leaf' : 'leaf-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={map[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ tabBarLabel: 'Overview' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="ReviewerDashMain" component={ReviewerDashboardScreen} />
            <Stack.Screen name="ReviewerDDS" component={ReviewerDDSScreen} />
            <Stack.Screen name="ReviewerFarms" component={CoopFarmsScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="DDS" options={{ tabBarLabel: 'DDS' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="ReviewerDDSList" component={ReviewerDDSScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Farms" options={{ tabBarLabel: 'Farms' }}>
        {() => (
          <Stack.Navigator screenOptions={screenOpts}>
            <Stack.Screen name="ReviewerFarmsList" component={CoopFarmsScreen} />
            <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
            <Stack.Screen name="ParcelDetail" component={ParcelDetailScreen} />
          </Stack.Navigator>
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
const RootStack = createNativeStackNavigator();

function MainNavigator({ user }) {
  if (isAdmin(user)) return <AdminTabs />;
  if (isReviewer(user)) return <ReviewerTabs />;
  // cooperative_officer uses CoopTabs; farmer and default use FarmerTabs
  if (user?.role === 'cooperative_officer') return <CoopTabs />;
  return <FarmerTabs />;
}

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
          <RootStack.Screen name="Main">
            {() => <MainNavigator user={user} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Auth">
            {() => (
              <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="Login" component={LoginScreen} />
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
