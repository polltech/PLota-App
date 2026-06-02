import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const QUALITY_GRADES = ['AA', 'AB', 'PB', 'C', 'AAAA', 'ungraded'];
const CHERRY_TYPES = ['red cherry', 'mbuni', 'parchment'];

const FieldLabel = ({ label, required }) => (
  <Text style={s.label}>
    {label}{required && <Text style={{ color: C.eudrHigh }}> *</Text>}
  </Text>
);

const SelectRow = ({ options, value, onChange, placeholder }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[s.pill, value === opt && s.pillActive]}
          onPress={() => onChange(value === opt ? null : opt)}
        >
          <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

export default function CreateDeliveryScreen() {
  const navigation = useNavigation();

  const [farms, setFarms] = useState([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [farmSearch, setFarmSearch] = useState('');
  const [showFarmList, setShowFarmList] = useState(false);
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('0');
  const [qualityGrade, setQualityGrade] = useState(null);
  const [moisture, setMoisture] = useState('');
  const [cherryType, setCherryType] = useState(null);
  const [pickingDate, setPickingDate] = useState('');

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    try {
      const res = await coopAPI.getFarms();
      const d = res.data;
      setFarms(Array.isArray(d) ? d : d?.farms || []);
    } catch (e) {
      console.warn('Load farms for delivery:', e.message);
    } finally {
      setLoadingFarms(false);
    }
  };

  const filteredFarms = farmSearch
    ? farms.filter((f) =>
        (f.farm_name || f.name || '').toLowerCase().includes(farmSearch.toLowerCase()) ||
        (f.farmer_name || '').toLowerCase().includes(farmSearch.toLowerCase())
      )
    : farms.slice(0, 20);

  const netWeight = (() => {
    const g = parseFloat(grossWeight) || 0;
    const t = parseFloat(tareWeight) || 0;
    return Math.max(0, g - t).toFixed(1);
  })();

  const handleSubmit = async () => {
    if (!selectedFarm) { Alert.alert('Required', 'Please select a farm.'); return; }
    if (!grossWeight || parseFloat(grossWeight) <= 0) { Alert.alert('Required', 'Gross weight must be greater than 0.'); return; }

    Alert.alert(
      'Confirm Delivery',
      `Record ${netWeight} kg net from ${selectedFarm.farm_name || selectedFarm.name}? Grade: ${qualityGrade || 'Ungraded'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: async () => {
            setSubmitting(true);
            try {
              await coopAPI.createDelivery({
                farm_id: selectedFarm.id,
                gross_weight_kg: parseFloat(grossWeight),
                tare_weight_kg: parseFloat(tareWeight) || 0,
                quality_grade: qualityGrade || null,
                moisture_content: moisture ? parseFloat(moisture) : null,
                cherry_type: cherryType || null,
                picking_date: pickingDate ? new Date(pickingDate).toISOString() : null,
              });
              Alert.alert('Success', 'Delivery recorded successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to record delivery.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Record Delivery</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {/* Farm selector */}
        <View style={s.section}>
          <FieldLabel label="Farm" required />
          {selectedFarm ? (
            <TouchableOpacity style={s.selectedFarm} onPress={() => { setSelectedFarm(null); setShowFarmList(false); }}>
              <View style={s.selectedFarmLeft}>
                <Ionicons name="leaf" size={18} color={C.c600} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={s.selectedFarmName}>{selectedFarm.farm_name || selectedFarm.name}</Text>
                  <Text style={s.selectedFarmSub}>{selectedFarm.farmer_name || '—'}</Text>
                </View>
              </View>
              <Ionicons name="close-circle" size={18} color={C.subtle} />
            </TouchableOpacity>
          ) : (
            <>
              <TextInput
                style={s.input}
                value={farmSearch}
                onChangeText={(t) => { setFarmSearch(t); setShowFarmList(true); }}
                onFocus={() => setShowFarmList(true)}
                placeholder="Search farms..."
                placeholderTextColor={C.subtle}
              />
              {showFarmList && (
                <View style={s.farmDropdown}>
                  {loadingFarms ? (
                    <ActivityIndicator color={C.c700} style={{ padding: 16 }} />
                  ) : filteredFarms.length === 0 ? (
                    <Text style={s.dropEmpty}>No farms found</Text>
                  ) : (
                    filteredFarms.map((farm) => (
                      <TouchableOpacity
                        key={farm.id}
                        style={s.farmOption}
                        onPress={() => { setSelectedFarm(farm); setShowFarmList(false); setFarmSearch(''); }}
                      >
                        <Text style={s.farmOptionName} numberOfLines={1}>{farm.farm_name || farm.name}</Text>
                        <Text style={s.farmOptionSub} numberOfLines={1}>{farm.farmer_name || `Farm ${farm.id}`}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </View>

        {/* Weight */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Weight</Text>
          <View style={s.weightRow}>
            <View style={s.weightField}>
              <FieldLabel label="Gross Weight (kg)" required />
              <TextInput
                style={s.input}
                value={grossWeight}
                onChangeText={setGrossWeight}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={C.subtle}
              />
            </View>
            <View style={s.weightField}>
              <FieldLabel label="Tare Weight (kg)" />
              <TextInput
                style={s.input}
                value={tareWeight}
                onChangeText={setTareWeight}
                keyboardType="decimal-pad"
                placeholder="0.0"
                placeholderTextColor={C.subtle}
              />
            </View>
          </View>
          {grossWeight ? (
            <View style={s.netBadge}>
              <Ionicons name="scale-outline" size={16} color={C.eudrLow} />
              <Text style={s.netText}>Net Weight: <Text style={{ fontWeight: '800' }}>{netWeight} kg</Text></Text>
            </View>
          ) : null}
        </View>

        {/* Quality */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Quality & Grade</Text>
          <FieldLabel label="Quality Grade" />
          <SelectRow options={QUALITY_GRADES} value={qualityGrade} onChange={setQualityGrade} />

          <View style={s.fieldGap} />
          <FieldLabel label="Cherry Type" />
          <SelectRow options={CHERRY_TYPES} value={cherryType} onChange={setCherryType} />

          <View style={s.fieldGap} />
          <FieldLabel label="Moisture Content (%)" />
          <TextInput
            style={s.input}
            value={moisture}
            onChangeText={setMoisture}
            keyboardType="decimal-pad"
            placeholder="e.g. 11.5"
            placeholderTextColor={C.subtle}
          />
        </View>

        {/* Dates */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Harvest Date</Text>
          <FieldLabel label="Picking Date (YYYY-MM-DD)" />
          <TextInput
            style={s.input}
            value={pickingDate}
            onChangeText={setPickingDate}
            placeholder="2025-07-15"
            placeholderTextColor={C.subtle}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.submitBtn, (submitting || !selectedFarm) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !selectedFarm}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
              <Text style={s.submitText}>Record Delivery</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.white },

  scroll: { flex: 1 },
  content: { padding: 20 },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  fieldGap: { height: 14 },

  selectedFarm: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.c050, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: C.c200 },
  selectedFarmLeft: { flexDirection: 'row', alignItems: 'center' },
  selectedFarmName: { fontSize: 15, fontWeight: '700', color: C.ink },
  selectedFarmSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  farmDropdown: { backgroundColor: C.white, borderRadius: 12, marginTop: 4, borderWidth: 1.5, borderColor: C.steel200, maxHeight: 200, overflow: 'hidden' },
  farmOption: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmOptionName: { fontSize: 14, fontWeight: '700', color: C.ink },
  farmOptionSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  dropEmpty: { textAlign: 'center', padding: 16, color: C.muted },

  weightRow: { flexDirection: 'row', gap: 12 },
  weightField: { flex: 1 },
  netBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.eudrLowBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  netText: { fontSize: 13, color: C.eudrLow },

  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.steel100, borderWidth: 1, borderColor: C.steel200 },
  pillActive: { backgroundColor: C.c700, borderColor: C.c700 },
  pillText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  pillTextActive: { color: C.white },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 18, paddingVertical: 18, marginTop: 8, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  submitText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
