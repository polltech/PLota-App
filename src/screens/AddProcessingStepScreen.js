import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Alert, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const STEP_COLORS = {
  sorting: '#b45309', washing: '#0891b2', drying: '#d97706',
  milling: '#7c3aed', grading: '#15803d', packing: '#1d4ed8',
};
const STEP_ICONS = {
  sorting: 'filter-outline', washing: 'water-outline', drying: 'sunny-outline',
  milling: 'settings-outline', grading: 'ribbon-outline', packing: 'cube-outline',
};
const STEP_HINTS = {
  sorting: { weight: 'e.g. 490.0 — after removing defects', notes: 'e.g. Removed floaters & defective cherries, 5% rejected' },
  washing: { weight: 'e.g. 475.0 — after pulping & washing', notes: 'e.g. Pulped, fermented 18 hrs, mucilage fully removed' },
  drying:  { weight: 'e.g. 98.0 — dried parchment weight', notes: 'e.g. Raised beds, 21 days, turned 3× daily, 11% moisture' },
  milling: { weight: 'e.g. 85.0 — milled green bean weight', notes: 'e.g. Hulled, polished, moisture 11.5%, screen size 17' },
  grading: { weight: 'e.g. 82.0 — graded weight', notes: 'e.g. Screen 17–18, defect count 3.2%, outturn 94%' },
  packing: { weight: 'e.g. 80.0 — net packed weight', notes: 'e.g. 2 × 60 kg jute bags, lot tagged PCF-2025-001' },
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(2)} kg` : '—';

export default function AddProcessingStepScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    deliveryId, deliveryNumber, stepType,
    receivedWeight, lastWeight, lastStepLabel,
  } = route.params || {};

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate]     = useState(today);
  const [weight, setWeight] = useState('');
  const [grade, setGrade]   = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const color = STEP_COLORS[stepType] || C.c700;
  const icon  = STEP_ICONS[stepType]  || 'checkmark-outline';
  const hints = STEP_HINTS[stepType]  || {};

  const handleSave = async () => {
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Invalid date', 'Enter date as YYYY-MM-DD (e.g. 2025-06-18)');
      return;
    }
    const parsedWeight = weight.trim() ? parseFloat(weight) : undefined;
    if (parsedWeight !== undefined && isNaN(parsedWeight)) {
      Alert.alert('Invalid weight', 'Weight must be a number');
      return;
    }
    setSaving(true);
    try {
      await coopAPI.addProcessingStep(deliveryId, {
        step_type: stepType,
        step_date: date,
        weight_out_kg: parsedWeight,
        grade: stepType === 'grading' && grade.trim() ? grade.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Failed to save', e.response?.data?.detail || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <StatusBar barStyle="light-content" />

        {/* ── Header ── */}
        <View style={[s.hero, { backgroundColor: color }]}>
          <SafeAreaView>
            <View style={s.heroNav}>
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color={C.white} />
              </TouchableOpacity>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.heroTitle}>Record {cap(stepType)}</Text>
                <Text style={s.heroSub}>{deliveryNumber}</Text>
              </View>
              <View style={[s.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name={icon} size={22} color={C.white} />
              </View>
            </View>

            {/* Weight reference row */}
            <View style={s.refRow}>
              <View style={s.refItem}>
                <Text style={s.refVal}>{fmtKg(receivedWeight)}</Text>
                <Text style={s.refLbl}>Received</Text>
              </View>
              {lastStepLabel && (lastWeight ?? receivedWeight) !== receivedWeight && (
                <>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
                  <View style={s.refItem}>
                    <Text style={s.refVal}>{fmtKg(lastWeight)}</Text>
                    <Text style={s.refLbl}>After {lastStepLabel}</Text>
                  </View>
                </>
              )}
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.45)" />
              <View style={s.refItem}>
                <Text style={[s.refVal, { opacity: 0.55 }]}>? kg</Text>
                <Text style={s.refLbl}>After {cap(stepType)}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ── Form ── */}
        <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Date */}
          <Text style={s.label}>Date *</Text>
          <TextInput
            style={s.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.subtle}
          />

          {/* Weight out */}
          <Text style={s.label}>Weight Out (kg) — optional</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={hints.weight || 'Enter weight in kg'}
            placeholderTextColor={C.subtle}
          />
          <Text style={s.hint}>
            Input weight: {fmtKg(lastWeight ?? receivedWeight)} ({lastStepLabel || 'Received'})
          </Text>

          {/* Grade — only shown for grading step */}
          {stepType === 'grading' && (
            <>
              <Text style={s.label}>Grade (AA, AB, PB, C…)</Text>
              <TextInput
                style={s.input}
                value={grade}
                onChangeText={setGrade}
                placeholder="e.g. AA"
                placeholderTextColor={C.subtle}
                autoCapitalize="characters"
              />
            </>
          )}

          {/* Notes */}
          <Text style={s.label}>Notes — optional</Text>
          <TextInput
            style={[s.input, s.textarea]}
            value={notes}
            onChangeText={setNotes}
            placeholder={hints.notes || 'Processing notes…'}
            placeholderTextColor={C.subtle}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: color }, saving && { opacity: 0.65 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                <Text style={s.saveBtnText}>Save {cap(stepType)} Step</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },

  hero:     { paddingHorizontal: 20, paddingBottom: 18 },
  heroNav:  { flexDirection: 'row', alignItems: 'center', paddingTop: 14, marginBottom: 16 },
  backBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:{ fontSize: 18, fontWeight: '800', color: C.white },
  heroSub:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  refRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  refItem: { alignItems: 'center' },
  refVal:  { fontSize: 13, fontWeight: '800', color: C.white },
  refLbl:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  form: { padding: 18 },

  label: {
    fontSize: 11, fontWeight: '800', color: C.steel600,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginTop: 18, marginBottom: 8,
  },
  input: {
    backgroundColor: C.white, borderRadius: 12, height: 50,
    paddingHorizontal: 14, fontSize: 14, color: C.ink, fontWeight: '600',
    borderWidth: 1.5, borderColor: C.steel200,
  },
  textarea: { height: 110, paddingTop: 14 },
  hint: { fontSize: 11, color: C.muted, marginTop: 5, fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16, marginTop: 32,
  },
  saveBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
