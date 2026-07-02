import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

const CROP_TYPES = ['Arabica', 'Robusta', 'Mixed'];

const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline, editable = true }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={f.fieldGroup}>
      <Text style={f.label}>{label}</Text>
      <View style={[f.inputWrap, focused && f.inputFocused, !editable && f.inputDisabled]}>
        <TextInput
          style={[f.input, multiline && { height: 80 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={C.subtle}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
};

export default function EditFarmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farm: initial } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const [farmName,   setFarmName]   = useState(initial?.farm_name || '');
  const [county,     setCounty]     = useState(initial?.county || '');
  const [subCounty,  setSubCounty]  = useState(initial?.sub_county || '');
  const [ward,       setWard]       = useState(initial?.ward || '');
  const [area,       setArea]       = useState(String(initial?.total_area_ha || initial?.total_area_hectares || ''));
  const [coffeeArea, setCoffeeArea] = useState(String(initial?.coffee_area_hectares || ''));
  const [cropType,   setCropType]   = useState(initial?.coffee_type || initial?.crop_type || '');
  const [notes,      setNotes]      = useState(initial?.notes || '');

  const updateRequest = initial?.update_request_notes || initial?.update_requested_notes || null;

  const handleSave = async () => {
    if (!farmName.trim()) {
      Alert.alert('Required', 'Farm name is required.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        farm_name: farmName.trim(),
        county: county.trim(),
        sub_county: subCounty.trim(),
        ward: ward.trim(),
        notes: notes.trim(),
      };
      if (area && !isNaN(Number(area))) body.total_area_ha = Number(area);
      if (coffeeArea && !isNaN(Number(coffeeArea))) body.coffee_area_hectares = Number(coffeeArea);
      if (cropType) body.crop_type = cropType;

      await farmerAPI.updateFarm(initial.id, body);

      // Try to clear the update_requested flag (non-critical if endpoint doesn't exist)
      try { await farmerAPI.acknowledgeUpdate(initial.id); } catch (_) {}

      Alert.alert(
        'Farm Updated',
        'Your farm details have been saved. The cooperative will be notified of your changes.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecapture = () => {
    if (!initial?.id) return;
    Alert.alert(
      'Recapture Boundary',
      'You will be taken to the map to re-draw the farm boundary. The existing boundary will be replaced. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => navigation.navigate('CaptureMode', {
            farmId: initial.farm_code || initial.id,
            farm: initial,
          }),
        },
      ]
    );
  };

  return (
    <View style={f.root}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <SafeAreaView style={f.topBar}>
        <TouchableOpacity style={f.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={f.topTitle} numberOfLines={1}>{initial?.farm_name || 'Edit Farm'}</Text>
          {initial?.farm_code && <Text style={f.topSub}>{initial.farm_code}</Text>}
        </View>
        <TouchableOpacity
          style={[f.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={C.white} />
            : <><Ionicons name="checkmark" size={16} color={C.white} /><Text style={f.saveBtnText}>Save</Text></>
          }
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={f.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* Update request banner */}
          {updateRequest && (
            <View style={f.requestBanner}>
              <View style={f.requestBannerIcon}>
                <Ionicons name="alert-circle" size={20} color="#d97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={f.requestBannerTitle}>Update Requested by Cooperative</Text>
                <Text style={f.requestBannerMsg}>{updateRequest}</Text>
              </View>
            </View>
          )}

          {/* Recapture boundary card */}
          <TouchableOpacity style={f.recaptureCard} onPress={handleRecapture} activeOpacity={0.85}>
            <View style={f.recaptureIconBox}>
              <Ionicons name="map" size={24} color="#1d4ed8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={f.recaptureTitle}>
                {(initial?.parcels_count || 0) > 0 ? 'Re-capture Farm Boundary' : 'Capture Farm Boundary'}
              </Text>
              <Text style={f.recaptureSub}>
                {(initial?.parcels_count || 0) > 0
                  ? 'The existing boundary will be replaced with a new GPS trace'
                  : 'Draw the farm boundary on the map to calculate accurate area'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#1d4ed8" />
          </TouchableOpacity>

          {/* Farm details */}
          <View style={f.section}>
            <Text style={f.sectionTitle}>Farm Details</Text>
            <View style={f.card}>
              <Field label="Farm Name" value={farmName} onChangeText={setFarmName} placeholder="e.g. Kiambu Coffee Farm" />
              <Field label="Total Area (hectares)" value={area} onChangeText={setArea} keyboardType="decimal-pad" placeholder="e.g. 2.5" />
              <Field label="Coffee / Crop Area (ha)" value={coffeeArea} onChangeText={setCoffeeArea} keyboardType="decimal-pad" placeholder="e.g. 1.8" />
            </View>
          </View>

          {/* Crop type chips */}
          <View style={f.section}>
            <Text style={f.sectionTitle}>Crop Type</Text>
            <View style={f.card}>
              <View style={f.chipRow}>
                {CROP_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[f.chip, cropType === t && f.chipActive]}
                    onPress={() => setCropType(t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[f.chipText, cropType === t && f.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={f.section}>
            <Text style={f.sectionTitle}>Location</Text>
            <View style={f.card}>
              <Field label="County" value={county} onChangeText={setCounty} placeholder="e.g. Kiambu" />
              <Field label="Sub-County" value={subCounty} onChangeText={setSubCounty} placeholder="e.g. Limuru" />
              <Field label="Ward" value={ward} onChangeText={setWard} placeholder="e.g. Bibirioni" />
            </View>
          </View>

          {/* Notes */}
          <View style={f.section}>
            <Text style={f.sectionTitle}>Additional Notes</Text>
            <View style={f.card}>
              <Field
                label="Notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional information about this farm…"
                multiline
              />
            </View>
          </View>

          {/* Farm code — read only */}
          {initial?.farm_code && (
            <View style={f.section}>
              <Text style={f.sectionTitle}>Farm Identity</Text>
              <View style={f.card}>
                <Field label="Farm Code" value={initial.farm_code} editable={false} />
                {initial?.id && <Field label="System ID" value={String(initial.id)} editable={false} />}
              </View>
            </View>
          )}

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const f = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, paddingLeft: 56, paddingRight: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  topSub: { fontSize: 12, color: C.muted, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.c700, paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 10,
  },
  saveBtnText: { fontSize: 13, fontWeight: '800', color: C.white },

  scroll: { padding: 16, paddingTop: 14 },

  requestBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fffbeb', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#fcd34d', marginBottom: 14,
  },
  requestBannerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  requestBannerTitle: { fontSize: 13, fontWeight: '800', color: '#92400e', marginBottom: 4 },
  requestBannerMsg: { fontSize: 13, color: '#78350f', lineHeight: 18 },

  recaptureCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#eff6ff', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#bfdbfe', marginBottom: 14,
  },
  recaptureIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  recaptureTitle: { fontSize: 14, fontWeight: '800', color: '#1e40af', marginBottom: 3 },
  recaptureSub: { fontSize: 12, color: '#3b82f6', lineHeight: 17 },

  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.steel200 },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: C.steel700, marginBottom: 6 },
  inputWrap: {
    borderWidth: 1, borderColor: C.steel300, borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: C.white, height: 42,
    flexDirection: 'row', alignItems: 'center',
  },
  inputFocused: { borderColor: C.c700, borderWidth: 1.5 },
  inputDisabled: { backgroundColor: C.steel100 },
  input: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.steel300, backgroundColor: C.white,
  },
  chipActive: { borderColor: C.c700, backgroundColor: C.c050 },
  chipText: { fontSize: 13, fontWeight: '700', color: C.muted },
  chipTextActive: { color: C.c700 },
});
