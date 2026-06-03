import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const INTERCROP_SPECIES = ['Avocado','Macadamia','Banana','Tea','Citrus','Other'];
const PREVIOUS_LAND_USE = [
  { value: 'Forest', label: 'Forest' },
  { value: 'Pasture', label: 'Pasture' },
  { value: 'Cropland', label: 'Cropland' },
  { value: 'Other', label: 'Other' },
];

function Field({ label, hint, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label}</Text>
      {children}
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
    </View>
  );
}

function Input(props) {
  return (
    <TextInput style={s.input} placeholderTextColor={C.subtle} {...props} />
  );
}

function ChipGroup({ options, value, onChange, multi }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const v = opt.value ?? opt;
        const label = opt.label ?? opt;
        const isActive = multi ? selected.includes(v) : selected === v;
        return (
          <TouchableOpacity
            key={v}
            style={[s.chip, isActive && s.chipActive]}
            onPress={() => {
              if (multi) onChange(isActive ? selected.filter(x => x !== v) : [...selected, v]);
              else onChange(isActive ? '' : v);
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, isActive && s.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function YesNo({ value, onChange }) {
  return (
    <View style={s.yesNoRow}>
      {[true, false].map((v) => (
        <TouchableOpacity
          key={String(v)}
          style={[s.yesNoBtn, value === v && s.yesNoBtnActive]}
          onPress={() => onChange(v)}
          activeOpacity={0.8}
        >
          <Text style={[s.yesNoText, value === v && s.yesNoTextActive]}>{v ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function AdvancedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { formData, polygonData } = route.params || {};

  const [intercroppedSpecies, setIntercroppedSpecies] = useState([]);
  const [shadeTrees,          setShadeTrees]          = useState(null);
  const [shadeCanopy,         setShadeCanopy]         = useState('');
  const [agroforestryYear,    setAgroforestryYear]    = useState('');
  const [lastPruning,         setLastPruning]         = useState('');
  const [lastHarvesting,      setLastHarvesting]      = useState('');
  const [recentPlanting,      setRecentPlanting]      = useState('');
  const [farmEstYear,         setFarmEstYear]         = useState('');
  const [previousLandUse,     setPreviousLandUse]     = useState('');
  const [ngoSupport,          setNgoSupport]          = useState('');

  const handleNext = () => {
    navigation.navigate('ReviewFarm', {
      formData: {
        ...formData,
        intercroppedSpecies,
        shadeTrees,
        shadeCanopy: shadeTrees && shadeCanopy ? parseInt(shadeCanopy) : null,
        agroforestryYear: agroforestryYear ? parseInt(agroforestryYear) : null,
        lastPruning:      lastPruning.trim() || null,
        lastHarvesting:   lastHarvesting.trim() || null,
        recentPlanting:   recentPlanting.trim() || null,
        farmEstYear:      farmEstYear ? parseInt(farmEstYear) : null,
        previousLandUse:  previousLandUse || null,
        ngoSupport:       ngoSupport.trim() || null,
      },
      polygonData,
    });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Advanced Details</Text>
            <Text style={s.subtitle}>Optional — improves compliance score</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Agroforestry & Intercropping</Text>

              <Field label="Intercropped Species" hint="Select all that apply">
                <ChipGroup options={INTERCROP_SPECIES} value={intercroppedSpecies} onChange={setIntercroppedSpecies} multi />
              </Field>

              <Field label="Shade Trees Present?">
                <YesNo value={shadeTrees} onChange={setShadeTrees} />
              </Field>

              {shadeTrees && (
                <Field label="Shade Canopy (%)">
                  <Input value={shadeCanopy} onChangeText={setShadeCanopy} placeholder="e.g. 30" keyboardType="numeric" />
                </Field>
              )}

              <Field label="Agroforestry Start Year">
                <Input value={agroforestryYear} onChangeText={setAgroforestryYear} placeholder="e.g. 2018" keyboardType="numeric" />
              </Field>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Practice Log</Text>

              <View style={s.row}>
                <View style={s.half}>
                  <Field label="Last Pruning" hint="YYYY-MM-DD">
                    <Input value={lastPruning} onChangeText={setLastPruning} placeholder="2025-03-15" />
                  </Field>
                </View>
                <View style={{ width: 12 }} />
                <View style={s.half}>
                  <Field label="Last Harvesting" hint="YYYY-MM-DD">
                    <Input value={lastHarvesting} onChangeText={setLastHarvesting} placeholder="2025-01-10" />
                  </Field>
                </View>
              </View>

              <Field label="Recent Planting Event">
                <Input value={recentPlanting} onChangeText={setRecentPlanting} placeholder="e.g. 50 Grevillea trees, March 2025" />
              </Field>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>Farm History</Text>

              <Field label="Year Farm Established">
                <Input value={farmEstYear} onChangeText={setFarmEstYear} placeholder="e.g. 1998" keyboardType="numeric" />
              </Field>

              <Field label="Previous Land Use">
                <ChipGroup options={PREVIOUS_LAND_USE} value={previousLandUse} onChange={setPreviousLandUse} />
              </Field>

              <Field label="NGO / Programme Support">
                <Input value={ngoSupport} onChangeText={setNgoSupport} placeholder="e.g. TechnoServe, 2020-2023" />
              </Field>
            </View>

            <View style={s.navRow}>
              <TouchableOpacity style={s.navBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Text style={s.navBackText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.navNext} onPress={handleNext} activeOpacity={0.85}>
                <Text style={s.navNextText}>Next: Review</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  backBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 18, fontWeight: '800', color: C.ink },
  subtitle:  { fontSize: 12, color: C.muted, marginTop: 1 },

  content: { padding: 20 },
  section: { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },

  row:  { flexDirection: 'row' },
  half: { flex: 1 },

  fieldWrap: { marginBottom: 16 },
  label:     { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  hint:      { fontSize: 11, color: C.subtle, marginTop: 4, fontStyle: 'italic' },
  input:     { backgroundColor: C.steel100, borderRadius: 12, borderWidth: 1.5, borderColor: C.steel200, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink, fontWeight: '600' },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100 },
  chipActive:     { backgroundColor: C.c700, borderColor: C.c700 },
  chipText:       { fontSize: 12, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  yesNoRow:       { flexDirection: 'row', gap: 10 },
  yesNoBtn:       { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: C.steel200, alignItems: 'center', justifyContent: 'center', backgroundColor: C.steel100 },
  yesNoBtnActive: { backgroundColor: C.c700, borderColor: C.c700 },
  yesNoText:      { fontSize: 14, fontWeight: '700', color: C.c700 },
  yesNoTextActive:{ color: C.white },

  navRow:     { flexDirection: 'row', gap: 12, marginTop: 8 },
  navBack:    { flex: 1, height: 54, borderRadius: 14, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  navBackText:{ fontSize: 15, fontWeight: '800', color: C.steel600 },
  navNext:    { flex: 2, height: 54, backgroundColor: C.c700, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navNextText:{ fontSize: 15, fontWeight: '800', color: C.white },
});
