import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { mobileAPI } from '../services/api';
import { C } from '../theme';

const LAND_USE_OPTIONS = [
  { value: 'agroforestry',   label: 'Agroforestry' },
  { value: 'monocrop',       label: 'Monocrop' },
  { value: 'mixed_cropping', label: 'Mixed Cropping' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'buffer_zone',    label: 'Buffer Zone' },
];

const LAND_USE_LABELS = Object.fromEntries(LAND_USE_OPTIONS.map(o => [o.value, o.label]));

export default function AddFarmScreen() {
  const navigation = useNavigation();

  // Form fields
  const [farmName,    setFarmName]    = useState('');
  const [farmCode,    setFarmCode]    = useState('');
  const [county,      setCounty]      = useState('');
  const [subCounty,   setSubCounty]   = useState('');
  const [coffeeTrees, setCoffeeTrees] = useState('');
  const [landUse,     setLandUse]     = useState('agroforestry');

  // UI state
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [touched,   setTouched]   = useState(false);
  const [created,   setCreated]   = useState(null); // preview data after creation

  const nameError   = touched && !farmName.trim();
  const countyError = touched && !county.trim();

  const handleCreate = async () => {
    setTouched(true);
    setError(null);
    if (!farmName.trim() || !county.trim()) return;

    setLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected || net.isInternetReachable === false) {
        setError('No internet connection. Connect and try again.');
        setLoading(false);
        return;
      }

      const payload = {
        farm_name:     farmName.trim(),
        farm_code:     farmCode.trim() || null,
        county:        county.trim(),
        sub_county:    subCounty.trim() || null,
        coffee_trees:  coffeeTrees ? parseInt(coffeeTrees, 10) : null,
        land_use_type: landUse,
      };

      try {
        const res = await mobileAPI.createFarm(payload);
        setCreated(res.data);
      } catch (e) {
        // If backend says setup is missing, try to run setup once and then retry creation
        const errorDetail = e.response?.data?.detail;
        if (errorDetail && typeof errorDetail === 'string' && errorDetail.includes('/mobile/setup')) {
          console.log('Detected missing setup. Attempting auto-provisioning...');
          try {
            await mobileAPI.setup();
            // Retry creation after successful setup
            const retryRes = await mobileAPI.createFarm(payload);
            setCreated(retryRes.data);
          } catch (setupErr) {
            throw new Error('Server setup required. Please contact support.');
          }
        } else {
          throw e;
        }
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to create farm.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = () => {
    navigation.navigate('WalkBoundary', {
      farmId: created.farm_id,
      farm: {
        id: created.farm_id,
        farm_code: created.farm_code,
        farm_name: created.farm_name,
        status: 'admin_approved',
      },
    });
  };

  // ── Preview (shown after successful creation) ────────────────────────────────
  if (created) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
          style={s.bgImage}
        >
          <View style={s.overlay} />
          <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={s.topBar}>
                <View style={{ width: 60 }} />
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                {/* Success badge */}
                <View style={s.successBadge}>
                  <Text style={s.successBadgeText}>✓ Farm Created</Text>
                </View>

                <Text style={s.title}>{created.farm_name}</Text>
                <Text style={s.previewSubtitle}>Review details before capturing the boundary</Text>

                <View style={s.divider} />

                <PreviewRow label="Farm Code"     value={created.farm_code} highlight />
                <PreviewRow label="County"        value={created.county} />
                {created.sub_county ? <PreviewRow label="Sub-County" value={created.sub_county} /> : null}
                <PreviewRow label="Land Use"      value={LAND_USE_LABELS[created.land_use_type] || created.land_use_type} />
                {created.coffee_trees ? <PreviewRow label="Coffee Trees" value={`${created.coffee_trees} trees`} /> : null}
                <PreviewRow label="Farmer"        value={created.farmer} />
                <PreviewRow label="Cooperative"   value={created.cooperative} />
                <PreviewRow label="Status"        value="Admin Approved" statusGreen />

                <View style={s.divider} />

                <View style={s.codeBox}>
                  <Text style={s.codeBoxLabel}>Use this code to load this farm later</Text>
                  <Text style={s.codeBoxCode}>{created.farm_code}</Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleCapture} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>Capture Boundary Now →</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => navigation.navigate('FarmIDEntry')}
                  activeOpacity={0.7}
                >
                  <Text style={s.secondaryBtnText}>Done — Capture Later</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                  <Text style={s.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                <Text style={s.title}>Add Farm</Text>
                <Text style={s.subtitle}>
                  Enter basic farm details. You'll capture the boundary next.
                </Text>

                {/* Farm Name */}
                <Field label="Farm Name *">
                  <TextInput
                    style={[s.input, nameError && s.inputError]}
                    value={farmName}
                    onChangeText={setFarmName}
                    placeholder="e.g. Kibaki Farm"
                    placeholderTextColor={C.subtle}
                    returnKeyType="next"
                  />
                  {nameError && <Text style={s.errText}>Farm name is required</Text>}
                </Field>

                {/* Farm Code */}
                <Field label="Farm Code (optional)">
                  <TextInput
                    style={s.input}
                    value={farmCode}
                    onChangeText={t => setFarmCode(t.toUpperCase())}
                    placeholder="e.g. KIR-001  (auto-generated if blank)"
                    placeholderTextColor={C.subtle}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />
                  <Text style={s.fieldHint}>
                    This code is used to load the farm in the polygon capture flow.
                  </Text>
                </Field>

                {/* County */}
                <Field label="County *">
                  <TextInput
                    style={[s.input, countyError && s.inputError]}
                    value={county}
                    onChangeText={setCounty}
                    placeholder="e.g. Kirinyaga"
                    placeholderTextColor={C.subtle}
                    returnKeyType="next"
                  />
                  {countyError && <Text style={s.errText}>County is required</Text>}
                </Field>

                {/* Sub-County */}
                <Field label="Sub-County">
                  <TextInput
                    style={s.input}
                    value={subCounty}
                    onChangeText={setSubCounty}
                    placeholder="e.g. Mwea"
                    placeholderTextColor={C.subtle}
                    returnKeyType="next"
                  />
                </Field>

                {/* Coffee Trees */}
                <Field label="Est. Coffee Trees">
                  <TextInput
                    style={s.input}
                    value={coffeeTrees}
                    onChangeText={setCoffeeTrees}
                    placeholder="e.g. 500"
                    placeholderTextColor={C.subtle}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </Field>

                {/* Land Use Type */}
                <Field label="Land Use Type">
                  <View style={s.chipRow}>
                    {LAND_USE_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.chip, landUse === opt.value && s.chipActive]}
                        onPress={() => setLandUse(opt.value)}
                        activeOpacity={0.75}
                      >
                        <Text style={[s.chipText, landUse === opt.value && s.chipTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Field>

                {error ? <Text style={s.globalError}>{error}</Text> : null}

                <TouchableOpacity
                  style={[s.primaryBtn, (loading || !farmName.trim() || !county.trim()) && s.btnDisabled]}
                  onPress={handleCreate}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={s.primaryBtnText}>Create Farm</Text>
                  }
                </TouchableOpacity>

                <Text style={s.hint}>
                  Farm will be auto-approved and ready for polygon capture.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function Field({ label, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function PreviewRow({ label, value, highlight, statusGreen }) {
  return (
    <View style={s.previewRow}>
      <Text style={s.previewLabel}>{label}</Text>
      <Text style={[
        s.previewValue,
        highlight && s.previewValueHighlight,
        statusGreen && s.previewValueGreen,
      ]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage:   { flex: 1, width: '100%', height: '100%' },
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.50)' },
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 10 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 16,
  },
  backBtn:   { padding: 8, width: 60 },
  backText:  { color: C.white, fontSize: 16, fontWeight: '700' },
  appTitle:  { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 2 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },

  title:    { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B6B6B', lineHeight: 20, marginBottom: 22 },

  fieldWrap: { marginBottom: 18 },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: C.c700,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F0EC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8DDD5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  inputError:  { borderColor: '#C62828', backgroundColor: '#FFF5F5' },
  errText:     { fontSize: 12, color: '#C62828', fontWeight: '700', marginTop: 6, marginLeft: 2 },
  fieldHint:   { fontSize: 11, color: '#9E9E9E', marginTop: 6, marginLeft: 2, fontStyle: 'italic' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E8DDD5',
    backgroundColor: '#F5F0EC',
  },
  chipActive:     { backgroundColor: C.c700, borderColor: C.c700 },
  chipText:       { fontSize: 13, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  globalError: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '700',
    marginBottom: 14,
    marginTop: -4,
    backgroundColor: '#FFF5F5',
    padding: 10,
    borderRadius: 10,
  },

  primaryBtn: {
    backgroundColor: C.c700,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: C.c700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled:    { backgroundColor: '#D1C4BC', shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  hint: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },

  // ── Preview styles ─────────────────────────────────────────────────────────
  successBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  successBadgeText: { fontSize: 13, fontWeight: '800', color: '#2E7D32' },

  previewSubtitle: { fontSize: 13, color: '#6B6B6B', marginBottom: 18 },

  divider: { height: 1, backgroundColor: '#F0E8E2', marginVertical: 16 },

  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EC',
  },
  previewLabel:          { fontSize: 13, color: '#9E9E9E', fontWeight: '600', flex: 1 },
  previewValue:          { fontSize: 14, color: '#1a1a1a', fontWeight: '700', flex: 2, textAlign: 'right' },
  previewValueHighlight: { color: C.c700, fontSize: 15 },
  previewValueGreen:     { color: '#2E7D32' },

  codeBox: {
    backgroundColor: '#F5F0EC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E8DDD5',
  },
  codeBoxLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeBoxCode:  { fontSize: 26, fontWeight: '900', color: C.c700, letterSpacing: 3 },

  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8DDD5',
    marginTop: 10,
  },
  secondaryBtnText: { color: '#6B6B6B', fontSize: 15, fontWeight: '700' },
});
