import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { polygonAPI } from '../services/api';
import { C } from '../theme';

const FarmIDEntryScreen = () => {
  const [farmId, setFarmId] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [focused, setFocused] = useState(false);
  const navigation = useNavigation();

  const hasError = touched && !farmId.trim();

  const handleContinue = async () => {
    setTouched(true);
    setApiError(null);
    if (!farmId.trim()) return;

    setIsLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected && net.isInternetReachable !== false) {
        try {
          const res = await polygonAPI.getFarm(farmId.trim());
          if (res.status === 200) {
            navigation.navigate('FarmConfirmation', { farmId: farmId.trim(), farm: res.data });
            return;
          }
        } catch (error) {
          if (error.response?.status === 404) {
            setApiError('Farm ID not found. Check the ID and try again.');
            return;
          }
        }
      }
      navigation.navigate('WalkBoundary', { farmId: farmId.trim() });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* Top bar */}
          <View style={s.topBar}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={s.topTitle}>Farm Capture</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Page heading */}
            <Text style={s.heading}>Enter Farm ID</Text>
            <Text style={s.subheading}>
              Look up an existing farm by its ID or code to capture its boundary.
            </Text>

            {/* Input card */}
            <View style={s.card}>
              <Text style={s.label}>Farm ID / Code</Text>
              <View style={[s.inputWrap, focused && s.inputWrapFocused, hasError && s.inputWrapError]}>
                <Ionicons name="search-outline" size={18} color={focused ? C.c700 : C.subtle} style={{ marginRight: 10 }} />
                <TextInput
                  style={s.input}
                  value={farmId}
                  onChangeText={v => { setFarmId(v); setTouched(false); setApiError(null); }}
                  onBlur={() => { setTouched(true); setFocused(false); }}
                  onFocus={() => setFocused(true)}
                  placeholder="e.g. KIR-001 or 1042"
                  placeholderTextColor={C.subtle}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleContinue}
                />
              </View>
              {hasError
                ? <Text style={s.errorText}>Please enter a Farm ID</Text>
                : apiError
                  ? <Text style={s.errorText}>{apiError}</Text>
                  : <Text style={s.hintText}>Verify against the farmer's documentation before proceeding.</Text>
              }

              <TouchableOpacity
                style={[s.primaryBtn, (!farmId.trim() || isLoading) && s.primaryBtnDisabled]}
                onPress={handleContinue}
                disabled={isLoading || !farmId.trim()}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.primaryBtnText}>Confirm identity</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divText}>New farm</Text>
              <View style={s.divLine} />
            </View>

            {/* Add Farm */}
            <TouchableOpacity
              style={s.addFarmBtn}
              onPress={() => navigation.navigate('AddFarm')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color={C.white} />
              <Text style={s.addFarmBtnText}>Add Farm</Text>
            </TouchableOpacity>

            {/* Queue */}
            <TouchableOpacity
              style={s.outlineBtn}
              onPress={() => navigation.navigate('QueueList')}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={C.steel700} />
              <Text style={s.outlineBtnText}>View Offline Queue</Text>
            </TouchableOpacity>

            {/* Offline note */}
            <View style={s.offlineNote}>
              <Ionicons name="wifi-outline" size={14} color={C.muted} />
              <Text style={s.offlineNoteText}>Boundary capture works offline and syncs when you reconnect.</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  safe: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  topTitle: { fontSize: 16, fontWeight: '600', color: C.ink },

  scroll: { padding: 20, paddingTop: 24 },

  heading: { fontSize: 22, fontWeight: '600', color: C.ink, marginBottom: 6 },
  subheading: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 20 },

  card: {
    backgroundColor: C.white, borderRadius: 8, padding: 20,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    marginBottom: 24,
  },

  label: { fontSize: 13, fontWeight: '600', color: C.steel700, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.steel300, borderRadius: 6,
    paddingHorizontal: 12, height: 42, backgroundColor: C.white,
  },
  inputWrapFocused: { borderColor: C.c700, borderWidth: 1.5 },
  inputWrapError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  input: { flex: 1, fontSize: 15, color: C.ink, fontWeight: '500', height: 42 },

  hintText: { fontSize: 12, color: C.subtle, marginTop: 6, lineHeight: 16 },
  errorText: { fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 6 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.c700, height: 42, borderRadius: 6, marginTop: 16,
  },
  primaryBtnDisabled: { backgroundColor: C.steel300 },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },

  divRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  divLine: { flex: 1, height: 1, backgroundColor: C.steel200 },
  divText: { fontSize: 12, color: C.subtle, fontWeight: '500' },

  addFarmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.c700, height: 42, borderRadius: 6, marginBottom: 12,
  },
  addFarmBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },

  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 42, borderRadius: 6, borderWidth: 1.5, borderColor: C.steel300,
    backgroundColor: C.white,
  },

  outlineBtnText: { fontSize: 14, fontWeight: '600', color: C.steel700 },

  offlineNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.steel200,
  },
  offlineNoteText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 17 },
});

export default FarmIDEntryScreen;
