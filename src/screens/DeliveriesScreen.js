import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

// ── helpers ───────────────────────────────────────────────────────────────────
const statusStyle = (s) => {
  const u = (s || '').toUpperCase();
  if (u === 'VERIFIED')  return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'RECEIVED')  return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'REJECTED')  return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const gradeStyle = (g) => {
  if (!g) return { color: C.steel500, bg: C.steel100 };
  const u = g.toUpperCase();
  if (u === 'AA')   return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'AB')   return { color: '#0891b2', bg: '#e0f2fe' };
  if (u === 'PB')   return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'AAAA') return { color: '#7c3aed', bg: '#ede9fe' };
  return { color: C.steel600, bg: C.steel100 };
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};

const fmtKg = (n) => {
  if (n == null) return '—';
  const v = Number(n);
  return v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v.toFixed(1)} kg`;
};

// ── stat card config (matches FarmsListScreen) ────────────────────────────────
const STAT_KEYS = [
  { key: 'all',      icon: 'cube-outline',             label: 'Total',    color: C.c700,    bg: C.c050 },
  { key: 'PENDING',  icon: 'time-outline',             label: 'Pending',  color: '#b45309', bg: '#fef3c7' },
  { key: 'RECEIVED', icon: 'archive-outline',          label: 'Received', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'VERIFIED', icon: 'checkmark-circle-outline', label: 'Verified', color: '#15803d', bg: '#dcfce7' },
  { key: 'REJECTED', icon: 'close-circle-outline',     label: 'Rejected', color: '#dc2626', bg: '#fee2e2' },
];

// ── delivery table row ────────────────────────────────────────────────────────
const DeliveryRow = ({ item, index, isLast }) => {
  const ss = statusStyle(item.status);
  const gs = gradeStyle(item.quality_grade);
  const rawRef = item.batch_number || item.reference || item.delivery_number || '';
  const ref = rawRef.startsWith('PCFDELIVERY/') ? rawRef.replace('PCFDELIVERY/', '') : (rawRef || `D-${index + 1}`);
  const farm = item.farm_name || item.farm?.farm_name;
  const kg   = item.weight_kg ?? item.net_weight_kg;

  return (
    <View style={[s.tableRow, !isLast && s.tableRowBorder]}>
      {/* Reference + farm */}
      <View style={s.colRef}>
        <Text style={s.refText} numberOfLines={1}>{ref}</Text>
        {!!farm && <Text style={s.farmText} numberOfLines={1}>{farm}</Text>}
      </View>

      {/* Weight */}
      <Text style={[s.colText, { flex: 1, textAlign: 'center' }]}>{fmtKg(kg)}</Text>

      {/* Grade badge */}
      <View style={{ flex: 0.9, alignItems: 'center' }}>
        <View style={[s.badge, { backgroundColor: gs.bg }]}>
          <Text style={[s.badgeText, { color: gs.color }]}>{item.quality_grade || '—'}</Text>
        </View>
      </View>

      {/* Date */}
      <Text style={[s.colText, { flex: 1.2, textAlign: 'right', color: C.muted }]}>
        {fmtDate(item.delivered_at || item.created_at)}
      </Text>

      {/* Status badge */}
      <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
        <View style={[s.badge, { backgroundColor: ss.bg }]}>
          <Text style={[s.badgeText, { color: ss.color }]}>
            {(item.status || 'Pending').charAt(0).toUpperCase() + (item.status || 'Pending').slice(1).toLowerCase()}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ── main screen ───────────────────────────────────────────────────────────────
export default function DeliveriesScreen() {
  const [deliveries,   setDeliveries]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await farmerAPI.getDeliveries();
      const d = res.data;
      setDeliveries(Array.isArray(d) ? d : (d?.deliveries || []));
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // Per-status counts
  const counts = {
    all:      deliveries.length,
    PENDING:  deliveries.filter(d => (d.status || 'PENDING').toUpperCase() === 'PENDING').length,
    RECEIVED: deliveries.filter(d => (d.status || '').toUpperCase() === 'RECEIVED').length,
    VERIFIED: deliveries.filter(d => (d.status || '').toUpperCase() === 'VERIFIED').length,
    REJECTED: deliveries.filter(d => (d.status || '').toUpperCase() === 'REJECTED').length,
  };

  const totalKg    = deliveries.reduce((s, d) => s + (d.weight_kg ?? d.net_weight_kg ?? 0), 0);
  const verifiedKg = deliveries
    .filter(d => (d.status || '').toUpperCase() === 'VERIFIED')
    .reduce((s, d) => s + (d.weight_kg ?? d.net_weight_kg ?? 0), 0);

  const filtered = activeFilter === 'all'
    ? deliveries
    : deliveries.filter(d => (d.status || 'PENDING').toUpperCase() === activeFilter);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ─────────────────────────────────── */}
      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Deliveries</Text>
            <Text style={s.headerSub}>
              {activeFilter === 'all'
                ? `${deliveries.length} deliver${deliveries.length !== 1 ? 'ies' : 'y'} · ${fmtKg(totalKg)} total`
                : `${filtered.length} of ${deliveries.length} · ${STAT_KEYS.find(k => k.key === activeFilter)?.label}`}
            </Text>
          </View>
          {verifiedKg > 0 && (
            <View style={s.verifiedPill}>
              <Ionicons name="checkmark-circle" size={13} color="#15803d" />
              <Text style={s.verifiedPillText}>{fmtKg(verifiedKg)} verified</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── 5 stat mini-cards ──────────────────────── */}
      {!loading && (
        <View style={s.summaryWrap}>
          {STAT_KEYS.map(k => (
            <TouchableOpacity
              key={k.key}
              style={[
                s.miniCard,
                { backgroundColor: k.bg, borderColor: activeFilter === k.key ? k.color : 'transparent' },
              ]}
              onPress={() => setActiveFilter(activeFilter === k.key ? 'all' : k.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={k.icon} size={22} color={k.color} />
              <Text style={[s.miniCount, { color: k.color }]}>{counts[k.key] ?? 0}</Text>
              <Text style={[s.miniLabel, { color: k.color }]}>{k.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Body ───────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
          <Text style={s.loadText}>Loading deliveries...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.subtle} />
          <Text style={s.errText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        >
          <Ionicons name="cube-outline" size={52} color={C.steel300} />
          <Text style={s.emptyTitle}>No deliveries found</Text>
          <Text style={s.emptyMsg}>
            {activeFilter !== 'all'
              ? `No ${activeFilter.toLowerCase()} deliveries.`
              : 'Deliveries logged by your cooperative will appear here.'}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        >
          {/* Summary strip above table */}
          <View style={s.tableSummary}>
            <Text style={s.tableSummaryText}>
              Showing {filtered.length} deliver{filtered.length !== 1 ? 'ies' : 'y'}
            </Text>
            <Text style={s.tableSummaryText}>
              {fmtKg(filtered.reduce((s, d) => s + (d.weight_kg ?? d.net_weight_kg ?? 0), 0))} total
            </Text>
          </View>

          {/* Table card — header + all rows in one unified card */}
          <View style={s.tableCard}>
            {/* Column headers */}
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2.2 }]}>Reference</Text>
              <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Weight</Text>
              <Text style={[s.th, { flex: 0.9, textAlign: 'center' }]}>Grade</Text>
              <Text style={[s.th, { flex: 1.2, textAlign: 'right' }]}>Date</Text>
              <Text style={[s.th, { flex: 1.4, textAlign: 'right' }]}>Status</Text>
            </View>

            {/* Rows */}
            {filtered.map((item, index) => (
              <DeliveryRow
                key={String(item.id ?? index)}
                item={item}
                index={index}
                isLast={index === filtered.length - 1}
              />
            ))}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },

  // Header
  header:          { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub:       { fontSize: 13, color: C.muted, marginTop: 2 },
  verifiedPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 2 },
  verifiedPillText:{ fontSize: 12, fontWeight: '700', color: '#15803d' },

  // 5 stat mini-cards — single row, aspectRatio:1 makes each card square
  summaryWrap: {
    flexDirection: 'row',
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200,
    paddingHorizontal: 10, paddingVertical: 10, gap: 6,
  },
  miniCard:  { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 3, borderWidth: 1.5 },
  miniCount: { fontSize: 18, fontWeight: '900' },
  miniLabel: { fontSize: 8,  fontWeight: '700', textAlign: 'center', lineHeight: 10 },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { padding: 16 },

  // Table summary strip
  tableSummary:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tableSummaryText: { fontSize: 12, color: C.muted, fontWeight: '600' },

  // Table card
  tableCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: C.steel100,
    borderBottomWidth: 1,
    borderBottomColor: C.steel200,
  },
  th: { fontSize: 10, fontWeight: '800', color: C.steel500, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Table row
  tableRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },

  // Cell content
  colRef:    { flex: 2.2 },
  colText:   { fontSize: 13, color: C.ink, fontWeight: '700' },
  refText:   { fontSize: 13, fontWeight: '800', color: C.ink },
  farmText:  { fontSize: 11, color: C.muted, marginTop: 2 },
  badge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  // States
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  loadText:   { marginTop: 12, color: C.muted, fontSize: 14 },
  errText:    { marginTop: 12, color: C.muted, fontSize: 14, textAlign: 'center' },
  retryBtn:   { marginTop: 16, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText:  { color: C.white, fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg:   { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
