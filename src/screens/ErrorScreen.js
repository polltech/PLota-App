import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

/* ─────────────────────────────────────────────────────────────────────────────
   Error type definitions
───────────────────────────────────────────────────────────────────────────── */
const ERROR_TYPES = {
  404: {
    icon: 'map-outline',
    iconColor: C.c600,
    title: 'Page Not Found',
    message: "The screen you're looking for doesn't exist or may have been moved.",
    accentBg: C.c050,
    accentBorder: C.c300,
  },
  401: {
    icon: 'time-outline',
    iconColor: '#0ea5e9',
    title: 'Session Expired',
    message: 'Your session has timed out. Please sign in again to continue.',
    accentBg: '#f0f9ff',
    accentBorder: '#bae6fd',
  },
  403: {
    icon: 'lock-closed-outline',
    iconColor: '#d97706',
    title: 'Access Denied',
    message: "You don't have permission to view this. Contact your administrator if this seems wrong.",
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
  },
  500: {
    icon: 'server-outline',
    iconColor: '#dc2626',
    title: 'Server Error',
    message: 'Something went wrong on our end. Our team has been notified. Please try again.',
    accentBg: '#fef2f2',
    accentBorder: '#fecaca',
  },
  503: {
    icon: 'construct-outline',
    iconColor: '#d97706',
    title: 'Service Unavailable',
    message: 'The service is temporarily down for maintenance. It will be back shortly.',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
  },
  offline: {
    icon: 'cloud-offline-outline',
    iconColor: C.steel600,
    title: 'No Connection',
    message: "You're offline. Check your internet connection and try again.",
    accentBg: C.steel100,
    accentBorder: C.steel300,
  },
  timeout: {
    icon: 'timer-outline',
    iconColor: '#d97706',
    title: 'Request Timed Out',
    message: 'The request took too long. Check your connection and try again.',
    accentBg: '#fffbeb',
    accentBorder: '#fde68a',
  },
  unknown: {
    icon: 'alert-circle-outline',
    iconColor: '#dc2626',
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or restart the app.',
    accentBg: '#fef2f2',
    accentBorder: '#fecaca',
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   ErrorScreen
   Props:
     route.params.type    — '404' | '401' | '403' | '500' | '503' | 'offline'
                            | 'timeout' | 'unknown'
     route.params.title   — override title (optional)
     route.params.message — override message (optional)
     route.params.retry   — boolean: show Retry button (optional)
───────────────────────────────────────────────────────────────────────────── */
export default function ErrorScreen({ navigation, route }) {
  const {
    type = 'unknown',
    title: customTitle,
    message: customMessage,
    retry = false,
  } = route?.params || {};

  const cfg = ERROR_TYPES[type] || ERROR_TYPES.unknown;
  const title = customTitle || cfg.title;
  const message = customMessage || cfg.message;
  const is401 = type === '401' || type === 401;

  const handleGoHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const handleSignIn = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleRetry = () => navigation.goBack();
  const handleGoBack = () => navigation.canGoBack() ? navigation.goBack() : handleGoHome();

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.steel100} />
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon circle */}
          <View style={[s.iconCircle, { backgroundColor: cfg.accentBg, borderColor: cfg.accentBorder }]}>
            <Ionicons name={cfg.icon} size={52} color={cfg.iconColor} />
          </View>

          {/* Code badge */}
          <View style={[s.codeBadge, { backgroundColor: cfg.accentBg, borderColor: cfg.accentBorder }]}>
            <Text style={[s.codeText, { color: cfg.iconColor }]}>
              {String(type).toUpperCase()}
            </Text>
          </View>

          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>

          {/* Actions */}
          <View style={s.actions}>
            {is401 ? (
              <TouchableOpacity style={s.primaryBtn} onPress={handleSignIn} activeOpacity={0.85}>
                <Ionicons name="log-in-outline" size={18} color={C.white} />
                <Text style={s.primaryBtnText}>Sign In</Text>
              </TouchableOpacity>
            ) : (
              <>
                {retry && (
                  <TouchableOpacity style={s.primaryBtn} onPress={handleRetry} activeOpacity={0.85}>
                    <Ionicons name="refresh-outline" size={18} color={C.white} />
                    <Text style={s.primaryBtnText}>Try Again</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={retry ? s.ghostBtn : s.primaryBtn}
                  onPress={handleGoHome}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="home-outline"
                    size={18}
                    color={retry ? C.steel600 : C.white}
                  />
                  <Text style={retry ? s.ghostBtnText : s.primaryBtnText}>
                    Go to Dashboard
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={s.linkBtn} onPress={handleGoBack} activeOpacity={0.7}>
              <Text style={s.linkText}>Go back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.steel100 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    paddingVertical: 48,
  },

  iconCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },

  codeBadge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: 14,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: C.steel900,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: C.steel600,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: 36,
  },

  actions: { width: '100%', maxWidth: 320, gap: 10 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.c700,
    height: 48,
    borderRadius: 10,
    shadowColor: C.c700,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },

  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.steel300,
    backgroundColor: C.white,
  },
  ghostBtnText: {
    color: C.steel600,
    fontSize: 15,
    fontWeight: '600',
  },

  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { color: C.steel600, fontSize: 14, fontWeight: '500' },
});
