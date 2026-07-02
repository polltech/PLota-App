import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const Lbl = ({ text, required, hint }) => (
  <View style={{ marginBottom: 6 }}>
    <Text style={s.label}>{text}{required && <Text style={{ color: '#dc2626' }}> *</Text>}</Text>
    {hint ? <Text style={s.hint}>{hint}</Text> : null}
  </View>
);

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const statusColors = {
  released:              { color: '#0369a1', bg: '#e0f2fe' },
  under_satellite_review:{ color: '#7c3aed', bg: '#f5f3ff' },
  verified:              { color: '#15803d', bg: '#dcfce7' },
  draft:                 { color: '#b45309', bg: '#fef3c7' },
};

const statusBadge = (status) => statusColors[status] || { color: C.muted, bg: C.steel100 };

export default function PostHarvestScreen() {
  const navigation = useNavigation();

  // Batch list state
  const [batches,    setBatches]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Batch picker modal
  const [showPicker,   setShowPicker]   = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form fields
  const [moisture,     setMoisture]     = useState('');
  const [cupScore,     setCupScore]     = useState('');
  const [defectCount,  setDefectCount]  = useState('');
  const [sampleRef,    setSampleRef]    = useState('');
  const [labDate,      setLabDate]      = useState('');
  const [flavorNotes,  setFlavorNotes]  = useState('');
  const [processingNotes, setProcessingNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getBatches();
      const data = res.data;
      const list = Array.isArray(data) ? data : (data?.batches || []);
      // Show only batches that are verified or released (eligible for lab)
      setBatches(list.filter(b => ['released', 'under_satellite_review', 'verified'].includes(b.status)));
    } catch (e) {
      console.warn('PostHarvest load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resetForm = () => {
    setSelectedBatch(null);
    setMoisture(''); setCupScore(''); setDefectCount('');
    setSampleRef(''); setLabDate(''); setFlavorNotes('');
    setProcessingNotes('');
  };

  const handleSubmit = async () => {
    if (!selectedBatch) {
      Alert.alert('Required', 'Please select a batch.'); return;
    }
    const moistureVal = parseFloat(moisture);
    if (!moisture || isNaN(moistureVal) || moistureVal < 0 || moistureVal > 100) {
      Alert.alert('Required', 'Enter a valid moisture content (0–100%).'); return;
    }
    if (cupScore && (parseFloat(cupScore) < 0 || parseFloat(cupScore) > 100)) {
      Alert.alert('Invalid', 'Cup score must be between 0 and 100.'); return;
    }

    Alert.alert(
      'Record Lab Results',
      `Batch: ${selectedBatch.batch_reference || selectedBatch.id}\nMoisture: ${moisture}%${cupScore ? `\nCup Score: ${cupScore}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Record', style: 'default', onPress: doSubmit },
      ]
    );
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await coopAPI.addBatchLabResults(selectedBatch.id, {
        moisture_content:   parseFloat(moisture),
        cup_score:          cupScore    ? parseFloat(cupScore)    : null,
        defect_count:       defectCount ? parseInt(defectCount)   : null,
        sample_reference:   sampleRef.trim()  || null,
        lab_date:           labDate.trim()    || null,
        flavor_notes:       flavorNotes.trim() || null,
        processing_notes:   processingNotes.trim() || null,
      });
      Alert.alert(
        'Lab Results Recorded',
        `Results for batch ${selectedBatch.batch_reference || selectedBatch.id} have been saved.`,
        [{ text: 'Done', onPress: resetForm }]
      );
    } catch (e) {
      const detail = e.response?.data?.detail;
      Alert.alert('Error', typeof detail === 'string' ? detail : 'Failed to save lab results.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <View>
              <Text style={s.heroTitle}>Post-Harvest Lab</Text>
              <Text style={s.heroSub}>Record moisture, cup scores and lab results</Text>
            </View>
            <Ionicons name="flask-outline" size={28} color="rgba(255,255,255,0.7)" />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Batch selector */}
          <View style={s.section}>
            <View style={s.stepHeader}>
              <View style={s.stepBadge}><Text style={s.stepBadgeText}>1</Text></View>
              <Text style={s.stepTitle}>Select Batch</Text>
            </View>

            {selectedBatch ? (
              <TouchableOpacity
                style={s.selectedCard}
                onPress={() => setSelectedBatch(null)}
                activeOpacity={0.8}
              >
                <View style={s.selectedLeft}>
                  <View style={s.batchIcon}>
                    <Ionicons name="layers-outline" size={18} color={C.c700} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.selectedName}>{selectedBatch.batch_reference || `Batch #${selectedBatch.id}`}</Text>
                    <Text style={s.selectedSub}>
                      {selectedBatch.total_weight_kg ? `${Number(selectedBatch.total_weight_kg).toFixed(0)} kg` : ''}
                      {selectedBatch.delivery_count ? `  ·  ${selectedBatch.delivery_count} deliveries` : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="close-circle" size={20} color={C.subtle} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.pickBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                <Ionicons name="layers-outline" size={16} color={C.c700} />
                <Text style={s.pickBtnText}>Choose a batch…</Text>
                <Ionicons name="chevron-down" size={16} color={C.subtle} />
              </TouchableOpacity>
            )}
          </View>

          {/* Lab fields — only show when batch selected */}
          {selectedBatch && (
            <>
              {/* Moisture & Cup Score */}
              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>2</Text></View>
                  <Text style={s.stepTitle}>Quality Measurements</Text>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Lbl text="Moisture Content (%)" required hint="Target: 10–12%" />
                    <TextInput
                      style={[s.input, parseFloat(moisture) > 13 && s.inputWarn]}
                      value={moisture}
                      onChangeText={setMoisture}
                      keyboardType="decimal-pad"
                      placeholder="11.5"
                      placeholderTextColor={C.subtle}
                    />
                    {parseFloat(moisture) > 13 && (
                      <Text style={s.warnText}>Above 13% — risk of mould</Text>
                    )}
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Lbl text="Cup Score" hint="0–100 scale" />
                    <TextInput
                      style={s.input}
                      value={cupScore}
                      onChangeText={setCupScore}
                      keyboardType="decimal-pad"
                      placeholder="84.5"
                      placeholderTextColor={C.subtle}
                    />
                    {cupScore && parseFloat(cupScore) >= 80 && (
                      <Text style={s.goodText}>Specialty grade ✓</Text>
                    )}
                  </View>
                </View>

                <Lbl text="Defect Count" hint="Number of defective beans per 300g sample" />
                <TextInput
                  style={s.input}
                  value={defectCount}
                  onChangeText={setDefectCount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={C.subtle}
                />
              </View>

              {/* Lab reference */}
              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>3</Text></View>
                  <Text style={s.stepTitle}>Lab Reference</Text>
                </View>

                <View style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Lbl text="Sample Reference" />
                    <TextInput
                      style={s.input}
                      value={sampleRef}
                      onChangeText={setSampleRef}
                      placeholder="e.g. LAB-2025-001"
                      placeholderTextColor={C.subtle}
                      autoCapitalize="characters"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Lbl text="Lab Date" hint="YYYY-MM-DD" />
                    <TextInput
                      style={s.input}
                      value={labDate}
                      onChangeText={setLabDate}
                      placeholder="2025-06-15"
                      placeholderTextColor={C.subtle}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </View>

              {/* Notes */}
              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>4</Text></View>
                  <Text style={s.stepTitle}>Tasting & Processing Notes</Text>
                </View>

                <Lbl text="Flavor Notes" hint="Aroma, acidity, body, sweetness, aftertaste" />
                <TextInput
                  style={[s.input, s.textarea]}
                  value={flavorNotes}
                  onChangeText={setFlavorNotes}
                  placeholder="e.g. Bright citrus acidity, floral aroma, medium body, berry sweetness…"
                  placeholderTextColor={C.subtle}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Lbl text="Processing Notes" hint="Washing, drying conditions, any anomalies" />
                <TextInput
                  style={[s.input, s.textarea]}
                  value={processingNotes}
                  onChangeText={setProcessingNotes}
                  placeholder="e.g. Washed, dried on raised beds for 18 days, moisture stable at 11.2%…"
                  placeholderTextColor={C.subtle}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[s.submitBtn, submitting && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color={C.white} />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                      <Text style={s.submitText}>Record Lab Results</Text>
                    </>
                }
              </TouchableOpacity>
            </>
          )}

          {!selectedBatch && batches.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="flask-outline" size={44} color={C.steel300} />
              <Text style={s.emptyTitle}>No eligible batches</Text>
              <Text style={s.emptyMsg}>
                Lab results can be added to batches that have been released for satellite review or verified.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Batch picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={s.pickerSheet}>
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>Select Batch</Text>
            {batches.length === 0 ? (
              <Text style={s.pickerEmpty}>No eligible batches available.</Text>
            ) : (
              <FlatList
                data={batches}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const sb = statusBadge(item.status);
                  return (
                    <TouchableOpacity
                      style={s.pickerItem}
                      onPress={() => { setSelectedBatch(item); setShowPicker(false); }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <Text style={s.pickerItemRef}>{item.batch_reference || `Batch #${item.id}`}</Text>
                          <View style={[s.statusPill, { backgroundColor: sb.bg }]}>
                            <Text style={[s.statusPillText, { color: sb.color }]}>{item.status?.replace(/_/g, ' ')}</Text>
                          </View>
                        </View>
                        <Text style={s.pickerItemMeta}>
                          {item.total_weight_kg ? `${Number(item.total_weight_kg).toFixed(0)} kg` : ''}
                          {item.delivery_count  ? `  ·  ${item.delivery_count} deliveries` : ''}
                          {item.harvest_period_start ? `  ·  ${fmtDate(item.harvest_period_start)}` : ''}
                        </Text>
                        {item.moisture_content && (
                          <Text style={s.pickerItemMeta}>Moisture: {item.moisture_content}%  {item.cup_score ? `· Cup: ${item.cup_score}` : ''}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.white },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scroll: { flex: 1 },
  content: { padding: 16 },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 12, fontWeight: '900', color: C.white },
  stepTitle: { fontSize: 15, fontWeight: '800', color: C.ink },

  selectedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#bbf7d0' },
  selectedLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  batchIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c100, alignItems: 'center', justifyContent: 'center' },
  selectedName: { fontSize: 14, fontWeight: '800', color: C.ink },
  selectedSub: { fontSize: 11, color: C.muted, marginTop: 2 },

  pickBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.steel100, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: C.steel200 },
  pickBtnText: { flex: 1, fontSize: 14, color: C.c700, fontWeight: '600' },

  row: { flexDirection: 'row', marginBottom: 14 },

  label: { fontSize: 11, fontWeight: '700', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 11, color: C.subtle, marginTop: 2, marginBottom: 4 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200, marginBottom: 14 },
  inputWarn: { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
  textarea: { height: 80, paddingTop: 12 },
  warnText: { fontSize: 11, color: '#d97706', fontWeight: '700', marginTop: -10, marginBottom: 10 },
  goodText: { fontSize: 11, color: '#15803d', fontWeight: '700', marginTop: -10, marginBottom: 10 },

  emptyCard: { alignItems: 'center', backgroundColor: C.white, borderRadius: 18, padding: 32, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 18, paddingVertical: 18, marginTop: 4, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  submitText: { color: C.white, fontSize: 16, fontWeight: '800' },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginBottom: 12 },
  pickerTitle: { fontSize: 14, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  pickerEmpty: { textAlign: 'center', padding: 20, color: C.muted, fontSize: 14 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  pickerItemRef: { fontSize: 14, fontWeight: '800', color: C.ink },
  pickerItemMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800' },
});
