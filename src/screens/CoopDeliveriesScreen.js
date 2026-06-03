import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'received')            return { color: '#0369a1', bg: '#e0f2fe' };
  if (u === 'in_processing')       return { color: '#6d28d9', bg: '#ede9fe' };
  if (u === 'quality_checked')     return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'ready_for_batching')  return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'batched')             return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'processed')           return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'rejected')            return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const FILTERS = [
  { key: 'all',              label: 'All' },
  { key: 'pending',          label: 'Pending' },
  { key: 'received',         label: 'Received' },
  { key: 'in_processing',    label: 'Processing' },
  { key: 'ready_for_batching', label: 'Ready' },
  { key: 'batched',          label: 'Batched' },
  { key: 'rejected',         label: 'Rejected' },
];

const StatChip = ({ value, label, color }) => (
  <View style={[s.statChip, { borderTopColor: color }]}>
    <Text style={[s.statChipVal, { color }]}>{value ?? '—'}</Text>
    <Text style={s.statChipLabel}>{label}</Text>
  </View>
);

const DeliveryRow = ({ item, onPress }) => {
  const ss = statusStyle(item.status);
  const lastStep = item.processing_log?.slice(-1)?.[0]?.step_type;
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      {/* Delivery # + Farmer */}
      <View style={s.rowMain}>
        <View style={s.rowTop}>
          <Text style={s.delivNo} numberOfLines={1}>{item.delivery_number || `D-${item.id}`}</Text>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.status || 'Pending')}</Text>
          </View>
        </View>
        <View style={s.rowMeta}>
          {item.farmer_name && (
            <Text style={s.rowMetaText} numberOfLines={1}>
              <Text style={s.rowMetaLabel}>Farmer: </Text>{item.farmer_name}
            </Text>
          )}
          {item.farm_name && (
            <Text style={s.rowMetaText} numberOfLines={1}>
              <Text style={s.rowMetaLabel}>Farm: </Text>{item.farm_name || `Farm #${item.farm_id}`}
            </Text>
          )}
        </View>
        <View style={s.rowCols}>
          <View style={s.rowCol}>
            <Ionicons name="scale-outline" size={12} color={C.muted} />
            <Text style={s.rowColText}>{fmtKg(item.net_weight_kg)}</Text>
          </View>
          {item.quality_grade && (
            <View style={s.rowCol}>
              <Ionicons name="ribbon-outline" size={12} color={C.muted} />
              <Text style={s.rowColText}>{item.quality_grade}</Text>
            </View>
          )}
          {item.moisture_content != null && (
            <View style={s.rowCol}>
              <Ionicons name="water-outline" size={12} color={C.muted} />
              <Text style={s.rowColText}>{item.moisture_content}%</Text>
            </View>
          )}
          {lastStep && (
            <View style={[s.rowCol, { backgroundColor: '#e0f2fe', borderRadius: 6, paddingHorizontal: 6 }]}>
              <Text style={[s.rowColText, { color: '#0369a1' }]}>{cap(lastStep)}</Text>
            </View>
          )}
          <View style={s.rowCol}>
            <Ionicons name="calendar-outline" size={12} color={C.muted} />
            <Text style={s.rowColText}>{fmtDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function CoopDeliveriesScreen() {
  const navigation = useNavigation();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getDeliveries();
      const d = res.data;
      setDeliveries(Array.isArray(d) ? d : (d?.deliveries || []));
    } catch (e) {
      console.warn('CoopDeliveries load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // Stats
  const totalKg     = deliveries.reduce((s, d) => s + (d.net_weight_kg || 0), 0);
  const received    = deliveries.filter(d => ['received', 'pending'].includes((d.status || '').toLowerCase())).length;
  const inProcess   = deliveries.filter(d => d.status === 'in_processing').length;
  const ready       = deliveries.filter(d => ['ready_for_batching', 'batched'].includes(d.status)).length;
  const rejected    = deliveries.filter(d => d.status === 'rejected').length;

  // Filter + search
  let filtered = filter === 'all' ? deliveries
    : deliveries.filter(d => (d.status || 'pending').toLowerCase() === filter);
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(d =>
      (d.delivery_number || '').toLowerCase().includes(q) ||
      (d.farmer_name || '').toLowerCase().includes(q) ||
      (d.farm_name || '').toLowerCase().includes(q)
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Deliveries</Text>
            <Text style={s.headerSub}>{deliveries.length} total · {fmtKg(totalKg)}</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => navigation.navigate('CreateDelivery')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={s.newBtnText}>Record</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 6 stat chips — matching web app */}
      {!loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.statsScroll}
          contentContainerStyle={s.statsRow}
        >
          <StatChip value={deliveries.length} label="Total"       color={C.c700} />
          <StatChip value={fmtKg(totalKg)}   label="Total kg"    color="#15803d" />
          <StatChip value={received}          label="Received"    color="#0369a1" />
          <StatChip value={inProcess}         label="Processing"  color="#7c3aed" />
          <StatChip value={ready}             label="Ready/Batched" color="#1d4ed8" />
          <StatChip value={rejected}          label="Rejected"    color="#dc2626" />
        </ScrollView>
      )}

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => {
          const cnt = f.key === 'all'
            ? deliveries.length
            : deliveries.filter(d => (d.status || 'pending').toLowerCase() === f.key).length;
          return (
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
                {f.label} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={15} color={C.subtle} style={{ marginRight: 7 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search delivery #, farmer, farm..."
          placeholderTextColor={C.subtle}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <DeliveryRow
              item={item}
              onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item.id, delivery: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>No deliveries</Text>
              <Text style={s.emptyMsg}>{query ? 'No results for your search.' : filter !== 'all' ? `No ${filter} deliveries.` : 'Record the first delivery.'}</Text>
            </View>
          }
        />
      )}
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

  statsScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  statChip: { minWidth: 72, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.steel100, borderRadius: 10, alignItems: 'center', borderTopWidth: 3 },
  statChipVal: { fontSize: 16, fontWeight: '900' },
  statChipLabel: { fontSize: 9, fontWeight: '700', color: C.muted, marginTop: 2, textAlign: 'center' },

  filterScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9, gap: 7 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink },

  list: { paddingHorizontal: 12, paddingBottom: 24 },
  row: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  delivNo: { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  rowMeta: { marginBottom: 6, gap: 2 },
  rowMetaText: { fontSize: 12, color: C.muted },
  rowMetaLabel: { fontWeight: '700', color: C.steel700 },
  rowCols: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  rowCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowColText: { fontSize: 12, color: C.muted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
});
