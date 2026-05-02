import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { API_BASE_URL, API_KEY } from '../config';
import { C } from '../theme';

const FarmIDEntryScreen = () => {
  const [farmId, setFarmId] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const navigation = useNavigation();

  const hasError = touched && !farmId.trim();

  const handleContinue = async () => {
    setTouched(true);
    setApiError(null);
    if (!farmId.trim()) return;

    setIsLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/farms/${encodeURIComponent(farmId.trim())}`,
            { headers: { 'X-API-Key': API_KEY } }
          );
          if (res.ok) {
            const farm = await res.json();
            navigation.navigate('FarmConfirmation', { farmId: farmId.trim(), farm });
            return;
          }
          if (res.status === 404) {
            // Farm ID does not exist — block the user, do NOT proceed
            setApiError('Farm ID not found. Check the ID and try again.');
            return;
          }
          if (res.status === 401) {
            setApiError('Authentication error. Please contact support.');
            return;
          }
          // Server error (5xx) — fall through to offline mode
        } catch (_) {
          // Network exception — fall through to offline mode
        }
      }
      // Offline or server temporarily unavailable — allow offline capture
      navigation.navigate('WalkBoundary', { farmId: farmId.trim() });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo row */}
          <View style={s.logoRow}>
            <Image
              source={require('../../assets/logo.jpeg')}
              style={s.logoMark}
              resizeMode="contain"
            />
            <Text style={s.logoText}>Plotra Field</Text>
          </View>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={s.title}>Start polygon capture</Text>
            <Text style={s.subtitle}>
              Enter the numeric Farm ID{'\n'}from the Plotra web portal
            </Text>
          </View>

          {/* Form card */}
          <View style={s.card}>
            <Text style={s.label}>Farm ID / Code</Text>
            <TextInput
              style={[s.input, hasError && s.inputError]}
              value={farmId}
              onChangeText={(v) => {
                setFarmId(v);
                setTouched(false);
                setApiError(null);
              }}
              onBlur={() => setTouched(true)}
              placeholder="e.g. 1042"
              placeholderTextColor={C.subtle}
              autoCapitalize="characters"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />
            {hasError ? (
              <Text style={s.errorText}>Enter a Farm ID before continuing</Text>
            ) : apiError ? (
              <Text style={s.errorText}>{apiError}</Text>
            ) : (
              <Text style={s.hintText}>Farm ID or code from the Plotra web portal</Text>
            )}

            <TouchableOpacity
              style={[s.primaryBtn, (!farmId.trim() || isLoading) && s.btnDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.primaryBtnText}>Confirm farm ID →</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.secondaryBtn}
              onPress={() => navigation.navigate('QueueList')}
              activeOpacity={0.8}
            >
              <Text style={s.secondaryBtnText}>View queued records</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    overflow: 'hidden',
    marginRight: 9,
  },
  logoText: { fontSize: 17, fontWeight: '600', color: C.ink2 },

  titleBlock: { alignItems: 'center', marginVertical: 28 },
  title: { fontSize: 22, fontWeight: '700', color: C.ink, marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 21,
  },

  card: {
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 14,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: C.rule,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: C.ink,
    backgroundColor: C.c050,
  },
  inputError: {
    borderColor: C.failedText,
    backgroundColor: C.failedBg,
  },
  hintText: { fontSize: 12, color: C.subtle, marginTop: 6 },
  errorText: {
    fontSize: 12,
    color: C.failedText,
    fontWeight: '500',
    marginTop: 6,
  },

  primaryBtn: {
    backgroundColor: C.c600,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  btnDisabled: { backgroundColor: C.c200 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },

  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.c600,
    marginTop: 10,
  },
  secondaryBtnText: { color: C.c600, fontSize: 15, fontWeight: '600' },
});

export default FarmIDEntryScreen;
