import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, ImageBackground, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { mobileAPI } from '../services/api';
import { C } from '../theme';

// ── Static data ───────────────────────────────────────────────────────────────
const LAND_USE_OPTIONS = [
  { value: 'agroforestry',   label: 'Agroforestry' },
  { value: 'monocrop',       label: 'Monocrop' },
  { value: 'mixed_cropping', label: 'Mixed Cropping' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'buffer_zone',    label: 'Buffer Zone' },
];

const SOIL_OPTIONS = [
  { value: 'red_volcanic', label: 'Red Volcanic' },
  { value: 'loam',         label: 'Loam' },
  { value: 'clay',         label: 'Clay' },
  { value: 'sandy_loam',   label: 'Sandy Loam' },
  { value: 'black_cotton', label: 'Black Cotton' },
];

const COFFEE_VARIETIES = [
  'SL28', 'SL34', 'Ruiru 11', 'Batian', 'K7', 'Blue Mountain', 'Robusta',
];

const TERRAIN_OPTIONS = [
  { value: 'flat',       label: 'Flat' },
  { value: 'gentle',     label: 'Gentle Slope' },
  { value: 'steep',      label: 'Steep Slope' },
  { value: 'undulating', label: 'Undulating' },
];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

const LAND_USE_LABELS = Object.fromEntries(LAND_USE_OPTIONS.map(o => [o.value, o.label]));

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}{required && <Text style={s.req}> *</Text>}</Text>
      {children}
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function Input({ error, ...props }) {
  return (
    <TextInput
      style={[s.input, error && s.inputError]}
      placeholderTextColor={C.subtle}
      {...props}
    />
  );
}

function ChipGroup({ options, value, onChange, multi }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const isActive = multi ? selected.includes(opt.value ?? opt) : selected === (opt.value ?? opt);
        return (
          <TouchableOpacity
            key={opt.value ?? opt}
            style={[s.chip, isActive && s.chipActive]}
            onPress={() => {
              if (multi) {
                onChange(isActive
                  ? selected.filter(v => v !== (opt.value ?? opt))
                  : [...selected, opt.value ?? opt]);
              } else {
                onChange(opt.value ?? opt);
              }
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, isActive && s.chipTextActive]}>
              {opt.label ?? opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PreviewRow({ label, value, highlight, statusGreen }) {
  if (!value) return null;
  return (
    <View style={s.previewRow}>
      <Text style={s.previewLabel}>{label}</Text>
      <Text style={[s.previewValue, highlight && s.previewHighlight, statusGreen && s.previewGreen]}>
        {value}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AddFarmScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState(0);

  // ── Tab 1: Farm Details ──────────────────────────────────────────────────────
  const [farmName,     setFarmName]     = useState('');
  const [farmCode,     setFarmCode]     = useState('');
  const [county,       setCounty]       = useState('');
  const [subCounty,    setSubCounty]    = useState('');
  const [ward,         setWard]         = useState('');
  const [village,      setVillage]      = useState('');
  const [landUse,      setLandUse]      = useState('agroforestry');
  const [soilType,     setSoilType]     = useState('');
  const [terrain,      setTerrain]      = useState('');
  const [elevation,    setElevation]    = useState('');
  const [coffeeTrees,  setCoffeeTrees]  = useState('');
  const [varieties,    setVarieties]    = useState([]);
  const [annualYield,  setAnnualYield]  = useState('');

  // ── Tab 2: Farmer Details ────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [phone,        setPhone]        = useState('');
  const [nationalId,   setNationalId]   = useState('');
  const [gender,       setGender]       = useState('');
  const [dob,          setDob]          = useState('');
  const [coopName,     setCoopName]     = useState('');
  const [farmerSince,  setFarmerSince]  = useState('');
  const [notes,        setNotes]        = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [touched,  setTouched]  = useState(false);
  const [created,  setCreated]  = useState(null);

  // Progress indicator
  const tabs = ['Farm Details', 'Farmer Details'];
  const farmComplete = farmName.trim() && county.trim();
  const farmerComplete = firstName.trim() && phone.trim();

  const handleNext = () => {
    if (activeTab === 0) {
      setTouched(true);
      if (!farmName.trim() || !county.trim()) return;
      setTouched(false);
      setActiveTab(1);
    } else {
      handleCreate();
    }
  };

  const handleCreate = async () => {
    setTouched(true);
    setError(null);
    if (!farmName.trim() || !county.trim()) {
      setActiveTab(0);
      return;
    }

    setLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected || net.isInternetReachable === false) {
        setError('No internet connection. Connect and try again.');
        setLoading(false);
        return;
      }

      const res = await mobileAPI.createFarm({
        farm_name:      farmName.trim(),
        farm_code:      farmCode.trim() || null,
        county:         county.trim(),
        sub_county:     subCounty.trim() || null,
        ward:           ward.trim() || null,
        village:        village.trim() || null,
        land_use_type:  landUse,
        soil_type:      soilType || null,
        terrain:        terrain || null,
        elevation_m:    elevation ? parseInt(elevation) : null,
        coffee_trees:   coffeeTrees ? parseInt(coffeeTrees) : null,
        coffee_varieties: varieties.length > 0 ? varieties : null,
        average_annual_production_kg: annualYield ? parseFloat(annualYield) : null,
        farmer_first_name: firstName.trim() || null,
        farmer_last_name:  lastName.trim() || null,
        farmer_phone:      phone.trim() || null,
        national_id:       nationalId.trim() || null,
        gender:            gender || null,
        date_of_birth:     dob.trim() || null,
        cooperative_name:  coopName.trim() || null,
        farmer_since:      farmerSince.trim() || null,
        notes:             notes.trim() || null,
      });

      setCreated(res.data);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to add farm.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureBoundary = () => {
    navigation.navigate('WalkBoundary', {
      farmId: created.farm_id || created.id,
      farm: {
        id: created.farm_id || created.id,
        farm_code: created.farm_code,
        farm_name: created.farm_name,
        status: 'admin_approved',
      },
    });
  };

  // ── Success view ──────────────────────────────────────────────────────────────
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
                <View style={s.successBadge}>
                  <Text style={s.successBadgeText}>✓ Farm Added</Text>
                </View>

                <Text style={s.title}>{created.farm_name}</Text>
                <Text style={s.previewSubtitle}>Review all details before capturing the farm boundary</Text>

                <View style={s.divider} />
                <Text style={s.previewSection}>Farm</Text>
                <PreviewRow label="Farm Code"    value={created.farm_code} highlight />
                <PreviewRow label="County"       value={created.county} />
                <PreviewRow label="Sub-County"   value={created.sub_county} />
                <PreviewRow label="Ward"         value={created.ward} />
                <PreviewRow label="Village"      value={created.village} />
                <PreviewRow label="Land Use"     value={LAND_USE_LABELS[created.land_use_type] || created.land_use_type} />
                <PreviewRow label="Soil Type"    value={created.soil_type} />
                <PreviewRow label="Terrain"      value={created.terrain} />
                <PreviewRow label="Elevation"    value={created.elevation_m ? `${created.elevation_m} m` : null} />
                <PreviewRow label="Coffee Trees" value={created.coffee_trees ? `${created.coffee_trees.toLocaleString()} trees` : null} />
                <PreviewRow label="Varieties"    value={created.coffee_varieties?.join(', ')} />
                <PreviewRow label="Annual Yield" value={created.average_annual_production_kg ? `${created.average_annual_production_kg} kg` : null} />

                <View style={s.divider} />
                <Text style={s.previewSection}>Farmer</Text>
                <PreviewRow label="Name"         value={[created.farmer_first_name, created.farmer_last_name].filter(Boolean).join(' ') || created.farmer} />
                <PreviewRow label="Phone"        value={created.farmer_phone} />
                <PreviewRow label="National ID"  value={created.national_id} />
                <PreviewRow label="Gender"       value={created.gender} />
                <PreviewRow label="Cooperative"  value={created.cooperative_name || created.cooperative} />
                <PreviewRow label="Farmer Since" value={created.farmer_since} />
                <PreviewRow label="Status"       value="Admin Approved" statusGreen />

                <View style={s.divider} />
                <View style={s.codeBox}>
                  <Text style={s.codeBoxLabel}>Farm code for future reference</Text>
                  <Text style={s.codeBoxCode}>{created.farm_code}</Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleCaptureBoundary} activeOpacity={0.8}>
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

  // ── Form view ─────────────────────────────────────────────────────────────────
  const nameError   = touched && !farmName.trim();
  const countyError = touched && !county.trim();

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Top bar */}
              <View style={s.topBar}>
                <TouchableOpacity onPress={() => activeTab === 0 ? navigation.goBack() : setActiveTab(0)} style={s.backBtn}>
                  <Text style={s.backText}>← {activeTab === 0 ? 'Back' : 'Farm'}</Text>
                </TouchableOpacity>
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                {/* Header */}
                <Text style={s.title}>Add Farm</Text>
                <Text style={s.subtitle}>
                  {activeTab === 0
                    ? 'Enter farm location and production details. All starred fields are required.'
                    : 'Enter farmer information. This is linked to the farm profile.'}
                </Text>

                {/* Progress tabs */}
                <View style={s.progressRow}>
                  {tabs.map((t, i) => {
                    const done = i === 0 ? farmComplete : farmerComplete;
                    const active = activeTab === i;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[s.progressTab, active && s.progressTabActive]}
                        onPress={() => {
                          if (i === 1 && !farmComplete) {
                            setTouched(true);
                            return;
                          }
                          setTouched(false);
                          setActiveTab(i);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[s.progressDot, active && s.progressDotActive, done && !active && s.progressDotDone]}>
                          <Text style={[s.progressDotText, (active || done) && s.progressDotTextDone]}>
                            {done && !active ? '✓' : i + 1}
                          </Text>
                        </View>
                        <Text style={[s.progressLabel, active && s.progressLabelActive]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── TAB 1: Farm Details ──────────────────────────────────────── */}
                {activeTab === 0 && (
                  <>
                    <Field label="Farm Name" required>
                      <Input
                        value={farmName}
                        onChangeText={setFarmName}
                        placeholder="e.g. Kibaki Coffee Farm"
                        returnKeyType="next"
                        error={nameError}
                      />
                      {nameError && <Text style={s.errText}>Farm name is required</Text>}
                    </Field>

                    <Field label="Farm Code" hint="Auto-generated if left blank. Used to identify the farm in the capture flow.">
                      <Input
                        value={farmCode}
                        onChangeText={(t) => setFarmCode(t.toUpperCase())}
                        placeholder="e.g. KIR-001"
                        autoCapitalize="characters"
                        returnKeyType="next"
                      />
                    </Field>

                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Field label="County" required>
                          <Input
                            value={county}
                            onChangeText={setCounty}
                            placeholder="e.g. Kirinyaga"
                            returnKeyType="next"
                            error={countyError}
                          />
                          {countyError && <Text style={s.errText}>Required</Text>}
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={{ flex: 1 }}>
                        <Field label="Sub-County">
                          <Input
                            value={subCounty}
                            onChangeText={setSubCounty}
                            placeholder="e.g. Mwea"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                    </View>

                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Field label="Ward">
                          <Input
                            value={ward}
                            onChangeText={setWard}
                            placeholder="e.g. Tebere"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={{ flex: 1 }}>
                        <Field label="Village">
                          <Input
                            value={village}
                            onChangeText={setVillage}
                            placeholder="e.g. Kamuthe"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                    </View>

                    <Field label="Land Use Type">
                      <ChipGroup options={LAND_USE_OPTIONS} value={landUse} onChange={setLandUse} />
                    </Field>

                    <Field label="Terrain">
                      <ChipGroup options={TERRAIN_OPTIONS} value={terrain} onChange={setTerrain} />
                    </Field>

                    <Field label="Soil Type">
                      <ChipGroup options={SOIL_OPTIONS} value={soilType} onChange={setSoilType} />
                    </Field>

                    <Field label="Elevation (m above sea level)">
                      <Input
                        value={elevation}
                        onChangeText={setElevation}
                        placeholder="e.g. 1600"
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </Field>

                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Field label="Coffee Trees">
                          <Input
                            value={coffeeTrees}
                            onChangeText={setCoffeeTrees}
                            placeholder="e.g. 500"
                            keyboardType="numeric"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={{ flex: 1 }}>
                        <Field label="Avg Annual Yield (kg)">
                          <Input
                            value={annualYield}
                            onChangeText={setAnnualYield}
                            placeholder="e.g. 800"
                            keyboardType="numeric"
                            returnKeyType="done"
                          />
                        </Field>
                      </View>
                    </View>

                    <Field label="Coffee Varieties" hint="Select all that apply">
                      <ChipGroup options={COFFEE_VARIETIES} value={varieties} onChange={setVarieties} multi />
                    </Field>
                  </>
                )}

                {/* ── TAB 2: Farmer Details ────────────────────────────────────── */}
                {activeTab === 1 && (
                  <>
                    <View style={s.row}>
                      <View style={{ flex: 1 }}>
                        <Field label="First Name">
                          <Input
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="e.g. James"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={{ flex: 1 }}>
                        <Field label="Last Name">
                          <Input
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="e.g. Kamau"
                            returnKeyType="next"
                          />
                        </Field>
                      </View>
                    </View>

                    <Field label="Phone Number">
                      <Input
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+254700000000"
                        keyboardType="phone-pad"
                        returnKeyType="next"
                      />
                    </Field>

                    <Field label="National ID">
                      <Input
                        value={nationalId}
                        onChangeText={setNationalId}
                        placeholder="e.g. 12345678"
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </Field>

                    <Field label="Gender">
                      <ChipGroup options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                    </Field>

                    <Field label="Date of Birth (YYYY-MM-DD)">
                      <Input
                        value={dob}
                        onChangeText={setDob}
                        placeholder="e.g. 1980-06-15"
                        keyboardType="numbers-and-punctuation"
                        returnKeyType="next"
                      />
                    </Field>

                    <Field label="Cooperative Name">
                      <Input
                        value={coopName}
                        onChangeText={setCoopName}
                        placeholder="e.g. Mwea Coffee Cooperative"
                        returnKeyType="next"
                      />
                    </Field>

                    <Field label="Farmer Since (Year)">
                      <Input
                        value={farmerSince}
                        onChangeText={setFarmerSince}
                        placeholder="e.g. 2005"
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    </Field>

                    <Field label="Additional Notes">
                      <TextInput
                        style={[s.input, s.textarea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any additional observations about the farm or farmer..."
                        placeholderTextColor={C.subtle}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </Field>
                  </>
                )}

                {error ? <Text style={s.globalError}>{error}</Text> : null}

                {/* Navigation buttons */}
                <View style={s.btnRow}>
                  {activeTab === 0 ? (
                    <TouchableOpacity
                      style={[s.primaryBtn, (!farmName.trim() || !county.trim()) && s.btnDisabled]}
                      onPress={handleNext}
                      activeOpacity={0.8}
                    >
                      <Text style={s.primaryBtnText}>Next: Farmer Details →</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={s.outlineBtn} onPress={() => setActiveTab(0)} activeOpacity={0.8}>
                        <Text style={s.outlineBtnText}>← Farm</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.primaryBtn, { flex: 2 }, loading && s.btnDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                        activeOpacity={0.8}
                      >
                        {loading
                          ? <ActivityIndicator color={C.white} />
                          : <Text style={s.primaryBtnText}>Add Farm</Text>
                        }
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <Text style={s.hint}>
                  Farm will be registered and ready for boundary capture.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage:   { flex: 1, width: '100%', height: '100%' },
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.50)' },
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 10 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 },
  backBtn:  { padding: 8, width: 60 },
  backText: { color: C.white, fontSize: 16, fontWeight: '700' },
  appTitle: { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 2 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 28,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: 20,
  },

  title:    { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6B6B6B', lineHeight: 20, marginBottom: 20 },

  // Progress tabs
  progressRow: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  progressTab: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F5F0EC', borderWidth: 1.5, borderColor: '#E8DDD5' },
  progressTabActive: { backgroundColor: C.c050, borderColor: C.c700 },
  progressDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E8DDD5', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: C.c700 },
  progressDotDone: { backgroundColor: '#22c55e' },
  progressDotText: { fontSize: 11, fontWeight: '800', color: '#9E9E9E' },
  progressDotTextDone: { color: C.white },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#9E9E9E', flex: 1 },
  progressLabelActive: { color: C.c700 },

  row: { flexDirection: 'row' },
  rowSpacer: { width: 12 },

  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 },
  req:   { color: C.eudrHigh },
  input: {
    backgroundColor: '#F5F0EC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8DDD5',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  textarea: { height: 80, paddingTop: 12 },
  inputError:  { borderColor: '#C62828', backgroundColor: '#FFF5F5' },
  errText:     { fontSize: 12, color: '#C62828', fontWeight: '700', marginTop: 6, marginLeft: 2 },
  fieldHint:   { fontSize: 11, color: '#9E9E9E', marginTop: 6, marginLeft: 2, fontStyle: 'italic' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8DDD5', backgroundColor: '#F5F0EC' },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText:   { fontSize: 12, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  globalError: { fontSize: 13, color: '#C62828', fontWeight: '700', marginBottom: 14, backgroundColor: '#FFF5F5', padding: 12, borderRadius: 12 },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryBtn: { flex: 1, backgroundColor: C.c700, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  btnDisabled: { backgroundColor: '#D1C4BC', shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
  outlineBtn: { flex: 1, height: 60, borderRadius: 18, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 16, fontWeight: '800', color: C.steel700 },

  hint: { fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 12, fontWeight: '500' },

  // Success / preview
  successBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: '#A5D6A7' },
  successBadgeText: { fontSize: 13, fontWeight: '800', color: '#2E7D32' },
  previewSubtitle: { fontSize: 13, color: '#6B6B6B', marginBottom: 18 },
  previewSection: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#F0E8E2', marginVertical: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F0EC' },
  previewLabel: { fontSize: 13, color: '#9E9E9E', fontWeight: '600', flex: 1 },
  previewValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '700', flex: 2, textAlign: 'right' },
  previewHighlight: { color: C.c700, fontSize: 15 },
  previewGreen: { color: '#2E7D32' },
  codeBox: { backgroundColor: '#F5F0EC', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#E8DDD5' },
  codeBoxLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeBoxCode: { fontSize: 26, fontWeight: '900', color: C.c700, letterSpacing: 3 },
  secondaryBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8DDD5', marginTop: 10 },
  secondaryBtnText: { color: '#6B6B6B', fontSize: 15, fontWeight: '700' },
});
