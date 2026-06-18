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
import ProfileAvatar from '../components/ProfileAvatar';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const farmerStatusStyle = (f) => {
  const vs = (f.verification_status || '').toLowerCase();
  const cs = (f.coop_status || '').toLowerCase();
  if (vs === 'verified')       return { label: 'Verified',      color: '#15803d', bg: '#dcfce7' };
  if (vs === 'rejected')       return { label: 'Rejected',      color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_rejected')  return { label: 'Rejected',      color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_approved')  return { label: 'Coop Approved', color: '#0891b2', bg: '#e0f2fe' };
  return                              { label: 'Pending',       color: C.c700,    bg: C.c050 };
};

const farmStatusStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'coop_approved' || s === 'admin_approved') return { label: 'Approved', color: '#15803d', bg: '#dcfce7' };
  if (s === 'coop_rejected' || s === 'rejected')       return { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' };
  if (s === 'pending' || s === 'draft')                return { label: 'Pending',  color: C.c700,    bg: C.c050 };
  return                                                      { label: s || 'Draft', color: C.muted,  bg: C.steel100 };
};

const isPendingFarm = (f) => {
  const s = (f.verification_status || '').toLowerCase();
  const c = (f.coop_status || '').toLowerCase();
  return s === 'pending' || s === 'draft' ||
    (!c.includes('approved') && !c.includes('rejected') && s !== 'coop_approved' && s !== 'admin_approved');
};

const initials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CoopFarmsHubScreen() {
  const navigation = useNavigation();
  const [segment, setSegment] = useState('farmers'); // 'farmers' | 'farms'

  // Farmers state
  const [farmers,   setFarmers]   = useState([]);
  const [pending,   setPending]   = useState([]);

  // Farms state
  const [farms,      setFarms]      = useState([]);
  const [actionId,   setActionId]   = useState(null);

  // Shared UI state
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query,      setQuery]      = useState('');
  const [farmFilter, setFarmFilter] = useState('all'); // 'all' | 'pending' | 'coop_approved' | 'coop_rejected'

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [fRes, pfRes, farmRes] = await Promise.allSettled([
        coopAPI.getFarmers(),
        coopAPI.getPendingFarmers(),
        coopAPI.getFarms(),
      ]);
      if (fRes.status === 'fulfilled') {
        const d = fRes.value.data;
        setFarmers(Array.isArray(d) ? d : []);
      }
      if (pfRes.status === 'fulfilled') {
        const d = pfRes.value.data;
        setPending(Array.isArray(d) ? d : []);
      }
      if (farmRes.status === 'fulfilled') {
        const d = farmRes.value.data;
        setFarms(Array.isArray(d) ? d : (d?.farms || []));
      }
    } catch (e) { console.warn('CoopFarmsHub load:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // ── Approve / Reject farm ─────────────────────────────────────────────────
  const handleApproveFarm = (farm) => {
    Alert.alert(
      'Approve Farm',
      `Approve "${farm.farm_name || 'this farm'}" for ${farm.farmer_name || 'the farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            setActionId(farm.id);
            try {
              await coopAPI.approveFarm(farm.id, '');
              setFarms(prev => prev.map(f =>
                f.id === farm.id ? { ...f, verification_status: 'coop_approved', coop_status: 'coop_approved' } : f
              ));
              Alert.alert('Approved', `${farm.farm_name || 'Farm'} has been approved.`);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Approval failed.');
            } finally { setActionId(null); }
          },
        },
      ]
    );
  };

  const handleRejectFarm = (farm) => {
    Alert.alert(
      'Reject Farm',
      `Reject "${farm.farm_name || 'this farm'}"? The farmer will be notified.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive', onPress: async () => {
            setActionId(farm.id);
            try {
              await coopAPI.rejectFarm(farm.id, 'Rejected by cooperative officer');
              setFarms(prev => prev.map(f =>
                f.id === farm.id ? { ...f, verification_status: 'coop_rejected', coop_status: 'coop_rejected' } : f
              ));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
            } finally { setActionId(null); }
          },
        },
      ]
    );
  };

  // ── Filtered data ─────────────────────────────────────────────────────────
  const q = query.toLowerCase().trim();

  const filteredFarmers = farmers.filter(f => {
    if (!q) return true;
    return (
      `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase().includes(q) ||
      (f.phone || '').includes(q) ||
      (f.county || '').toLowerCase().includes(q)
    );
  });

  const filteredFarms = farms.filter(f => {
    const s = (f.verification_status || 'draft').toLowerCase();
    const matchFilter =
      farmFilter === 'all' ||
      (farmFilter === 'pending' && isPendingFarm(f)) ||
      s === farmFilter || (f.coop_status || '').toLowerCase() === farmFilter;
    if (!matchFilter) return false;
    if (!q) return true;
    return (
      (f.farm_name || '').toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q) ||
      (f.farm_code || '').toLowerCase().includes(q)
    );
  });

  const pendingFarmsCount = farms.filter(isPendingFarm).length;
  const pendingFarmersCount = pending.length;

  // ── Render farmer row ─────────────────────────────────────────────────────
  const renderFarmer = ({ item: f, index }) => {
    const st = farmerStatusStyle(f);
    const name = `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unnamed Farmer';
    return (
      <TouchableOpacity
        style={[s.row, index === 0 && { borderTopWidth: 0 }]}
        onPress={() => navigation.navigate('FarmerDetail', { farmerId: f.id, farmer: f })}
        activeOpacity={0.8}
      >
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials(name).toUpperCase()}</Text>
        </View>
        <View style={s.rowBody}>
          <Text style={s.rowName}>{name}</Text>
          <Text style={s.rowMeta}>{f.phone || '—'}{f.county ? `  ·  ${f.county}` : ''}</Text>
          <Text style={s.rowSub}>Joined {fmtDate(f.date_joined || f.created_at)}</Text>
        </View>
        <View style={[s.badge, { backgroundColor: st.bg }]}>
          <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  // ── Render farm row ───────────────────────────────────────────────────────
  const renderFarm = ({ item: farm, index }) => {
    const st = farmStatusStyle(farm.verification_status || farm.coop_status);
    const pending = isPendingFarm(farm);
    const actioning = actionId === farm.id;

    return (
      <View style={[s.farmCard, index === 0 && { borderTopWidth: 0 }]}>
        <View style={s.farmCardTop}>
          <View style={[s.farmIconBox, { backgroundColor: pending ? C.c050 : C.steel100 }]}>
            <Ionicons name="leaf" size={20} color={pending ? C.c700 : C.muted} />
          </View>
          <View style={s.farmCardBody}>
            <Text style={s.rowName} numberOfLines={1}>{farm.farm_name || 'Unnamed Farm'}</Text>
            <Text style={s.rowMeta}>{farm.farmer_name || '—'}{farm.county ? `  ·  ${farm.county}` : ''}</Text>
            {farm.farm_code ? <Text style={s.rowSub}>Code: {farm.farm_code}</Text> : null}
          </View>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {pending && (
          <View style={s.farmActions}>
            <TouchableOpacity
              style={[s.rejectBtn, actioning && { opacity: 0.5 }]}
              onPress={() => handleRejectFarm(farm)}
              disabled={!!actioning}
              activeOpacity={0.8}
            >
              {actioning
                ? <ActivityIndicator size="small" color="#dc2626" />
                : <><Ionicons name="close" size={14} color="#dc2626" /><Text style={s.rejectBtnText}>Reject</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.approveBtn, actioning && { opacity: 0.5 }]}
              onPress={() => handleApproveFarm(farm)}
              disabled={!!actioning}
              activeOpacity={0.8}
            >
              {actioning
                ? <ActivityIndicator size="small" color={C.white} />
                : <><Ionicons name="checkmark" size={14} color={C.white} /><Text style={s.approveBtnText}>Approve</Text></>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const FARM_FILTERS = [
    { key: 'all',          label: `All (${farms.length})` },
    { key: 'pending',      label: `Pending (${pendingFarmsCount})` },
    { key: 'coop_approved',label: 'Approved' },
    { key: 'coop_rejected',label: 'Rejected' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Farmers & Farms</Text>
            <Text style={s.headerSub}>
              {segment === 'farmers'
                ? `${farmers.length} farmers · ${pendingFarmersCount} pending`
                : `${farms.length} farms · ${pendingFarmsCount} pending approval`
              }
            </Text>
          </View>
          <ProfileAvatar />
        </View>

        {/* Segment control */}
        <View style={s.segmentRow}>
          {[
            { key: 'farmers', label: 'Farmers', icon: 'people-outline', badge: pendingFarmersCount },
            { key: 'farms',   label: 'Farms',   icon: 'leaf-outline',   badge: pendingFarmsCount },
          ].map(seg => (
            <TouchableOpacity
              key={seg.key}
              style={[s.segBtn, segment === seg.key && s.segBtnActive]}
              onPress={() => { setSegment(seg.key); setQuery(''); }}
              activeOpacity={0.8}
            >
              <Ionicons name={seg.icon} size={16} color={segment === seg.key ? C.c700 : C.muted} />
              <Text style={[s.segBtnText, segment === seg.key && s.segBtnTextActive]}>{seg.label}</Text>
              {seg.badge > 0 && (
                <View style={s.segBadge}>
                  <Text style={s.segBadgeText}>{seg.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder={segment === 'farmers' ? 'Search farmers…' : 'Search farms…'}
          placeholderTextColor={C.subtle}
          autoCapitalize="none"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Farm filters (only when on Farms segment) */}
      {segment === 'farms' && (
        <View style={s.filterRow}>
          {FARM_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterChip, farmFilter === f.key && s.filterChipActive]}
              onPress={() => setFarmFilter(f.key)}
              activeOpacity={0.8}
            >
              <Text style={[s.filterChipText, farmFilter === f.key && s.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : segment === 'farmers' ? (
        <FlatList
          data={filteredFarmers}
          keyExtractor={item => String(item.id)}
          renderItem={renderFarmer}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>{query ? 'No results' : 'No farmers yet'}</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Farmers registered under this cooperative will appear here.'}</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredFarms}
          keyExtractor={item => String(item.id)}
          renderItem={renderFarm}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>{query ? 'No results' : 'No farms yet'}</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Farm submissions from farmers in this cooperative will appear here.'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 0,
    borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  segmentRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.steel200,
    backgroundColor: C.steel100,
  },
  segBtnActive: { borderColor: C.c700, backgroundColor: C.c050 },
  segBtnText: { fontSize: 13, fontWeight: '700', color: C.muted },
  segBtnTextActive: { color: C.c700 },
  segBadge: { backgroundColor: C.c700, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  segBadgeText: { fontSize: 10, fontWeight: '800', color: C.white },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: 14, marginBottom: 8,
    backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.steel200,
  },
  search: { flex: 1, fontSize: 14, color: C.ink, height: 20 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.steel200 },
  filterChipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.steel700 },
  filterChipTextActive: { color: C.white },

  list: { paddingBottom: 24 },

  // Farmer row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel100,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '900', color: C.white },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowSub: { fontSize: 11, color: C.subtle, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Farm card
  farmCard: {
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel100,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  farmCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  farmCardBody: { flex: 1 },
  farmActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingLeft: 52 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.c700, borderRadius: 8, paddingVertical: 9,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: '#fecaca',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
