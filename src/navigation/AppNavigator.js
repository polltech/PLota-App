import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Image, ScrollView,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { ROLES } from '../utils/roles';

// ── Auth screens ──────────────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// ── Farmer screens ────────────────────────────────────────────────────────────
import HomeScreen from '../screens/HomeScreen';
import FarmsListScreen from '../screens/FarmsListScreen';
import DeliveriesScreen from '../screens/DeliveriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import WalletScreen from '../screens/WalletScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

// ── Shared detail screens ─────────────────────────────────────────────────────
import FarmDetailScreen from '../screens/FarmDetailScreen';
import ParcelDetailScreen from '../screens/ParcelDetailScreen';
import CaptureModeScreen from '../screens/CaptureModeScreen';
import CaptureImportScreen from '../screens/CaptureImportScreen';
import AdvancedScreen from '../screens/AdvancedScreen';
import ReviewFarmScreen from '../screens/ReviewFarmScreen';
import EditFarmScreen from '../screens/EditFarmScreen';

// ── Admin screens ─────────────────────────────────────────────────────────────
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import AdminFarmersScreen from '../screens/AdminFarmersScreen';
import AdminComplianceScreen from '../screens/AdminComplianceScreen';
import AdminCoopsScreen from '../screens/AdminCoopsScreen';
import AdminMLScreen from '../screens/AdminMLScreen';

// ── Cooperative Officer screens ───────────────────────────────────────────────
import CaptureOfficerDashboardScreen from '../screens/CaptureOfficerDashboardScreen';
import CoopDashboardScreen from '../screens/CoopDashboardScreen';
import CoopFarmersScreen from '../screens/CoopFarmersScreen';
import CoopFarmsScreen from '../screens/CoopFarmsScreen';
import CoopDeliveriesScreen from '../screens/CoopDeliveriesScreen';
import CoopBatchesScreen from '../screens/CoopBatchesScreen';
import CoopConsignmentsScreen from '../screens/CoopConsignmentsScreen';
import CoopStaffScreen from '../screens/CoopStaffScreen';
import CoopProfileScreen from '../screens/CoopProfileScreen';
import FarmerDetailScreen from '../screens/FarmerDetailScreen';
import BatchesScreen from '../screens/BatchesScreen';
import CreateDeliveryScreen from '../screens/CreateDeliveryScreen';
import DeliveryDetailScreen from '../screens/DeliveryDetailScreen';
import ProcessingStepsScreen from '../screens/ProcessingStepsScreen';
import AddProcessingStepScreen from '../screens/AddProcessingStepScreen';
import ProcessingDashboardScreen from '../screens/ProcessingDashboardScreen';
import BatchDetailScreen from '../screens/BatchDetailScreen';
import ConsignmentsScreen from '../screens/ConsignmentsScreen';
import PostHarvestScreen from '../screens/PostHarvestScreen';
import PaymentManagementScreen from '../screens/PaymentManagementScreen';

// ── Polygon capture flow (S00–S08) ────────────────────────────────────────────
import LandingScreen from '../screens/S00_LandingScreen';
import FarmIDEntryScreen from '../screens/S01_FarmIDEntryScreen';
import FarmConfirmationScreen from '../screens/S02_FarmConfirmationScreen';
import WalkBoundaryScreen from '../screens/S03_WalkBoundaryScreen';
import AddFarmScreen from '../screens/S04_AddFarmScreen';
import SelectFarmerForCaptureScreen from '../screens/SelectFarmerForCaptureScreen';
import ReviewPolygonScreen from '../screens/S05_ReviewPolygonScreen';
import OfflineSavedScreen from '../screens/S06_OfflineSavedScreen';
import SubmittedScreen from '../screens/S07_SubmittedScreen';
import QueueListScreen from '../screens/S08_QueueListScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Drawer context — any screen can call openDrawer()
// ─────────────────────────────────────────────────────────────────────────────
export const DrawerCtx = React.createContext({ openDrawer: () => {} });
export const useDrawer = () => React.useContext(DrawerCtx);

// Root nav ref — sidebar navigates via this without needing useNavigation()
export const rootNavRef = React.createRef();

const Stack = createNativeStackNavigator();

const screenOpts = {
  headerShown: false,
  contentStyle: { backgroundColor: C.steel100 },
  animation: 'slide_from_right',
};

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedSidebar — pure RN Animated (no reanimated, no native modules)
// ─────────────────────────────────────────────────────────────────────────────
const DRAWER_W = 280;

function AnimatedSidebar({ open, onClose, links, user, onLogout }) {
  const insets  = useSafeAreaInsets();
  const slideX  = useRef(new Animated.Value(-DRAWER_W)).current;
  const fadeVal = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideX,  { toValue: 0,    duration: 230, useNativeDriver: true }),
        Animated.timing(fadeVal, { toValue: 0.45, duration: 230, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideX,  { toValue: -DRAWER_W, duration: 190, useNativeDriver: true }),
        Animated.timing(fadeVal, { toValue: 0,          duration: 190, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
  }, [open]);

  if (!mounted) return null;

  const fullName  = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const roleLabel = (user?.role || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: fadeVal }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[sb.panel, { paddingTop: insets.top, transform: [{ translateX: slideX }] }]}>
        <View style={sb.brand}>
          <Image source={require('../../assets/plotra-logo.png')} style={sb.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={sb.appName}>Plotra</Text>
            {!!fullName  && <Text style={sb.userName} numberOfLines={1}>{fullName}</Text>}
            {!!roleLabel && <Text style={sb.roleChip}>{roleLabel}</Text>}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8 }}>
          {links.map(link => (
            <TouchableOpacity
              key={link.label}
              style={sb.item}
              onPress={() => { onClose(); link.nav(); }}
              activeOpacity={0.75}
            >
              <Ionicons name={link.icon} size={20} color="rgba(255,255,255,0.65)" />
              <Text style={sb.itemLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[sb.logout, { paddingBottom: insets.bottom + 8 }]}
          onPress={() => { onClose(); onLogout(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.6)" />
          <Text style={sb.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const sb = StyleSheet.create({
  panel:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: DRAWER_W, backgroundColor: C.c900, zIndex: 999 },
  brand:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  logo:      { width: 42, height: 42, borderRadius: 12 },
  appName:   { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  userName:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  roleChip:  { fontSize: 10, fontWeight: '700', color: C.c400, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 3 },
  item:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 10, marginBottom: 2, paddingHorizontal: 14, paddingVertical: 13, borderRadius: 12 },
  itemLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  logout:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  logoutText:{ fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Hamburger — floats at top-left above all screen content
// ─────────────────────────────────────────────────────────────────────────────
function HamburgerBtn({ onPress }) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[hb.btn, { top: insets.top + 10 }]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Ionicons name="menu-outline" size={26} color="#fff" />
    </TouchableOpacity>
  );
}
const hb = StyleSheet.create({
  btn: {
    position: 'absolute', left: 16, zIndex: 500,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// RoleShell — wraps a Stack navigator with sidebar + floating hamburger
// ─────────────────────────────────────────────────────────────────────────────
function RoleShell({ links, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen]  = useState(false);
  const openDrawer       = useCallback(() => setOpen(true), []);
  const closeDrawer      = useCallback(() => setOpen(false), []);

  return (
    <DrawerCtx.Provider value={{ openDrawer }}>
      <View style={{ flex: 1 }}>
        {children}
        <HamburgerBtn onPress={openDrawer} />
        <AnimatedSidebar
          open={open}
          onClose={closeDrawer}
          links={links}
          user={user}
          onLogout={logout}
        />
      </View>
    </DrawerCtx.Provider>
  );
}

// nav() helper — dispatches navigate from outside any navigator
const nav = (name, params) => () => rootNavRef.current?.navigate(name, params);

// ── Shared capture screens ────────────────────────────────────────────────────
const CaptureScreens = [
  <Stack.Screen key="CaptureLanding"       name="CaptureLanding"       component={LandingScreen}                options={{ contentStyle: { backgroundColor: '#052e16' } }} />,
  <Stack.Screen key="FarmIDEntry"          name="FarmIDEntry"          component={FarmIDEntryScreen} />,
  <Stack.Screen key="FarmConfirmation"     name="FarmConfirmation"     component={FarmConfirmationScreen} />,
  <Stack.Screen key="AddFarm"              name="AddFarm"              component={AddFarmScreen} />,
  <Stack.Screen key="SelectFarmerForCapture" name="SelectFarmerForCapture" component={SelectFarmerForCaptureScreen} />,
  <Stack.Screen key="CaptureMode"          name="CaptureMode"          component={CaptureModeScreen} />,
  <Stack.Screen key="CaptureImport"        name="CaptureImport"        component={CaptureImportScreen} />,
  <Stack.Screen key="WalkBoundary"         name="WalkBoundary"         component={WalkBoundaryScreen} />,
  <Stack.Screen key="AdvancedCapture"      name="AdvancedCapture"      component={AdvancedScreen} />,
  <Stack.Screen key="ReviewFarm"           name="ReviewFarm"           component={ReviewFarmScreen} />,
  <Stack.Screen key="ReviewPolygon"        name="ReviewPolygon"        component={ReviewPolygonScreen} />,
  <Stack.Screen key="OfflineSaved"         name="OfflineSaved"         component={OfflineSavedScreen} />,
  <Stack.Screen key="Submitted"            name="Submitted"            component={SubmittedScreen} />,
  <Stack.Screen key="QueueList"            name="QueueList"            component={QueueListScreen} />,
  <Stack.Screen key="FarmDetail"           name="FarmDetail"           component={FarmDetailScreen} />,
  <Stack.Screen key="EditFarm"             name="EditFarm"             component={EditFarmScreen} />,
  <Stack.Screen key="ParcelDetail"         name="ParcelDetail"         component={ParcelDetailScreen} />,
];

// ── Farmer ────────────────────────────────────────────────────────────────────
const farmerLinks = [
  { icon: 'grid-outline',          label: 'Dashboard',    nav: nav('HomeMain') },
  { icon: 'leaf-outline',          label: 'My Farms',     nav: nav('FarmsList') },
  { icon: 'cube-outline',          label: 'Deliveries',   nav: nav('Deliveries') },
  { icon: 'wallet-outline',        label: 'Wallet',       nav: nav('Wallet') },
  { icon: 'document-text-outline', label: 'Documents',    nav: nav('Documents') },
  { icon: 'notifications-outline', label: 'Notifications',nav: nav('Notifications') },
  { icon: 'person-outline',        label: 'Profile',      nav: nav('Profile') },
];
function FarmerApp() {
  return (
    <RoleShell links={farmerLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="HomeMain"      component={HomeScreen} />
        <Stack.Screen name="FarmsList"     component={FarmsListScreen} />
        <Stack.Screen name="Deliveries"    component={DeliveriesScreen} />
        <Stack.Screen name="Wallet"        component={WalletScreen} />
        <Stack.Screen name="Documents"     component={DocumentsScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Profile"       component={ProfileScreen} />
        {CaptureScreens}
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Cooperative Officer ───────────────────────────────────────────────────────
const coopLinks = [
  { icon: 'grid-outline',          label: 'Dashboard',    nav: nav('CoopDash') },
  { icon: 'cube-outline',          label: 'Deliveries',   nav: nav('CoopDeliveries') },
  { icon: 'layers-outline',        label: 'Batches',      nav: nav('CoopBatches') },
  { icon: 'leaf-outline',          label: 'Farms',        nav: nav('CoopFarms') },
  { icon: 'people-outline',        label: 'Farmers',      nav: nav('CoopFarmers') },
  { icon: 'person-circle-outline', label: 'Staff',        nav: nav('CoopStaff') },
  { icon: 'airplane-outline',      label: 'Consignments', nav: nav('CoopConsignments') },
];
function CoopApp() {
  return (
    <RoleShell links={coopLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="CoopDash"          component={CoopDashboardScreen} />
        <Stack.Screen name="CoopDeliveries"    component={CoopDeliveriesScreen} />
        <Stack.Screen name="CreateDelivery"    component={CreateDeliveryScreen} />
        <Stack.Screen name="DeliveryDetail"    component={DeliveryDetailScreen} />
        <Stack.Screen name="ProcessingSteps"   component={ProcessingStepsScreen} />
        <Stack.Screen name="AddProcessingStep" component={AddProcessingStepScreen} />
        <Stack.Screen name="CoopBatches"       component={CoopBatchesScreen} />
        <Stack.Screen name="BatchDetail"       component={BatchDetailScreen} />
        <Stack.Screen name="CoopFarms"         component={CoopFarmsScreen} />
        <Stack.Screen name="CoopFarmers"       component={CoopFarmersScreen} />
        <Stack.Screen name="FarmerDetail"      component={FarmerDetailScreen} />
        <Stack.Screen name="CoopStaff"         component={CoopStaffScreen} />
        <Stack.Screen name="CoopConsignments"  component={CoopConsignmentsScreen} />
        <Stack.Screen name="CoopProfile"       component={CoopProfileScreen} />
        {CaptureScreens}
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Delivery Agent ────────────────────────────────────────────────────────────
const agentLinks = [
  { icon: 'grid-outline', label: 'Dashboard',  nav: nav('AgentDash') },
  { icon: 'cube-outline', label: 'Deliveries', nav: nav('AgentDeliveries') },
];
function DeliveryAgentApp() {
  return (
    <RoleShell links={agentLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="AgentDash"         component={ProcessingDashboardScreen} />
        <Stack.Screen name="AgentDeliveries"   component={CoopDeliveriesScreen} />
        <Stack.Screen name="CreateDelivery"    component={CreateDeliveryScreen} />
        <Stack.Screen name="DeliveryDetail"    component={DeliveryDetailScreen} />
        <Stack.Screen name="ProcessingSteps"   component={ProcessingStepsScreen} />
        <Stack.Screen name="AddProcessingStep" component={AddProcessingStepScreen} />
        <Stack.Screen name="CoopProfile"       component={CoopProfileScreen} />
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Washing Station ───────────────────────────────────────────────────────────
const wsLinks = [
  { icon: 'grid-outline', label: 'Dashboard',  nav: nav('WSDash') },
  { icon: 'cube-outline', label: 'Deliveries', nav: nav('WSDeliveries') },
];
function WashingStationApp() {
  return (
    <RoleShell links={wsLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="WSDash"            component={ProcessingDashboardScreen} />
        <Stack.Screen name="WSDeliveries"      component={CoopDeliveriesScreen} />
        <Stack.Screen name="DeliveryDetail"    component={DeliveryDetailScreen} />
        <Stack.Screen name="ProcessingSteps"   component={ProcessingStepsScreen} />
        <Stack.Screen name="AddProcessingStep" component={AddProcessingStepScreen} />
        <Stack.Screen name="CoopProfile"       component={CoopProfileScreen} />
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Post-Harvest ──────────────────────────────────────────────────────────────
const phLinks = [
  { icon: 'grid-outline',  label: 'Dashboard',  nav: nav('PHDash') },
  { icon: 'cube-outline',  label: 'Deliveries', nav: nav('PHDeliveries') },
  { icon: 'flask-outline', label: 'Lab Results', nav: nav('PHLab') },
];
function PostHarvestApp() {
  return (
    <RoleShell links={phLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="PHDash"            component={ProcessingDashboardScreen} />
        <Stack.Screen name="PHDeliveries"      component={CoopDeliveriesScreen} />
        <Stack.Screen name="DeliveryDetail"    component={DeliveryDetailScreen} />
        <Stack.Screen name="ProcessingSteps"   component={ProcessingStepsScreen} />
        <Stack.Screen name="AddProcessingStep" component={AddProcessingStepScreen} />
        <Stack.Screen name="PHLab"             component={PostHarvestScreen} />
        <Stack.Screen name="BatchDetail"       component={BatchDetailScreen} />
        <Stack.Screen name="CoopProfile"       component={CoopProfileScreen} />
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Agronomist ────────────────────────────────────────────────────────────────
const agroLinks = [
  { icon: 'people-outline',           label: 'Farmers',    nav: nav('AgroFarmers') },
  { icon: 'leaf-outline',             label: 'Farms',      nav: nav('AgroFarms') },
  { icon: 'shield-checkmark-outline', label: 'Compliance', nav: nav('AgroCompliance') },
];
function AgronomistApp() {
  return (
    <RoleShell links={agroLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="AgroFarmers"    component={CoopFarmersScreen} />
        <Stack.Screen name="FarmerDetail"   component={FarmerDetailScreen} />
        <Stack.Screen name="AgroFarms"      component={CoopFarmsScreen} />
        <Stack.Screen name="AgroCompliance" component={AdminComplianceScreen} />
        <Stack.Screen name="CoopProfile"    component={CoopProfileScreen} />
        {CaptureScreens}
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Finance Admin ─────────────────────────────────────────────────────────────
const finLinks = [
  { icon: 'layers-outline',   label: 'Batches',      nav: nav('FinBatches') },
  { icon: 'airplane-outline', label: 'Consignments', nav: nav('FinConsignments') },
  { icon: 'cash-outline',     label: 'Payments',     nav: nav('FinPayments') },
];
function FinanceAdminApp() {
  return (
    <RoleShell links={finLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="FinBatches"       component={CoopBatchesScreen} />
        <Stack.Screen name="BatchDetail"      component={BatchDetailScreen} />
        <Stack.Screen name="DeliveryDetail"   component={DeliveryDetailScreen} />
        <Stack.Screen name="FinConsignments"  component={CoopConsignmentsScreen} />
        <Stack.Screen name="Consignments"     component={ConsignmentsScreen} />
        <Stack.Screen name="FinPayments"      component={PaymentManagementScreen} />
        <Stack.Screen name="CoopProfile"      component={CoopProfileScreen} />
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Farm Capturing Officer ────────────────────────────────────────────────────
const captureOfficerLinks = [
  { icon: 'grid-outline',   label: 'Dashboard', nav: nav('CaptureDash') },
  { icon: 'people-outline', label: 'Farmers',   nav: nav('CaptureFarmers') },
  { icon: 'map-outline',    label: 'Farms',     nav: nav('CaptureFarms') },
];
function FarmCapturingOfficerApp() {
  return (
    <RoleShell links={captureOfficerLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="CaptureDash"    component={CaptureOfficerDashboardScreen} />
        <Stack.Screen name="CaptureFarmers" component={CoopFarmersScreen} />
        <Stack.Screen name="FarmerDetail"   component={FarmerDetailScreen} />
        <Stack.Screen name="CaptureFarms"   component={CoopFarmsScreen} />
        <Stack.Screen name="Notifications"  component={NotificationsScreen} />
        <Stack.Screen name="Profile"        component={ProfileScreen} />
        <Stack.Screen name="CoopProfile"    component={CoopProfileScreen} />
        {CaptureScreens}
      </Stack.Navigator>
    </RoleShell>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
const adminLinks = [
  { icon: 'grid-outline',             label: 'Dashboard',  nav: nav('AdminDash') },
  { icon: 'layers-outline',           label: 'Batches',    nav: nav('AdminBatches') },
  { icon: 'people-outline',           label: 'Users',      nav: nav('AdminUsers') },
  { icon: 'person-add-outline',       label: 'Farmers',    nav: nav('AdminFarmers') },
  { icon: 'shield-checkmark-outline', label: 'Compliance', nav: nav('AdminCompliance') },
];
function AdminApp() {
  return (
    <RoleShell links={adminLinks}>
      <Stack.Navigator screenOptions={screenOpts}>
        <Stack.Screen name="AdminDash"       component={AdminDashboardScreen} />
        <Stack.Screen name="AdminCoops"      component={AdminCoopsScreen} />
        <Stack.Screen name="AdminML"         component={AdminMLScreen} />
        <Stack.Screen name="AdminBatches"    component={BatchesScreen} />
        <Stack.Screen name="BatchDetail"     component={BatchDetailScreen} />
        <Stack.Screen name="DeliveryDetail"  component={DeliveryDetailScreen} />
        <Stack.Screen name="AdminUsers"      component={AdminUsersScreen} />
        <Stack.Screen name="AdminFarmers"    component={AdminFarmersScreen} />
        <Stack.Screen name="FarmerDetail"    component={FarmerDetailScreen} />
        <Stack.Screen name="AdminCompliance" component={AdminComplianceScreen} />
        {CaptureScreens}
      </Stack.Navigator>
    </RoleShell>
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
      <Image source={require('../../assets/plotra-logo.png')} style={s.splashLogo} resizeMode="contain" />
      <Animated.View style={{ transform: [{ rotate }], marginTop: 32 }}>
        <Ionicons name="reload-outline" size={30} color={C.c700} />
      </Animated.View>
      <Text style={s.splashText}>Loading...</Text>
    </View>
  );
}

// ── Wrong-role screen ─────────────────────────────────────────────────────────
function WrongRoleScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={s.splash}>
      <Ionicons name="lock-closed-outline" size={52} color={C.c700} />
      <Text style={[s.splashText, { fontSize: 17, fontWeight: '800', color: C.steel900, marginTop: 20 }]}>
        Farmer / Staff Access Only
      </Text>
      <Text style={[s.splashText, { textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }]}>
        Your account ({user?.role}) must access the Plotra web portal instead.
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

  if (!authReady) return <SplashLoader />;

  const role = user?.role;

  const Main =
    !user                                       ? null
    : !role || role === ROLES.FARMER            ? FarmerApp
    : role === ROLES.COOP_OFFICER               ? CoopApp
    : role === ROLES.DELIVERY_AGENT             ? DeliveryAgentApp
    : role === ROLES.WASHING_STATION            ? WashingStationApp
    : role === ROLES.POST_HARVEST               ? PostHarvestApp
    : role === ROLES.AGRONOMIST                 ? AgronomistApp
    : role === ROLES.FINANCE_ADMIN              ? FinanceAdminApp
    : role === ROLES.FARM_CAPTURING_OFFICER     ? FarmCapturingOfficerApp
    : role === ROLES.ADMIN                      ? AdminApp
    : null;

  return (
    <NavigationContainer ref={rootNavRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {user && Main ? (
          <RootStack.Screen name="Main" component={Main} />
        ) : user ? (
          <RootStack.Screen name="WrongRole" component={WrongRoleScreen} />
        ) : (
          <RootStack.Screen name="Auth">
            {() => (
              <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
                <Stack.Screen name="Login"          component={LoginScreen} />
                <Stack.Screen name="Register"       component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </Stack.Navigator>
            )}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const s = StyleSheet.create({
  splash:     { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 90, height: 90, borderRadius: 20 },
  splashText: { marginTop: 12, fontSize: 13, color: C.steel600, fontWeight: '600' },
});
