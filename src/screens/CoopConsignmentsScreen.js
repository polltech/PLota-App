import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, RefreshControl, StatusBar, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const consignStatusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'dds_submitted') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'dds_ready')     return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'rejected')      return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const EU_COUNTRIES = [
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU',
  'IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK',
];

const ConsignmentRow = ({ item, onPress }) => {
  const ss = consignStatusStyle(item.consignment_status);
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={s.rowMain}>
        {/* Reference + Status */}
        <View style={s.rowTop}>
          <Text style={s.refText} numberOfLines={1}>{item.consignment_reference}</Text>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.consignment_status || 'Pending DDS')}</Text>
          </View>
        </View>

        {/* Details grid */}
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Destination</Text>
            <View style={[s.countryBadge]}>
              <Text style={s.countryText}>{item.destination_country || '—'}</Text>
            </View>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Importer</Text>
            <Text style={s.metricVal} numberOfLines={1}>{item.importer_name || '—'}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Total Weight</Text>
            <Text style={s.metricVal}>{fmtKg(item.total_weight_kg)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Batches</Text>
            <Text style={s.metricVal}>{(item.batch_ids || []).length}</Text>
          </View>
          {item.dds_reference && (
            <View style={s.metric}>
              <Text style={s.metricLabel}>DDS Ref</Text>
              <Text style={[s.metricVal, { color: C.c700, fontFamily: 'monospace' }]} numberOfLines={1}>
                {item.dds_reference}
              </Text>
            </View>
          )}
          <View style={s.metric}>
            <Text style={s.metricLabel}>Shipment Date</Text>
            <Text style={s.metricVal}>{fmtDate(item.expected_shipment_date)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function CoopConsignmentsScreen() {
  const navigation = useNavigation();
  const [consignments, setConsignments]  = useState([]);
  const [batches,      setBatches]       = useState([]);
  const [loading,      setLoading]       = useState(true);
  const [refreshing,   setRefreshing]    = useState(false);

  // Modal
  const [showCreate,         setShowCreate]         = useState(false);
  const [selectedBatches,    setSelectedBatches]    = useState([]);
  const [ref,                setRef]                = useState('');
  const [country,            setCountry]            = useState('');
  const [showCountryPicker,  setShowCountryPicker]  = useState(false);
  const [importer,           setImporter]           = useState('');
  const [shipDate,           setShipDate]           = useState('');
  const [notes,              setNotes]              = useState('');
  const [creating,           setCreating]           = useState(false);

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
        // Show batches that are released or verified (eligible for consignment)
        const eligible = (Array.isArray(d) ? d : (d?.batches || []))
          .filter(b => ['released', 'under_satellite_review', 'verified', 'dds_submitted'].includes(b.batch_status));
        setBatches(eligible);
      }
    } catch (e) {
      console.warn('Consignments load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCreate = async () => {
    if (!selectedBatches.length) { Alert.alert('Required', 'Select at least one batch.'); return; }
    if (!country.trim())         { Alert.alert('Required', 'Destination country is required.'); return; }
    if (!importer.trim())        { Alert.alert('Required', 'Importer name is required.'); return; }
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
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create consignment.');
    } finally {
      setCreating(false);
    }
  };

  const toggleBatch = (id) =>
    setSelectedBatches(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  const selectedKg = batches
    .filter(b => selectedBatches.includes(b.id))
    .reduce((s, b) => s + (b.total_weight_kg || 0), 0);

  // Stat counts
  const totalKg    = consignments.reduce((s, c) => s + (c.total_weight_kg || 0), 0);
  const ddsReady   = consignments.filter(c => c.consignment_status === 'dds_ready').length;
  const submitted  = consignments.filter(c => c.consignment_status === 'dds_submitted').length;
  const pending    = consignments.filter(c => !c.consignment_status || c.consignment_status === 'pending_dds').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Consignments</Text>
            <Text style={s.headerSub}>{consignments.length} total · {fmtKg(totalKg)} EUDR export</Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={s.newBtnText}>New</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 4 stat cards — matching web */}
      {!loading && (
        <View style={s.statsRow}>
          {[
            { val: consignments.length, label: 'Total',         color: C.c700,    bg: C.c050 },
            { val: pending,             label: 'Pending DDS',   color: '#b45309', bg: '#fef3c7' },
            { val: ddsReady,            label: 'DDS Ready',     color: '#1d4ed8', bg: '#dbeafe' },
            { val: submitted,           label: 'DDS Submitted', color: '#15803d', bg: '#dcfce7' },
          ].map(c => (
            <View key={c.label} style={[s.statCard, { backgroundColor: c.bg, borderLeftColor: c.color }]}>
              <Text style={[s.statVal, { color: c.color }]}>{c.val}</Text>
              <Text style={[s.statLabel, { color: c.color }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={consignments}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <ConsignmentRow
              item={item}
              onPress={() => navigation.navigate('ConsignmentDetail', { consignmentId: item.id, consignment: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="airplane-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>No consignments yet</Text>
              <Text style={s.emptyMsg}>Create a consignment from verified batches ready for EU export.</Text>
            </View>
          }
        />
      )}

      {/* Create Consignment Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Consignment</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={s.fieldLabel}>Reference (auto if blank)</Text>
            <TextInput
              style={s.input}
              value={ref}
              onChangeText={setRef}
              placeholder="e.g. NYR-2025-C01"
              placeholderTextColor={C.subtle}
              autoCapitalize="characters"
            />

            <Text style={s.fieldLabel}>Destination Country (EU) *</Text>
            <TouchableOpacity
              style={[s.input, s.selectBtn]}
              onPress={() => setShowCountryPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={country ? s.selectBtnText : s.selectBtnPlaceholder}>
                {country || '— Select EU country —'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={C.subtle} />
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Importer Name *</Text>
            <TextInput
              style={s.input}
              value={importer}
              onChangeText={setImporter}
              placeholder="EU importer company name"
              placeholderTextColor={C.subtle}
            />

            <Text style={s.fieldLabel}>Expected Shipment Date (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={shipDate}
              onChangeText={setShipDate}
              placeholder={new Date().toISOString().slice(0, 10)}
              placeholderTextColor={C.subtle}
              keyboardType="numbers-and-punctuation"
            />

            <Text style={s.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes..."
              placeholderTextColor={C.subtle}
              multiline
            />

            <Text style={[s.fieldLabel, { marginTop: 8 }]}>
              Select Batches ({selectedBatches.length} selected · {fmtKg(selectedKg)})
            </Text>
            {batches.length === 0 ? (
              <View style={s.noBatches}>
                <Ionicons name="information-circle-outline" size={20} color={C.muted} />
                <Text style={s.noBatchesText}>No eligible batches. Release batches first.</Text>
              </View>
            ) : (
              batches.map(b => {
                const selected = selectedBatches.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[s.batchPick, selected && s.batchPickSel]}
                    onPress={() => toggleBatch(b.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, selected && s.checkboxSel]}>
                      {selected && <Ionicons name="checkmark" size={12} color={C.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickNo}>{b.batch_reference}</Text>
                      <Text style={s.pickMeta}>{cap(b.batch_status)} · {fmtKg(b.total_weight_kg)} · Grade {b.quality_grade || 'N/A'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[s.submitBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating
                ? <ActivityIndicator color={C.white} size="small" />
                : <Text style={s.submitBtnText}>Create Consignment</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>

        {/* Country picker sheet */}
        <Modal visible={showCountryPicker} animationType="slide" transparent>
          <View style={s.pickerOverlay}>
            <View style={s.pickerSheet}>
              <View style={s.pickerHeader}>
                <Text style={s.pickerTitle}>Select EU Country</Text>
                <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                  <Ionicons name="close" size={22} color={C.ink} />
                </TouchableOpacity>
              </View>
              <ScrollView>
                {EU_COUNTRIES.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.countryOption, country === c && s.countryOptionSel]}
                    onPress={() => { setCountry(c); setShowCountryPicker(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.countryOptionText, country === c && { color: C.c700, fontWeight: '800' }]}>{c}</Text>
                    {country === c && <Ionicons name="checkmark" size={16} color={C.c700} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.c700, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  newBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

  statsRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center', borderLeftWidth: 3 },
  statVal: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 11 },

  list: { padding: 12, paddingBottom: 24 },
  row: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  refText: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { minWidth: 80 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  metricVal: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 2 },
  countryBadge: { backgroundColor: '#e0f2fe', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  countryText: { fontSize: 11, fontWeight: '800', color: '#0369a1' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },

  // Modal
  modal: { flex: 1, backgroundColor: C.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.steel200, paddingTop: 52 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  modalBody: { flex: 1, padding: 20 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.steel700, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: C.steel200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink, backgroundColor: C.steel100 },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectBtnText: { fontSize: 15, color: C.ink, fontWeight: '600' },
  selectBtnPlaceholder: { fontSize: 15, color: C.subtle },
  noBatches: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: C.steel100, borderRadius: 10 },
  noBatchesText: { fontSize: 13, color: C.muted },

  batchPick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.steel200, marginBottom: 6, backgroundColor: C.white },
  batchPickSel: { borderColor: C.c700, backgroundColor: C.c050 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { backgroundColor: C.c700, borderColor: C.c700 },
  pickNo: { fontSize: 14, fontWeight: '700', color: C.ink },
  pickMeta: { fontSize: 12, color: C.muted, marginTop: 1 },

  submitBtn: { backgroundColor: C.c700, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },

  // Country picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  countryOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  countryOptionSel: { backgroundColor: C.c050 },
  countryOptionText: { fontSize: 15, color: C.ink },
});
