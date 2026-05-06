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
  { value: 'agroforestry',  label: 'Agroforestry' },
  { value: 'monocrop',      label: 'Monocrop' },
  { value: 'mixed_cropping', label: 'Mixed Cropping' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'buffer_zone',   label: 'Buffer Zone' },
];

export default function AddFarmScreen() {
  const navigation = useNavigation();

  const [farmName,    setFarmName]    = useState('');
  const [county,      setCounty]      = useState('');
  const [subCounty,   setSubCounty]   = useState('');
  const [village,     setVillage]     = useState('');
  const [coffeeTrees, setCoffeeTrees] = useState('');
  const [landUse,     setLandUse]     = useState('agroforestry');

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [touched,  setTouched]  = useState(false);

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
        return;
      }

      const res = await mobileAPI.createFarm({
        farm_name:    farmName.trim(),
        county:       county.trim(),
        sub_county:   subCounty.trim() || null,
        village:      village.trim() || null,
        coffee_trees: coffeeTrees ? parseInt(coffeeTrees, 10) : null,
        land_use_type: landUse,
      });

      const { farm_id, farm_code, farm_name: createdName } = res.data;

      // Go straight to polygon capture
      navigation.navigate('WalkBoundary', {
        farmId: farm_id,
        farm: {
          id: farm_id,
          farm_code,
          farm_name: createdName,
          status: 'admin_approved',
        },
      });
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to create farm.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

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
              {/* Header */}
              <View style={s.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                  <Text style={s.backText}>← Back</Text>
                </TouchableOpacity>
                <Text style={s.appTitle}>PLOTRA</Text>
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

                {/* Village */}
                <Field label="Village">
                  <TextInput
                    style={s.input}
                    value={village}
                    onChangeText={setVillage}
                    placeholder="e.g. Karura"
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
                    : <Text style={s.primaryBtnText}>Create Farm & Map Boundary</Text>
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
  backBtn:   { padding: 8 },
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

  title:    { fontSize: 28, fontWeight: '800', color: C.c900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 22 },

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
    backgroundColor: C.steel100,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.steel200,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: C.c900,
    fontWeight: '600',
  },
  inputError: { borderColor: C.failedText, backgroundColor: C.failedBg },
  errText:    { fontSize: 12, color: C.failedText, fontWeight: '700', marginTop: 6, marginLeft: 2 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.steel200,
    backgroundColor: C.steel100,
  },
  chipActive:     { backgroundColor: C.c700, borderColor: C.c700 },
  chipText:       { fontSize: 13, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  globalError: {
    fontSize: 13,
    color: C.failedText,
    fontWeight: '700',
    marginBottom: 14,
    marginTop: -4,
    backgroundColor: C.failedBg,
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
  btnDisabled:    { backgroundColor: C.steel300, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  hint: {
    fontSize: 12,
    color: C.subtle,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
});
