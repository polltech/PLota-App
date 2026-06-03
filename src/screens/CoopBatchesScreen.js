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

const batchStatusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'verified' || u === 'dds_submitted') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'released')                          return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'under_satellite_review')            return { color: '#0891b2', bg: '#e0f2fe' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const complianceStyle = (s) => {
  if (!s) return { color: C.muted, bg: C.steel100 };
  const u = s.toLowerCase();
  if (u.includes('compliant') && !u.includes('non')) return { color: '#15803d', bg: '#dcfce7' };
  if (u.includes('non') || u.includes('risk'))       return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const StatCard = ({ value, label, color, bg }) => (
  <View style={[s.statCard, { backgroundColor: bg, borderLeftColor: color }]}>
    <Text style={[s.statVal, { color }]}>{value ?? '—'}</Text>
    <Text style={[s.statLabel, { color }]}>{label}</Text>
  </View>
);

const BatchRow = ({ item, onPress, onRelease }) => {
  const ss = batchStatusStyle(item.status);
  const cs = complianceStyle(item.compliance_status);
  const eudrPct = item.total_weight_kg > 0
    ? ((item.eudr_eligible_kg || 0) / item.total_weight_kg * 100).toFixed(0)
    : 0;

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={s.rowMain}>
        {/* Top row: Batch # + Status */}
        <View style={s.rowTop}>
          <Text style={s.batchNo} numberOfLines={1}>{item.batch_number}</Text>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.status || 'Draft')}</Text>
          </View>
        </View>

        {/* Metrics row */}
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Year</Text>
            <Text style={s.metricVal}>{item.crop_year || '—'}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Total</Text>
            <Text style={s.metricVal}>{fmtKg(item.total_weight_kg)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>EUDR</Text>
            <Text style={[s.metricVal, { color: '#15803d' }]}>{fmtKg(item.eudr_eligible_kg)} <Text style={s.metricSub}>({eudrPct}%)</Text></Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Grade</Text>
            <Text style={s.metricVal}>{item.quality_grade || 'N/A'}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Compliance</Text>
            <View style={[s.badge, { backgroundColor: cs.bg }]}>
              <Text style={[s.badgeText, { color: cs.color }]}>{item.compliance_status || 'Under Review'}</Text>
            </View>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Date</Text>
            <Text style={s.metricVal}>{fmtDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Action: Release if draft */}
        {(item.status === 'draft' || !item.status) && (
          <TouchableOpacity
            style={s.releaseBtn}
            onPress={(e) => { e.stopPropagation?.(); onRelease(item); }}
            activeOpacity={0.8}
          >
            <Ionicons name="rocket-outline" size={14} color={C.white} />
            <Text style={s.releaseBtnText}>Release for Satellite Review</Text>
          </TouchableOpacity>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function CoopBatchesScreen() {
  const navigation = useNavigation();
  const [batches,     setBatches]     = useState([]);
  const [deliveries,  setDeliveries]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // Create batch modal state
  const [showCreate,       setShowCreate]       = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [batchYear,        setBatchYear]        = useState(String(new Date().getFullYear()));
  const [method,           setMethod]           = useState('');
  const [lotNo,            setLotNo]            = useState('');
  const [creating,         setCreating]         = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [bRes, dRes] = await Promise.allSettled([
        coopAPI.getBatches(),
        coopAPI.getDeliveries(),
      ]);
      if (bRes.status === 'fulfilled') {
        const d = bRes.value.data;
        setBatches(Array.isArray(d) ? d : (d?.batches || []));
      }
      if (dRes.status === 'fulfilled') {
        const d = dRes.value.data;
        // Only show deliveries that are ready_for_batching and not yet batched
        const available = (Array.isArray(d) ? d : (d?.deliveries || []))
          .filter(del => del.status === 'ready_for_batching');
        setDeliveries(available);
      }
    } catch (e) {
      console.warn('CoopBatches load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleRelease = (batch) => {
    Alert.alert(
      'Release Batch',
      `Release batch ${batch.batch_number} for Plotra Admin satellite review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Release', onPress: async () => {
          try {
            await coopAPI.releaseBatch(batch.id, '');
            setBatches(prev => prev.map(b =>
              b.id === batch.id ? { ...b, status: 'released' } : b
            ));
            Alert.alert('Released', `${batch.batch_number} submitted for satellite screening.`);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Release failed.');
          }
        }},
      ]
    );
  };

  const handleCreate = async () => {
    if (!selectedDeliveries.length) {
      Alert.alert('Required', 'Select at least one delivery.'); return;
    }
    setCreating(true);
    try {
      await coopAPI.createBatch({
        delivery_ids: selectedDeliveries,
        crop_year: batchYear.trim() || undefined,
        processing_method: method.trim() || undefined,
        lot_number: lotNo.trim() || undefined,
      });
      setShowCreate(false);
      setSelectedDeliveries([]); setBatchYear(String(new Date().getFullYear()));
      setMethod(''); setLotNo('');
      await load(true);
      Alert.alert('Created', 'Batch created. Release it to submit for satellite review.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create batch.');
    } finally {
      setCreating(false);
    }
  };

  const toggleDelivery = (id) =>
    setSelectedDeliveries(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  // Stat counts
  const totalKg   = batches.reduce((s, b) => s + (b.total_weight_kg || 0), 0);
  const eudrKg    = batches.reduce((s, b) => s + (b.eudr_eligible_kg || 0), 0);
  const released  = batches.filter(b => b.status === 'released' || b.status === 'under_satellite_review').length;
  const draft     = batches.filter(b => !b.status || b.status === 'draft').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Batch Management</Text>
            <Text style={s.headerSub}>{batches.length} batches · {fmtKg(totalKg)}</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={s.newBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 4 stat cards — matching web */}
      {!loading && (
        <View style={s.statsRow}>
          <StatCard value={batches.length} label="Total Batches" color={C.c700}    bg={C.c050} />
          <StatCard value={fmtKg(totalKg)} label="Total Weight"  color="#15803d"  bg="#dcfce7" />
          <StatCard value={fmtKg(eudrKg)}  label="EUDR Eligible" color="#1d4ed8"  bg="#dbeafe" />
          <StatCard value={released}        label="In Review"     color="#0891b2"  bg="#e0f2fe" />
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <BatchRow
              item={item}
              onPress={() => navigation.navigate('BatchDetail', { batchId: item.id, batch: item })}
              onRelease={handleRelease}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>No batches yet</Text>
              <Text style={s.emptyMsg}>Create a batch from deliveries that are ready for batching.</Text>
            </View>
          }
        />
      )}

      {/* Create Batch Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Create Batch</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Ionicons name="close" size={24} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={s.fieldLabel}>Crop Year</Text>
            <TextInput
              style={s.input}
              value={batchYear}
              onChangeText={setBatchYear}
              placeholder="e.g. 2025"
              placeholderTextColor={C.subtle}
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Processing Method (optional)</Text>
            <TextInput
              style={s.input}
              value={method}
              onChangeText={setMethod}
              placeholder="e.g. Washed, Natural"
              placeholderTextColor={C.subtle}
            />

            <Text style={s.fieldLabel}>Lot Number (optional)</Text>
            <TextInput
              style={s.input}
              value={lotNo}
              onChangeText={setLotNo}
              placeholder="e.g. LOT-001"
              placeholderTextColor={C.subtle}
            />

            <Text style={[s.fieldLabel, { marginTop: 8 }]}>
              Select Deliveries ({selectedDeliveries.length} selected)
            </Text>
            {deliveries.length === 0 ? (
              <View style={s.noDeliveries}>
                <Ionicons name="information-circle-outline" size={20} color={C.muted} />
                <Text style={s.noDeliveriesText}>No deliveries ready for batching.</Text>
              </View>
            ) : (
              deliveries.map(d => {
                const selected = selectedDeliveries.includes(d.id);
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.deliveryPick, selected && s.deliveryPickSel]}
                    onPress={() => toggleDelivery(d.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, selected && s.checkboxSel]}>
                      {selected && <Ionicons name="checkmark" size={12} color={C.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickNo}>{d.delivery_number || `D-${d.id}`}</Text>
                      <Text style={s.pickMeta}>{d.farmer_name || ''} · {fmtKg(d.net_weight_kg)}</Text>
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
                : <Text style={s.submitBtnText}>Create Batch</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
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
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', borderLeftWidth: 3 },
  statVal: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  statLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 11 },

  list: { padding: 12, paddingBottom: 24 },
  row: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  batchNo: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metric: { minWidth: 80 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  metricVal: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 2 },
  metricSub: { fontSize: 10, color: C.muted, fontWeight: '500' },

  releaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  releaseBtnText: { color: C.white, fontSize: 12, fontWeight: '800' },

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
  noDeliveries: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: C.steel100, borderRadius: 10 },
  noDeliveriesText: { fontSize: 13, color: C.muted },

  deliveryPick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.steel200, marginBottom: 6, backgroundColor: C.white },
  deliveryPickSel: { borderColor: C.c700, backgroundColor: C.c050 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  checkboxSel: { backgroundColor: C.c700, borderColor: C.c700 },
  pickNo: { fontSize: 14, fontWeight: '700', color: C.ink },
  pickMeta: { fontSize: 12, color: C.muted, marginTop: 1 },

  submitBtn: { backgroundColor: C.c700, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
