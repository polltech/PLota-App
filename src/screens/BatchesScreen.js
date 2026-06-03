import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ScrollView, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const BatchCard = ({ batch, onPress }) => (
  <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
    <View style={s.cardLeft}>
      <Ionicons name="layers-outline" size={20} color={C.c600} />
    </View>
    <View style={s.cardContent}>
      <Text style={s.batchNo} numberOfLines={1}>{batch.batch_number}</Text>
      <Text style={s.batchMeta}>
        {batch.crop_year ? `Crop ${batch.crop_year}` : ''}
        {batch.processing_method ? `  ·  ${batch.processing_method}` : ''}
      </Text>
      <View style={s.metaRow}>
        {batch.delivery_ids?.length != null && (
          <View style={s.pill}>
            <Text style={s.pillText}>{batch.delivery_ids.length} deliveries</Text>
          </View>
        )}
        {batch.lot_number && (
          <View style={[s.pill, { backgroundColor: C.eudrLowBg }]}>
            <Text style={[s.pillText, { color: C.eudrLow }]}>LOT: {batch.lot_number}</Text>
          </View>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color={C.subtle} />
  </TouchableOpacity>
);

const TraceCard = ({ data }) => {
  if (!data) return null;
  const { batch, deliveries, farms, farmers } = data;
  return (
    <View>
      <Text style={s.traceSection}>Batch</Text>
      <View style={s.traceRow}><Text style={s.traceLabel}>Number</Text><Text style={s.traceVal}>{batch?.batch_number}</Text></View>
      <View style={s.traceRow}><Text style={s.traceLabel}>Lot</Text><Text style={s.traceVal}>{batch?.lot_number || '—'}</Text></View>
      <View style={s.traceRow}><Text style={s.traceLabel}>Method</Text><Text style={s.traceVal}>{batch?.processing_method || '—'}</Text></View>

      {deliveries?.length > 0 && (
        <>
          <Text style={s.traceSection}>Deliveries ({deliveries.length})</Text>
          {deliveries.map((d) => (
            <View key={d.id} style={s.traceRow}>
              <Text style={s.traceLabel}>{d.delivery_number}</Text>
              <Text style={s.traceVal}>{d.net_weight_kg != null ? `${Number(d.net_weight_kg).toFixed(1)} kg` : '—'}</Text>
            </View>
          ))}
        </>
      )}

      {farms?.length > 0 && (
        <>
          <Text style={s.traceSection}>Source Farms ({farms.length})</Text>
          {farms.map((f) => (
            <View key={f.id} style={s.traceRow}>
              <Text style={s.traceLabel} numberOfLines={1}>{f.farm_name || f.name}</Text>
              <Text style={s.traceVal}>{f.county || '—'}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
};

export default function BatchesScreen() {
  const navigation = useNavigation();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create batch modal
  const [showCreate, setShowCreate] = useState(false);
  const [batchNo, setBatchNo] = useState('');
  const [cropYear, setCropYear] = useState(String(new Date().getFullYear()));
  const [method, setMethod] = useState('washed');
  const [creating, setCreating] = useState(false);

  // Traceability modal
  const [traceModal, setTraceModal] = useState(false);
  const [traceData, setTraceData] = useState(null);
  const [traceLoading, setTraceLoading] = useState(false);

  const METHODS = ['washed', 'natural', 'honey', 'semi-washed'];

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getBatches();
      const d = res.data;
      setBatches(Array.isArray(d) ? d : d?.batches || []);
    } catch (e) {
      console.warn('Batches load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const openTraceability = async (batch) => {
    setTraceModal(true);
    setTraceLoading(true);
    try {
      const res = await coopAPI.getBatchTraceability(batch.id);
      setTraceData(res.data);
    } catch (e) {
      Alert.alert('Error', 'Could not load traceability data.');
      setTraceModal(false);
    } finally {
      setTraceLoading(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchNo.trim()) { Alert.alert('Required', 'Batch number is required.'); return; }
    if (!cropYear || isNaN(parseInt(cropYear))) { Alert.alert('Required', 'Valid crop year is required.'); return; }

    setCreating(true);
    try {
      await coopAPI.createBatch({
        batch_number: batchNo.trim(),
        crop_year: parseInt(cropYear),
        processing_method: method,
        delivery_ids: [],
      });
      setShowCreate(false);
      setBatchNo('');
      Alert.alert('Created', 'Batch created. You can now assign deliveries from the web dashboard.');
      await load(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create batch.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Batches</Text>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <BatchCard batch={item} onPress={() => navigation.navigate('BatchDetail', { batchId: item.id, batch: item })} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No batches yet</Text>
              <Text style={s.emptyMsg}>Create a batch to group deliveries for export.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Create Batch</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Batch Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Batch</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Batch Number</Text>
            <TextInput
              style={s.input}
              value={batchNo}
              onChangeText={setBatchNo}
              placeholder="e.g. KEN-2025-001"
              placeholderTextColor={C.subtle}
              autoCapitalize="characters"
            />

            <Text style={s.fieldLabel}>Crop Year</Text>
            <TextInput
              style={s.input}
              value={cropYear}
              onChangeText={setCropYear}
              keyboardType="number-pad"
              placeholder="2025"
              placeholderTextColor={C.subtle}
            />

            <Text style={s.fieldLabel}>Processing Method</Text>
            <View style={s.methodRow}>
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[s.methodBtn, method === m && s.methodBtnActive]}
                  onPress={() => setMethod(m)}
                >
                  <Text style={[s.methodText, method === m && s.methodTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.submitBtn, creating && s.btnDisabled]}
              onPress={handleCreateBatch}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color={C.white} /> : <Text style={s.submitText}>Create Batch</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Traceability Modal */}
      <Modal visible={traceModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { maxHeight: '80%' }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Traceability</Text>
              <TouchableOpacity onPress={() => { setTraceModal(false); setTraceData(null); }}>
                <Ionicons name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            {traceLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator color={C.c700} size="large" />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TraceCard data={traceData} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.white },

  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardLeft: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  batchNo: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 4 },
  batchMeta: { fontSize: 12, color: C.muted, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: C.steel100 },
  pillText: { fontSize: 10, fontWeight: '700', color: C.steel700 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 18, backgroundColor: C.c700, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.steel100, borderWidth: 1, borderColor: C.steel200 },
  methodBtnActive: { backgroundColor: C.c700, borderColor: C.c700 },
  methodText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  methodTextActive: { color: C.white },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  btnDisabled: { backgroundColor: C.steel300 },
  submitText: { color: C.white, fontSize: 15, fontWeight: '800' },

  // Traceability
  traceSection: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  traceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  traceLabel: { fontSize: 13, color: C.muted, fontWeight: '600', flex: 1 },
  traceVal: { fontSize: 13, color: C.ink, fontWeight: '700', textAlign: 'right', maxWidth: '55%' },
});
