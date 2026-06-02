import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { farmerAPI, polygonAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────
const verifyBadge = (vs) => {
  if (!vs || vs === 'draft')    return { label: 'Draft',    color: C.steel600,  bg: C.steel100 };
  if (vs === 'admin_approved')  return { label: 'Approved', color: '#15803d',   bg: '#dcfce7' };
  if (vs === 'coop_approved')   return { label: 'Coop ✓',   color: '#1d4ed8',   bg: '#dbeafe' };
  if (vs === 'pending')         return { label: 'Pending',  color: '#b45309',   bg: '#fef3c7' };
  if (vs === 'rejected')        return { label: 'Rejected', color: '#dc2626',   bg: '#fee2e2' };
  return { label: vs, color: C.steel600, bg: C.steel100 };
};

const complianceBadge = (cs) => {
  if (!cs) return { label: 'Under Review', color: '#b45309', bg: '#fef3c7' };
  const s = cs.toUpperCase();
  if (s.includes('COMPLIANT') && !s.includes('NON')) return { label: 'Compliant',    color: '#15803d', bg: '#dcfce7' };
  if (s.includes('LOW'))                              return { label: 'Low Risk',     color: '#15803d', bg: '#dcfce7' };
  if (s.includes('MEDIUM') || s.includes('REVIEW'))  return { label: 'Under Review', color: '#b45309', bg: '#fef3c7' };
  if (s.includes('HIGH') || s.includes('NON'))       return { label: 'Non-Compliant', color: '#dc2626', bg: '#fee2e2' };
  return { label: cs, color: C.muted, bg: C.steel100 };
};

const fmt = (n, dec = 2) => n != null && n !== 0 ? Number(n).toFixed(dec) : '—';

// ── Summary filter config ──────────────────────────────────────────────────────
const FILTERS = [
  { key: 'all',           label: 'Total',         icon: 'leaf-outline',             color: C.c700,    bg: C.c050 },
  { key: 'pending',       label: 'Pending',        icon: 'time-outline',             color: '#b45309', bg: '#fef3c7' },
  { key: 'approved',      label: 'Verified',       icon: 'checkmark-circle-outline', color: '#15803d', bg: '#dcfce7' },
  { key: 'compliant',     label: 'Compliant',      icon: 'shield-checkmark-outline', color: '#1d4ed8', bg: '#dbeafe' },
  { key: 'non_compliant', label: 'Non-Compliant',  icon: 'warning-outline',          color: '#dc2626', bg: '#fee2e2' },
];

const matchFilter = (farm, key) => {
  if (key === 'all') return true;
  if (key === 'pending')       return !farm.verification_status || farm.verification_status === 'pending' || farm.verification_status === 'draft';
  if (key === 'approved')      return farm.verification_status === 'admin_approved' || farm.verification_status === 'coop_approved';
  if (key === 'compliant') {
    const r = (farm.eudr_risk_level || farm.compliance_status || '').toLowerCase();
    return r.includes('low') || (r.includes('compliant') && !r.includes('non'));
  }
  if (key === 'non_compliant') {
    const r = (farm.eudr_risk_level || farm.compliance_status || '').toLowerCase();
    return r.includes('high') || r.includes('non') || r.includes('medium');
  }
  return true;
};

// ── Farm Card (matching web layout) ──────────────────────────────────────────
const FarmCard = ({ farm, onPress, onCapture, onAnalyse }) => {
  const vb = verifyBadge(farm.verification_status);
  const cb = complianceBadge(farm.eudr_risk_level || farm.compliance_status);
  const hasPolygon = farm.parcels_count > 0;

  return (
    <View style={[s.card, { borderLeftColor: vb.color }]}>
      {/* Update required banner */}
      {farm.update_requested && (
        <View style={s.updateBanner}>
          <Ionicons name="warning-outline" size={14} color="#b45309" />
          <Text style={s.updateBannerText}>Update required{farm.update_request_notes ? `: ${farm.update_request_notes}` : ''}</Text>
        </View>
      )}

      {/* Header row: name + status badge */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={s.cardHeader}>
          <Text style={s.farmName} numberOfLines={2}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
          <View style={[s.badge, { backgroundColor: vb.bg }]}>
            <Text style={[s.badgeText, { color: vb.color }]}>{vb.label}</Text>
          </View>
        </View>

        {/* Farm details */}
        <View style={s.cardBody}>
          <View style={s.detailRow}>
            <Ionicons name="expand-outline" size={13} color={C.eudrLow} />
            <Text style={s.detailText}>{fmt(farm.total_area_hectares) !== '—' ? `${fmt(farm.total_area_hectares)} ha total` : 'Area not set'}</Text>
          </View>
          {farm.coffee_area_hectares != null && farm.coffee_area_hectares > 0 && (
            <View style={s.detailRow}>
              <Ionicons name="leaf-outline" size={13} color={C.c600} />
              <Text style={s.detailText}>{fmt(farm.coffee_area_hectares)} ha coffee</Text>
            </View>
          )}
          <View style={s.detailRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.eudrLow} />
            <View style={[s.badge, { backgroundColor: cb.bg }]}>
              <Text style={[s.badgeText, { color: cb.color }]}>{cb.label}</Text>
            </View>
          </View>
          {farm.county && (
            <View style={s.detailRow}>
              <Ionicons name="location-outline" size={13} color={C.subtle} />
              <Text style={s.detailText}>{farm.county}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Action buttons: View / Capture / Analyse */}
      <View style={s.cardActions}>
        <TouchableOpacity style={s.actionBtn} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={14} color={C.c700} />
          <Text style={s.actionBtnText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.actionBtnMid]} onPress={onCapture} activeOpacity={0.8}>
          <Ionicons name={hasPolygon ? 'refresh-outline' : 'location-outline'} size={14} color={hasPolygon ? '#b45309' : '#15803d'} />
          <Text style={[s.actionBtnText, { color: hasPolygon ? '#b45309' : '#15803d' }]}>
            {hasPolygon ? 'Recapture' : 'Capture'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, !hasPolygon && s.actionBtnDisabled]}
          onPress={hasPolygon ? onAnalyse : null}
          activeOpacity={hasPolygon ? 0.8 : 1}
        >
          <Ionicons name="analytics-outline" size={14} color={hasPolygon ? '#1d4ed8' : C.subtle} />
          <Text style={[s.actionBtnText, { color: hasPolygon ? '#1d4ed8' : C.subtle }]}>Analyse</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────────
export default function FarmsListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [farms,        setFarms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [error,        setError]        = useState(null);

  // Farm code lookup (replaces S01 FarmIDEntry)
  const [farmCode,     setFarmCode]     = useState('');
  const [lookupLoading,setLookupLoading]= useState(false);
  const [lookupError,  setLookupError]  = useState(null);

  const handleFarmCodeLookup = async () => {
    if (!farmCode.trim()) return;
    setLookupError(null);
    setLookupLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected && net.isInternetReachable !== false) {
        try {
          const res = await polygonAPI.getFarm(farmCode.trim());
          if (res.status === 200) {
            navigation.navigate('FarmConfirmation', { farmId: farmCode.trim(), farm: res.data });
            setFarmCode('');
            return;
          }
        } catch (e) {
          if (e.response?.status === 404) {
            setLookupError('Farm code not found. Check and try again.');
            return;
          }
        }
      }
      navigation.navigate('WalkBoundary', { farmId: farmCode.trim() });
      setFarmCode('');
    } finally {
      setLookupLoading(false);
    }
  };

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await farmerAPI.getFarms();
      const data = res.data;
      setFarms(Array.isArray(data) ? data : data?.farms || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load farms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // Derived stats
  const totalArea   = farms.reduce((s, f) => s + (f.total_area_hectares  || 0), 0);
  const coffeeArea  = farms.reduce((s, f) => s + (f.coffee_area_hectares || 0), 0);
  const verified    = farms.filter(f => f.verification_status === 'admin_approved' || f.verification_status === 'coop_approved').length;
  const compliant   = farms.filter(f => matchFilter(f, 'compliant')).length;
  const nonCompliant = farms.filter(f => matchFilter(f, 'non_compliant')).length;

  const counts = Object.fromEntries(
    FILTERS.map(f => [f.key, f.key === 'all' ? farms.length : farms.filter(fm => matchFilter(fm, f.key)).length])
  );

  const filtered = farms.filter(f => matchFilter(f, activeFilter));

  const renderItem = ({ item }) => (
    <FarmCard
      farm={item}
      onPress={() => navigation.navigate('FarmDetail', { farm: item })}
      onCapture={() => navigation.navigate('WalkBoundary', { farmId: item.farm_code || item.id })}
      onAnalyse={() => navigation.navigate('FarmDetail', { farm: item, openTab: 'eudr' })}
    />
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>My Farms</Text>
            <Text style={s.headerSub}>
              {activeFilter === 'all'
                ? `${farms.length} farm${farms.length !== 1 ? 's' : ''} registered`
                : `${filtered.length} of ${farms.length} · ${FILTERS.find(f => f.key === activeFilter)?.label}`}
            </Text>
          </View>
          <TouchableOpacity style={s.queueBtn} onPress={() => navigation.navigate('QueueList')} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={16} color={C.c700} />
            <Text style={s.queueBtnText}>Offline Queue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 5 Stat cards — single row */}
      {!loading && (
        <View style={s.summaryWrap}>
          {[
            { key: 'all',           icon: 'leaf-outline',             label: 'Total',      color: C.c700,    bg: C.c050 },
            { key: 'approved',      icon: 'checkmark-circle-outline', label: 'Verified',   color: '#15803d', bg: '#dcfce7' },
            { key: 'pending',       icon: 'time-outline',             label: 'Pending',    color: '#b45309', bg: '#fef3c7' },
            { key: 'compliant',     icon: 'shield-checkmark-outline', label: 'Compliant',  color: '#1d4ed8', bg: '#dbeafe' },
            { key: 'non_compliant', icon: 'warning-outline',          label: 'Non-EUDR',   color: '#dc2626', bg: '#fee2e2' },
          ].map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.miniCard, { backgroundColor: f.bg, borderColor: activeFilter === f.key ? f.color : 'transparent' }]}
              onPress={() => setActiveFilter(activeFilter === f.key ? 'all' : f.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={f.icon} size={16} color={f.color} />
              <Text style={[s.miniCount, { color: f.color }]}>{counts[f.key] ?? 0}</Text>
              <Text style={[s.miniLabel, { color: f.color }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Farm Code Lookup */}
      <View style={s.lookupWrap}>
        <Text style={s.lookupTitle}>Capture Existing Farm Boundary</Text>
        <View style={s.lookupRow}>
          <View style={[s.lookupInputWrap, !!lookupError && { borderColor: '#dc2626' }]}>
            <Text style={s.lookupHash}>#</Text>
            <TextInput
              style={s.lookupInput}
              value={farmCode}
              onChangeText={(v) => { setFarmCode(v); setLookupError(null); }}
              placeholder="Enter Farm Code"
              placeholderTextColor={C.subtle}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="go"
              onSubmitEditing={handleFarmCodeLookup}
            />
          </View>
          <TouchableOpacity
            style={[s.lookupBtn, (!farmCode.trim() || lookupLoading) && s.lookupBtnDisabled]}
            onPress={handleFarmCodeLookup}
            disabled={!farmCode.trim() || lookupLoading}
            activeOpacity={0.8}
          >
            {lookupLoading
              ? <ActivityIndicator color={C.white} size="small" />
              : <Ionicons name="arrow-forward" size={18} color={C.white} />
            }
          </TouchableOpacity>
        </View>
        {!!lookupError && <Text style={s.lookupError}>{lookupError}</Text>}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
          <Text style={s.loadText}>Loading farms...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.subtle} />
          <Text style={s.errText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="leaf-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No farms found</Text>
              <Text style={s.emptyMsg}>
                {'Farms linked to your account will appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB — Add Farm */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('AddFarm')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={20} color={C.white} />
        <Text style={s.fabLabel}>Add Farm</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  queueBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.c100, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 2 },
  queueBtnText: { fontSize: 12, fontWeight: '700', color: C.c700 },

  // Farm code lookup
  lookupWrap: { backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  lookupTitle: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  lookupRow: { flexDirection: 'row', gap: 8 },
  lookupInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.steel100, borderRadius: 12, borderWidth: 1.5, borderColor: C.steel200, paddingHorizontal: 12, height: 44 },
  lookupHash: { fontSize: 16, fontWeight: '800', color: C.c400, marginRight: 8 },
  lookupInput: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '600' },
  lookupBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  lookupBtnDisabled: { backgroundColor: C.steel300 },
  lookupError: { fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 6 },

  // 5-card single row
  summaryWrap: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200, paddingHorizontal: 10, paddingVertical: 10, gap: 6 },
  miniCard: { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 2, gap: 2, borderWidth: 1.5 },
  miniCount: { fontSize: 16, fontWeight: '900' },
  miniLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', lineHeight: 10 },

  // Farm card (web-style)
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2, borderLeftWidth: 4, overflow: 'hidden' },

  updateBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#fde68a' },
  updateBannerText: { fontSize: 12, color: '#b45309', fontWeight: '600', flex: 1 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 14, paddingBottom: 8, gap: 8 },
  farmName: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0 },
  badgeText: { fontSize: 10, fontWeight: '800' },

  cardBody: { paddingHorizontal: 14, paddingBottom: 10, gap: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: C.muted, fontWeight: '500' },

  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.steel100 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
  actionBtnMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.steel100 },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: C.c700 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  loadText: { marginTop: 12, color: C.muted, fontSize: 14 },
  errText: { marginTop: 12, color: C.muted, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: C.white, fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  fab: { position: 'absolute', bottom: 28, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.c700, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  fabLabel: { fontSize: 14, fontWeight: '800', color: C.white },
});
