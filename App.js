import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Linking, AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Location from 'expo-location';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { mobileAPI } from './src/services/api';

// ── Error boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={eb.wrap}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{this.state.error?.message || 'An unexpected error occurred.'}</Text>
          <TouchableOpacity onPress={() => this.setState({ hasError: false, error: null })} style={eb.btn}>
            <Text style={eb.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8F3', padding: 32 },
  title: { fontSize: 18, fontWeight: '700', color: '#C62828', marginBottom: 8 },
  msg: { fontSize: 13, color: '#6B6B6B', textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  btn: { backgroundColor: '#6f4e37', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});

// ── GPS permission modal ───────────────────────────────────────────────────────
function GPSPermissionModal({ visible, reason, onOpenSettings, onDismiss }) {
  const isDisabled   = reason === 'disabled';
  const isDenied     = reason === 'denied';
  const isPermanent  = reason === 'permanent';

  const title = isDisabled
    ? 'GPS / Location is Off'
    : isDenied || isPermanent
    ? 'Location Permission Required'
    : 'Location Access Needed';

  const body = isDisabled
    ? 'This app captures farm boundaries using your GPS. Please turn on Location Services in your device settings to use boundary capture.'
    : isPermanent
    ? 'Location permission was denied permanently. Please open Settings and allow location access for Plotra to use boundary capture.'
    : 'Plotra needs access to your location to capture farm boundaries accurately. Please grant permission when prompted.';

  const primaryLabel = isDisabled || isPermanent ? 'Open Settings' : 'Grant Permission';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={gps.overlay}>
        <View style={gps.sheet}>
          <View style={gps.handle} />

          <View style={gps.iconWrap}>
            <Text style={gps.iconEmoji}>📍</Text>
          </View>

          <Text style={gps.title}>{title}</Text>
          <Text style={gps.body}>{body}</Text>

          <TouchableOpacity style={gps.primaryBtn} onPress={onOpenSettings} activeOpacity={0.85}>
            <Text style={gps.primaryBtnText}>{primaryLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={gps.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={gps.secondaryBtnText}>Continue without GPS</Text>
          </TouchableOpacity>

          <Text style={gps.note}>
            You can still use the app — GPS is only needed for farm boundary capture.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const gps = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44, alignItems: 'center' },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginBottom: 20 },
  iconWrap:       { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  iconEmoji:      { fontSize: 34 },
  title:          { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 10, textAlign: 'center' },
  body:           { fontSize: 14, color: '#64748b', lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  primaryBtn:     { width: '100%', backgroundColor: '#5c2d0e', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  secondaryBtn:   { paddingVertical: 10, paddingHorizontal: 20 },
  secondaryBtnText:{ fontSize: 14, fontWeight: '600', color: '#64748b' },
  note:           { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 12, lineHeight: 16 },
});

// ── GPS hook ──────────────────────────────────────────────────────────────────
function useGPSCheck() {
  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState(null); // 'disabled' | 'denied' | 'permanent'
  const appState = useRef(AppState.currentState);
  const checked = useRef(false);

  const check = async () => {
    try {
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setReason('disabled');
        setModalVisible(true);
        return;
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'denied') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') {
          setReason(newStatus === 'denied' ? 'permanent' : 'denied');
          setModalVisible(true);
        }
      }
    } catch (_) {
      // Silently ignore — don't block app on permission check errors
    }
  };

  useEffect(() => {
    // Initial check after a short delay (let app fully mount first)
    const t = setTimeout(() => { check(); checked.current = true; }, 1500);

    // Re-check when app comes back to foreground
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        check();
      }
      appState.current = next;
    });

    return () => { clearTimeout(t); sub.remove(); };
  }, []);

  // Poll every 2s while modal is open — auto-close as soon as GPS is on and permission granted
  useEffect(() => {
    if (!modalVisible) return;

    const poll = setInterval(async () => {
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) return;
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          setModalVisible(false);
          setReason(null);
        }
      } catch (_) {}
    }, 2000);

    return () => clearInterval(poll);
  }, [modalVisible]);

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleDismiss = () => {
    setModalVisible(false);
  };

  return { modalVisible, reason, handleOpenSettings, handleDismiss };
}

// ── Root app ──────────────────────────────────────────────────────────────────
function AppWithGPS() {
  const { modalVisible, reason, handleOpenSettings, handleDismiss } = useGPSCheck();

  return (
    <>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator />
      </AuthProvider>

      <GPSPermissionModal
        visible={modalVisible}
        reason={reason}
        onOpenSettings={handleOpenSettings}
        onDismiss={handleDismiss}
      />
    </>
  );
}

export default function App() {
  useEffect(() => {
    mobileAPI.setup().catch(e => console.warn('Setup provisioning skipped:', e.message));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AppWithGPS />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
