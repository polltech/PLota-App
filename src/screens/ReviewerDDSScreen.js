import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_CFG = {
  pending:  { bg: '#fef3c7', fg: '#92400e', label: 'PENDING REVIEW' },
  approved: { bg: C.eudrLowBg, fg: C.eudrLow, label: 'APPROVED' },
  rejected: { bg: C.eudrHighBg, fg: C.eudrHigh, label: 'REJECTED' },
  submitted: { bg: '#e0f2fe', fg: '#0369a1', label: 'SUBMITTED' },
};

const FILTERS = ['ALL', 'pending', 'submitted', 'approved', 'rejected'];

const DDSCard = ({ dds, onApprove, onReject }) => {
  const cfg = STATUS_CFG[dds.status] || { bg: C.steel100, fg: C.steel700, label: (dds.status || '').toUpperCase() };
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.docIcon}>
          <Ionicons name="document-text" size={20} color={C.c600} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.ref} numberOfLines={1}>{dds.reference_number || `DDS-${dds.id}`}</Text>
          <Text style={s.meta}>{dds.operator_name || 'Unknown operator'}</Text>
        </View>
        <View style={[s.chip, { backgroundColor: cfg.bg }]}>
          <Text style={[s.chipText, { color: cfg.fg }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={s.detailGrid}>
        {[
          { label: 'Commodity', value: dds.commodity },
          { label: 'Origin', value: dds.country_of_production },
          { label: 'Quantity', value: dds.quantity ? `${dds.quantity} ${dds.unit || 'kg'}` : null },
          { label: 'Submitted', value: fmtDate(dds.created_at) },
          { label: 'Farms linked', value: dds.farm_count },
          { label: 'Risk level', value: dds.risk_level },
        ].map(({ label, value }) => value != null ? (
          <View key={label} style={s.detailItem}>
            <Text style={s.detailLabel}>{label}</Text>
            <Text style={s.detailVal}>{value}</Text>
          </View>
        ) : null)}
      </View>

      {dds.status === 'pending' || dds.status === 'submitted' ? (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.rejectBtn} onPress={() => onReject(dds)}>
            <Ionicons name="close-outline" size={16} color={C.eudrHigh} />
            <Text style={s.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.approveBtn} onPress={() => onApprove(dds)}>
            <Ionicons name="checkmark-outline" size={16} color={C.white} />
            <Text style={s.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default function ReviewerDDSScreen() {
  const [dds, setDds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminAPI.getDDSList();
      const d = res.data;
      setDds(Array.isArray(d) ? d : d?.items || []);
    } catch (e) {
      console.warn('Reviewer DDS:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleApprove = (item) => {
    Alert.alert('Approve DDS', `Approve ${item.reference_number || `DDS-${item.id}`}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await adminAPI.approveDDS(item.id);
            setDds((prev) => prev.map((d) => d.id === item.id ? { ...d, status: 'approved' } : d));
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to approve DDS.');
          }
        },
      },
    ]);
  };

  const handleReject = (item) => {
    Alert.alert('Reject DDS', `Reject ${item.reference_number || `DDS-${item.id}`}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.rejectDDS(item.id, 'Rejected by reviewer');
            setDds((prev) => prev.map((d) => d.id === item.id ? { ...d, status: 'rejected' } : d));
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to reject DDS.');
          }
        },
      },
    ]);
  };

  const pendingCount = dds.filter((d) => d.status === 'pending' || d.status === 'submitted').length;

  const filtered = filter === 'ALL' ? dds : dds.filter((d) => d.status === filter);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <Text style={s.heroTitle}>DDS Documents</Text>
          <Text style={s.heroSub}>
            {pendingCount > 0 ? `${pendingCount} awaiting review` : 'All DDS reviewed'}
          </Text>
        </SafeAreaView>
      </View>

      {/* Filter row */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const cnt = f === 'ALL' ? dds.length : dds.filter((d) => d.status === f).length;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'ALL' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DDSCard dds={item} onApprove={handleApprove} onReject={handleReject} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No DDS documents</Text>
              <Text style={s.emptyMsg}>DDS submissions from operators will appear here for review.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  filterRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.steel200, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 11, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  docIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  ref: { fontSize: 15, fontWeight: '800', color: C.ink },
  meta: { fontSize: 12, color: C.muted, marginTop: 2 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  chipText: { fontSize: 9, fontWeight: '800' },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0, borderTopWidth: 1, borderTopColor: C.steel100 },
  detailItem: { width: '50%', paddingVertical: 8, paddingHorizontal: 4 },
  detailLabel: { fontSize: 10, fontWeight: '700', color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  detailVal: { fontSize: 13, fontWeight: '700', color: C.ink },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.steel100 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderColor: C.eudrHigh, borderRadius: 12, paddingVertical: 11 },
  rejectText: { fontSize: 13, fontWeight: '800', color: C.eudrHigh },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.eudrLow, borderRadius: 12, paddingVertical: 11 },
  approveText: { fontSize: 13, fontWeight: '800', color: C.white },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
