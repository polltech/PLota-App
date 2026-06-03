import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const verifyStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'coop_approved' || s === 'admin_approved') return { color: '#15803d', bg: '#dcfce7', label: 'Approved' };
  if (s === 'pending' || s === 'draft') return { color: '#b45309', bg: '#fef3c7', label: 'Pending' };
  if (s === 'coop_rejected' || s === 'rejected') return { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' };
  return { color: C.steel600, bg: C.steel100, label: status || 'Draft' };
};

const eudrStyle = (s) => {
  if (!s) return null;
  const u = s.toUpperCase();
  if (u.includes('LOW') || (u.includes('COMPLIANT') && !u.includes('NON'))) return { color: '#15803d', bg: '#dcfce7' };
  if (u.includes('HIGH') || u.includes('RISK') || u.includes('NON')) return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'coop_approved', label: 'Approved' },
  { key: 'draft', label: 'Draft' },
  { key: 'coop_rejected', label: 'Rejected' },
];

export default function CoopFarmsScreen() {
  const navigation = useNavigation();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionFarmId, setActionFarmId] = useState(null); // tracks which farm is being actioned

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getFarms();
      const d = res.data;
      setFarms(Array.isArray(d) ? d : (d?.farms || []));
    } catch (e) {
      console.warn('CoopFarms load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleApprove = (farm) => {
    Alert.alert(
      'Approve Farm',
      `Approve "${farm.farm_name || 'this farm'}" for ${farm.farmer_name || 'the farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            setActionFarmId(farm.id);
            try {
              await coopAPI.approveFarm(farm.id, '');
              setFarms(prev => prev.map(f => f.id === farm.id
                ? { ...f, verification_status: 'coop_approved', coop_status: 'coop_approved' }
                : f));
              Alert.alert('Approved', `${farm.farm_name || 'Farm'} has been approved.`);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Approval failed.');
            } finally {
              setActionFarmId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (farm) => {
    Alert.prompt !== undefined
      ? Alert.prompt(
          'Reject Farm',
          `Reason for rejecting "${farm.farm_name || 'this farm'}"?`,
          async (reason) => {
            if (reason === null) return; // cancelled
            setActionFarmId(farm.id);
            try {
              await coopAPI.rejectFarm(farm.id, reason || 'Rejected by cooperative officer');
              setFarms(prev => prev.map(f => f.id === farm.id
                ? { ...f, verification_status: 'rejected', coop_status: 'coop_rejected' }
                : f));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
            } finally {
              setActionFarmId(null);
            }
          },
          'plain-text', '', 'default'
        )
      : Alert.alert(
          'Reject Farm',
          `Reject "${farm.farm_name || 'this farm'}"? The farmer will be notified.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject', style: 'destructive', onPress: async () => {
                setActionFarmId(farm.id);
                try {
                  await coopAPI.rejectFarm(farm.id, 'Rejected by cooperative officer');
                  setFarms(prev => prev.map(f => f.id === farm.id
                    ? { ...f, verification_status: 'rejected', coop_status: 'coop_rejected' }
                    : f));
                } catch (e) {
                  Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
                } finally {
                  setActionFarmId(null);
                }
              },
            },
          ]
        );
  };

  const isPending = (f) => {
    const s = (f.verification_status || '').toLowerCase();
    const c = (f.coop_status || '').toLowerCase();
    return s === 'pending' || s === 'draft' || (s !== 'coop_approved' && s !== 'admin_approved' && s !== 'coop_rejected' && s !== 'rejected' && !c.includes('approved'));
  };

  const filtered = farms.filter((f) => {
    const s = (f.verification_status || 'draft').toLowerCase();
    const matchFilter = filter === 'all' || s === filter || (filter === 'pending' && isPending(f));
    if (!matchFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (f.farm_name || f.name || '').toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q) ||
      (f.farm_code || '').toLowerCase().includes(q)
    );
  });

  const counts = {
    all: farms.length,
    pending: farms.filter(f => isPending(f)).length,
    coop_approved: farms.filter(f => ['coop_approved','admin_approved'].includes((f.verification_status||'').toLowerCase())).length,
    draft: farms.filter(f => (f.verification_status||'draft').toLowerCase() === 'draft').length,
    coop_rejected: farms.filter(f => ['coop_rejected','rejected'].includes((f.verification_status||'').toLowerCase())).length,
  };

  const renderFarm = ({ item: farm }) => {
    const vs = verifyStyle(farm.verification_status);
    const es = eudrStyle(farm.eudr_risk_level || farm.compliance_status);
    const pending = isPending(farm);
    const actioning = actionFarmId === farm.id;

    return (
      <View style={[s.card, pending && s.cardPending]}>
        <TouchableOpacity
          style={s.cardMain}
          onPress={() => navigation.navigate('CoopFarmsList', { farm })}
          activeOpacity={0.8}
        >
          <View style={[s.farmIcon, { backgroundColor: pending ? '#fef3c7' : C.c050 }]}>
            <Ionicons name="leaf" size={20} color={pending ? '#b45309' : C.c600} />
          </View>
          <View style={s.cardContent}>
            <View style={s.cardTop}>
              <Text style={s.farmName} numberOfLines={1}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
              <View style={[s.badge, { backgroundColor: vs.bg }]}>
                <Text style={[s.badgeText, { color: vs.color }]}>{vs.label}</Text>
              </View>
            </View>
            <Text style={s.farmerName} numberOfLines={1}>{farm.farmer_name || '—'}</Text>
            <View style={s.metaRow}>
              {farm.total_area_ha != null && (
                <Text style={s.meta}>{Number(farm.total_area_ha).toFixed(2)} ha</Text>
              )}
              {farm.county && <Text style={s.meta}> · {farm.county}</Text>}
              {es && (
                <View style={[s.eudrBadge, { backgroundColor: es.bg }]}>
                  <Text style={[s.eudrBadgeText, { color: es.color }]}>
                    {(farm.eudr_risk_level || farm.compliance_status || '').slice(0, 12)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.subtle} />
        </TouchableOpacity>

        {/* Inline approve/reject for pending farms */}
        {pending && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.approveBtn, actioning && s.btnDisabled]}
              onPress={() => handleApprove(farm)}
              disabled={actioning}
              activeOpacity={0.8}
            >
              {actioning
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name="checkmark-circle-outline" size={15} color={C.white} />
                    <Text style={s.approveBtnText}>Approve Farm</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectBtn, actioning && s.btnDisabled]}
              onPress={() => handleReject(farm)}
              disabled={actioning}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={15} color="#dc2626" />
              <Text style={s.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Cooperative Farms</Text>
            <Text style={s.headerSub}>
              {farms.length} farms · {counts.pending} pending review
            </Text>
          </View>
          {counts.pending > 0 && (
            <View style={s.pendingPill}>
              <Ionicons name="alert-circle" size={14} color="#b45309" />
              <Text style={s.pendingPillText}>{counts.pending} to review</Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* 4 stat cards — matching web app farm approvals page */}
      {!loading && (
        <View style={s.statsRow}>
          {[
            { val: farms.length,           label: 'Total',     color: C.c700,    bg: C.c050 },
            { val: counts.pending,         label: 'Pending',   color: '#b45309', bg: '#fef3c7' },
            { val: counts.coop_approved,   label: 'Approved',  color: '#15803d', bg: '#dcfce7' },
            { val: counts.coop_rejected,   label: 'Rejected',  color: '#dc2626', bg: '#fee2e2' },
          ].map(c => (
            <View key={c.label} style={[s.statCard, { backgroundColor: c.bg, borderLeftColor: c.color }]}>
              <Text style={[s.statVal, { color: c.color }]}>{c.val}</Text>
              <Text style={[s.statLbl, { color: c.color }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>
              {f.label} ({counts[f.key] ?? 0})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color={C.subtle} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by farm name, farmer, county, code..."
          placeholderTextColor={C.subtle}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFarm}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No farms found</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Farms in your cooperative will appear here.'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pendingPillText: { fontSize: 12, fontWeight: '700', color: '#b45309' },

  filterRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: C.steel200 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, margin: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },

  list: { paddingHorizontal: 16, paddingBottom: 80 },

  card: { backgroundColor: C.white, borderRadius: 18, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  cardPending: { borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  farmIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14, flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  farmName: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  farmerName: { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  meta: { fontSize: 11, color: C.subtle },
  eudrBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  eudrBadgeText: { fontSize: 9, fontWeight: '700' },

  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.steel100 },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#15803d', paddingVertical: 11 },
  approveBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderLeftWidth: 1, borderLeftColor: C.steel100, paddingVertical: 11 },
  rejectBtnText: { color: '#dc2626', fontSize: 13, fontWeight: '800' },
  btnDisabled: { opacity: 0.5 },

  statsRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center', borderLeftWidth: 3 },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 11 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
