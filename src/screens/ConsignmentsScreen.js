import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'dds_submitted') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'dds_ready')     return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'rejected')      return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const EU_COUNTRIES = [
  { code: 'AT', name: 'Austria',        flag: '🇦🇹' },
  { code: 'BE', name: 'Belgium',        flag: '🇧🇪' },
  { code: 'BG', name: 'Bulgaria',       flag: '🇧🇬' },
  { code: 'CY', name: 'Cyprus',         flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DE', name: 'Germany',        flag: '🇩🇪' },
  { code: 'DK', name: 'Denmark',        flag: '🇩🇰' },
  { code: 'EE', name: 'Estonia',        flag: '🇪🇪' },
  { code: 'ES', name: 'Spain',          flag: '🇪🇸' },
  { code: 'FI', name: 'Finland',        flag: '🇫🇮' },
  { code: 'FR', name: 'France',         flag: '🇫🇷' },
  { code: 'GR', name: 'Greece',         flag: '🇬🇷' },
  { code: 'HR', name: 'Croatia',        flag: '🇭🇷' },
  { code: 'HU', name: 'Hungary',        flag: '🇭🇺' },
  { code: 'IE', name: 'Ireland',        flag: '🇮🇪' },
  { code: 'IT', name: 'Italy',          flag: '🇮🇹' },
  { code: 'LT', name: 'Lithuania',      flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg',     flag: '🇱🇺' },
  { code: 'LV', name: 'Latvia',         flag: '🇱🇻' },
  { code: 'MT', name: 'Malta',          flag: '🇲🇹' },
  { code: 'NL', name: 'Netherlands',    flag: '🇳🇱' },
  { code: 'PL', name: 'Poland',         flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal',       flag: '🇵🇹' },
  { code: 'RO', name: 'Romania',        flag: '🇷🇴' },
  { code: 'SE', name: 'Sweden',         flag: '🇸🇪' },
  { code: 'SI', name: 'Slovenia',       flag: '🇸🇮' },
  { code: 'SK', name: 'Slovakia',       flag: '🇸🇰' },
];

const CountryPicker = ({ visible, selected, onClose, onSelect }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={cp.overlay}>
      <View style={cp.sheet}>
        <View style={cp.header}>
          <Text style={cp.title}>Select EU Country</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={22} color={C.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {EU_COUNTRIES.map(c => (
            <TouchableOpacity
              key={c.code}
              style={[cp.row, selected === c.code && cp.rowActive]}
              onPress={() => onSelect(c.code)}
              activeOpacity={0.7}
            >
              <Text style={cp.flag}>{c.flag}</Text>
              <Text style={[cp.countryName, selected === c.code && cp.countryNameActive]}>
                {c.name}
              </Text>
              <Text style={cp.code}>{c.code}</Text>
              {selected === c.code && (
                <Ionicons name="checkmark" size={18} color={C.c700} style={{ marginLeft: 'auto' }} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const cp = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 24 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title:       { fontSize: 17, fontWeight: '700', color: C.ink },
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowActive:   { backgroundColor: '#f0fdf4' },
  flag:        { fontSize: 26, marginRight: 14 },
  countryName: { fontSize: 15, color: C.ink, flex: 1 },
  countryNameActive: { fontWeight: '600', color: C.c700 },
  code:        { fontSize: 13, color: C.muted, marginLeft: 8 },
});

export default function ConsignmentsScreen() {
  const navigation = useNavigation();
  const [consignments, setConsignments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [ref, setRef] = useState('');
  const [country, setCountry] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [importer, setImporter] = useState('');
  const [shipDate, setShipDate] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);

  // Batch picker modal
  const [batchPicker, setBatchPicker] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [cRes, bRes] = await Promise.allSettled([
        coopAPI.getConsignments(),
        coopAPI.getBatches(),
      ]);
      if (cRes.status === 'fulfilled') {
        const d = cRes.value.data;
        setConsignments(Array.isArray(d) ? d : []);
      }
      if (bRes.status === 'fulfilled') {
        const d = bRes.value.data;
        setBatches(Array.isArray(d) ? d : (d?.batches || []));
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCreate = async () => {
    if (!selectedBatches.length) { Alert.alert('Required', 'Select at least one batch.'); return; }
    if (!country.trim()) { Alert.alert('Required', 'Destination country is required.'); return; }
    if (!importer.trim()) { Alert.alert('Required', 'Importer name is required.'); return; }
    setCreating(true);
    try {
      await coopAPI.createConsignment({
        batch_ids: selectedBatches,
        consignment_reference: ref.trim() || undefined,
        destination_country: country.trim().toUpperCase(),
        importer_name: importer.trim(),
        expected_shipment_date: shipDate.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowCreate(false);
      setSelectedBatches([]); setRef(''); setCountry('');
      setImporter(''); setShipDate(''); setNotes('');
      await load(true);
      Alert.alert('Created', 'Consignment created. Plotra Admin will generate the DDS.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create consignment');
    } finally {
      setCreating(false);
    }
  };

  const toggleBatch = (id) => {
    setSelectedBatches(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const totalWeight = batches
    .filter(b => selectedBatches.includes(b.id))
    .reduce((s, b) => s + (b.total_weight_kg || 0), 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Consignments</Text>
            <Text style={s.headerSub}>{consignments.length} total</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={s.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={consignments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderItem={({ item }) => {
            const ss = statusStyle(item.consignment_status);
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('ConsignmentDetail', { consignmentId: item.id, consignment: item })}
                activeOpacity={0.8}
              >
                <View style={s.cardTop}>
                  <Text style={s.cardRef} numberOfLines={1}>{item.consignment_reference}</Text>
                  <View style={[s.badge, { backgroundColor: ss.bg }]}>
                    <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.consignment_status)}</Text>
                  </View>
                </View>
                <View style={s.cardMeta}>
                  <View style={s.metaItem}>
                    <Ionicons name="flag-outline" size={13} color={C.muted} />
                    <Text style={s.metaText}>
                      {(() => { const c = EU_COUNTRIES.find(x => x.code === item.destination_country); return c ? `${c.flag} ${c.name}` : item.destination_country; })()}
                      {' · '}{item.importer_name}
                    </Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="scale-outline" size={13} color={C.muted} />
                    <Text style={s.metaText}>{fmtKg(item.total_weight_kg)}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="layers-outline" size={13} color={C.muted} />
                    <Text style={s.metaText}>{(item.batch_ids || []).length} batch{(item.batch_ids || []).length !== 1 ? 'es' : ''}</Text>
                  </View>
                </View>
                <Text style={s.cardDate}>Shipment: {fmtDate(item.expected_shipment_date)}</Text>
                {item.dds_reference && (
                  <View style={s.ddsRow}>
                    <Ionicons name="document-text-outline" size={13} color="#0891b2" />
                    <Text style={s.ddsRef}>DDS: {item.dds_reference}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="airplane-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No consignments yet</Text>
              <Text style={s.emptyMsg}>Group verified batches into a consignment for export.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create Consignment</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Consignment Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>New Consignment</Text>
                <TouchableOpacity onPress={() => setShowCreate(false)}>
                  <Ionicons name="close" size={24} color={C.ink} />
                </TouchableOpacity>
              </View>

              {/* Batch selector */}
              <Text style={s.fieldLabel}>Select Batches *</Text>
              <TouchableOpacity style={s.batchSelector} onPress={() => setBatchPicker(true)} activeOpacity={0.8}>
                <Text style={[s.batchSelectorText, !selectedBatches.length && { color: C.subtle }]}>
                  {selectedBatches.length > 0
                    ? `${selectedBatches.length} batch${selectedBatches.length > 1 ? 'es' : ''} selected · ${fmtKg(totalWeight)}`
                    : 'Tap to select batches…'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={C.muted} />
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Consignment Reference</Text>
              <TextInput style={s.input} value={ref} onChangeText={setRef}
                placeholder="Auto-generated if blank" placeholderTextColor={C.subtle}
                autoCapitalize="characters" />

              <Text style={s.fieldLabel}>Destination Country (EU) *</Text>
              {(() => {
                const sel = EU_COUNTRIES.find(c => c.code === country);
                return (
                  <TouchableOpacity
                    style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 10 }]}
                    onPress={() => setShowCountryPicker(true)}
                    activeOpacity={0.8}
                  >
                    {sel ? (
                      <>
                        <Text style={{ fontSize: 22 }}>{sel.flag}</Text>
                        <Text style={{ fontSize: 15, color: C.ink, flex: 1 }}>{sel.name}</Text>
                        <Text style={{ fontSize: 13, color: C.muted }}>{sel.code}</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="earth-outline" size={18} color={C.subtle} />
                        <Text style={{ fontSize: 15, color: C.subtle, flex: 1 }}>— Select EU country —</Text>
                        <Ionicons name="chevron-down" size={16} color={C.subtle} />
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()}
              <CountryPicker
                visible={showCountryPicker}
                selected={country}
                onClose={() => setShowCountryPicker(false)}
                onSelect={(code) => { setCountry(code); setShowCountryPicker(false); }}
              />

              <Text style={s.fieldLabel}>Importer Name *</Text>
              <TextInput style={s.input} value={importer} onChangeText={setImporter}
                placeholder="EU importer company name" placeholderTextColor={C.subtle} />

              <Text style={s.fieldLabel}>Expected Shipment Date</Text>
              <TextInput style={s.input} value={shipDate} onChangeText={setShipDate}
                placeholder="YYYY-MM-DD" placeholderTextColor={C.subtle}
                keyboardType="numbers-and-punctuation" />

              <Text style={s.fieldLabel}>Notes</Text>
              <TextInput style={[s.input, s.textarea]} value={notes} onChangeText={setNotes}
                placeholder="Optional notes" placeholderTextColor={C.subtle}
                multiline numberOfLines={3} />

              <TouchableOpacity
                style={[s.submitBtn, creating && s.btnDisabled]}
                onPress={handleCreate} disabled={creating} activeOpacity={0.85}
              >
                {creating ? <ActivityIndicator color={C.white} /> : <Text style={s.submitBtnText}>Create Consignment</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Batch picker */}
      <Modal visible={batchPicker} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '70%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Batches</Text>
              <TouchableOpacity onPress={() => setBatchPicker(false)}>
                <Ionicons name="checkmark" size={24} color={C.c700} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {batches.map((b, i) => {
                const selected = selectedBatches.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id || i}
                    style={[s.batchPickerRow, i < batches.length - 1 && s.rowBorder]}
                    onPress={() => toggleBatch(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, selected && s.checkboxChecked]}>
                      {selected && <Ionicons name="checkmark" size={14} color={C.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.batchPickerName}>{b.batch_reference}</Text>
                      <Text style={s.batchPickerMeta}>
                        {fmtKg(b.total_weight_kg)}
                        {b.crop_year ? ` · ${b.crop_year}` : ''}
                        {b.batch_status ? ` · ${cap(b.batch_status)}` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {batches.length === 0 && (
                <Text style={{ textAlign: 'center', color: C.muted, padding: 20 }}>No batches available.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingLeft: 56, paddingRight: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.c700, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 2 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardRef: { fontSize: 16, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  cardMeta: { gap: 6, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: C.muted, fontWeight: '500' },
  cardDate: { fontSize: 12, color: C.subtle, fontWeight: '600' },
  ddsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  ddsRef: { fontSize: 12, fontWeight: '700', color: '#0891b2' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 18, backgroundColor: C.c700, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  batchSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.steel200 },
  batchSelectorText: { fontSize: 14, color: C.ink, fontWeight: '600', flex: 1 },
  countryRow: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  countryChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: C.steel100, borderWidth: 1, borderColor: C.steel200 },
  countryChipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  countryChipText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  submitBtn: { backgroundColor: C.c700, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled: { backgroundColor: C.steel300 },
  submitBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },

  batchPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.c700, borderColor: C.c700 },
  batchPickerName: { fontSize: 14, fontWeight: '700', color: C.ink },
  batchPickerMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
});
