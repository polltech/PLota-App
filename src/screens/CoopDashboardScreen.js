import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch { return '—'; }
};
const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'received' || u === 'processed')           return { color: '#15803d', bg: '#dcfce7', dot: '#15803d' };
  if (u === 'in_processing')                           return { color: '#1d4ed8', bg: '#dbeafe', dot: '#1d4ed8' };
  if (u === 'ready_for_batching' || u === 'batched')   return { color: '#7c3aed', bg: '#ede9fe', dot: '#7c3aed' };
  if (u === 'rejected')                                return { color: '#dc2626', bg: '#fee2e2', dot: '#dc2626' };
  return { color: '#b45309', bg: '#fef3c7', dot: '#b45309' };
};
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

export default function CoopDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const isAgent = user?.role === 'delivery_agent';

  const [farmers,          setFarmers]         = useState([]);
  const [farms,            setFarms]            = useState([]);
  const [pendingFarmers,   setPendingFarmers]   = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);

  const firstName = user?.first_name || (isAgent ? 'Agent' : 'Officer');
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const roleTitle = isAgent ? 'Delivery Agent' : 'Cooperative Officer';

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      if (isAgent) {
        const [dRes] = await Promise.allSettled([coopAPI.getDeliveries()]);
        if (dRes.status === 'fulfilled') {
          const d = dRes.value.data;
          setRecentDeliveries((Array.isArray(d) ? d : (d?.deliveries || [])).slice(0, 5));
        }
      } else {
        const [fRes, farmRes, pfRes, dRes] = await Promise.allSettled([
          coopAPI.getFarmers(),
          coopAPI.getFarms(),
          coopAPI.getPendingFarmers(),
          coopAPI.getDeliveries(),
        ]);
        if (fRes.status    === 'fulfilled') setFarmers(Array.isArray(fRes.value.data) ? fRes.value.data : []);
        if (farmRes.status === 'fulfilled') { const d = farmRes.value.data; setFarms(Array.isArray(d) ? d : (d?.farms || [])); }
        if (pfRes.status   === 'fulfilled') setPendingFarmers(Array.isArray(pfRes.value.data) ? pfRes.value.data : []);
        if (dRes.status    === 'fulfilled') { const d = dRes.value.data; setRecentDeliveries((Array.isArray(d) ? d : (d?.deliveries || [])).slice(0, 5)); }
      }
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAgent]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>;
  }

  const pendingFarmsCount = farms.filter(f =>
    !f.coop_status || f.coop_status === 'pending' || f.coop_status === 'update_requested'
  ).length;

  const metrics = isAgent ? [
    { icon: 'cube-outline',  color: C.c700, bg: '#f0fdf4', value: recentDeliveries.length, label: 'Recent Deliveries' },
  ] : [
    { icon: 'people',            color: C.c700, bg: '#f0fdf4', value: farmers.length,         label: 'Total Farmers',     nav: () => navigation.navigate('CoopFarmers') },
    { icon: 'hourglass-outline', color: C.c700, bg: '#f0fdf4', value: pendingFarmers.length,  label: 'Pending Approval',  nav: () => navigation.navigate('CoopFarmers') },
    { icon: 'leaf-outline',      color: C.c700, bg: '#f0fdf4', value: farms.length,            label: 'Total Farms',       nav: () => navigation.navigate('CoopFarms') },
    { icon: 'cube-outline',      color: C.c700, bg: '#f0fdf4', value: recentDeliveries.length, label: 'Deliveries',        nav: () => navigation.navigate('CoopDeliveries') },
  ];

  const officerActions = [
    { icon: 'person-add-outline',    label: 'Review Farmers',   color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopFarmers') },
    { icon: 'add-circle-outline',    label: 'Record Delivery',  color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopDeliveries') },
    { icon: 'leaf-outline',          label: 'Add Farm',         color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopFarms') },
    { icon: 'layers-outline',        label: 'Batches',          color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopBatches') },
    { icon: 'airplane-outline',      label: 'Consignments',     color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopConsignments') },
    { icon: 'person-circle-outline', label: 'Staff',            color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('CoopStaff') },
  ];
  const agentActions = [
    { icon: 'add-circle-outline', label: 'Record Delivery', color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('AgentDeliveries') },
    { icon: 'list-outline',       label: 'All Deliveries',  color: C.c700, bg: '#f0fdf4', nav: () => navigation.navigate('AgentDeliveries') },
  ];
  const quickActions = isAgent ? agentActions : officerActions;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.decor1} />
        <View style={s.decor2} />

        <SafeAreaView>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <View style={s.workspaceChip}>
                <Ionicons name="business" size={10} color={C.c400} />
                <Text style={s.workspaceText}>Cooperative Workspace</Text>
              </View>
              <Text style={s.greet}>{greeting}</Text>
              <Text style={s.name}>{firstName}</Text>
              <Text style={s.roleTag}>{roleTitle}</Text>
            </View>
            {!isAgent && pendingFarmers.length > 0 && (
              <TouchableOpacity
                style={s.heroBadgeBtn}
                onPress={() => navigation.navigate('CoopFarmers')}
                activeOpacity={0.8}
              >
                <Ionicons name="alert-circle" size={14} color="#fbbf24" />
                <Text style={s.heroBadgeBtnText}>{pendingFarmers.length} pending</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Inline stats strip */}
          {!isAgent && (
            <View style={s.heroStats}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{farmers.length}</Text>
                <Text style={s.heroStatLabel}>Farmers</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{farms.length}</Text>
                <Text style={s.heroStatLabel}>Farms</Text>
              </View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{recentDeliveries.length}</Text>
                <Text style={s.heroStatLabel}>Deliveries</Text>
              </View>
              {pendingFarmsCount > 0 && (
                <>
                  <View style={s.heroStatDivider} />
                  <View style={s.heroStat}>
                    <Text style={[s.heroStatVal, { color: '#fbbf24' }]}>{pendingFarmsCount}</Text>
                    <Text style={s.heroStatLabel}>Farm Reviews</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Metric Cards ──────────────────────────────────────────────── */}
        <View style={s.metricsGrid}>
          {metrics.map((m, i) => (
            <TouchableOpacity
              key={i}
              style={[s.metricCard, { backgroundColor: m.bg }]}
              onPress={m.nav}
              activeOpacity={m.nav ? 0.8 : 1}
              disabled={!m.nav}
            >
              <View style={[s.metricIconWrap, { backgroundColor: m.color + '22' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <Text style={[s.metricVal, { color: m.color }]}>{m.value ?? '—'}</Text>
              <Text style={s.metricLabel}>{m.label}</Text>
              {m.nav && (
                <View style={s.metricArrow}>
                  <Ionicons name="arrow-forward" size={12} color={m.color} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <View style={[s.sectionDot, { backgroundColor: '#15803d' }]} />
              <Text style={s.cardTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate(isAgent ? 'AgentDeliveries' : 'CoopDeliveries')}
              activeOpacity={0.7}
            >
              <Text style={s.seeAll}>View All →</Text>
            </TouchableOpacity>
          </View>

          {recentDeliveries.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={42} color={C.steel300} />
              <Text style={s.emptyTitle}>No deliveries yet</Text>
              <Text style={s.emptyMsg}>Deliveries will appear here once recorded.</Text>
            </View>
          ) : (
            recentDeliveries.map((d, i) => {
              const ss = statusStyle(d.status);
              return (
                <View key={d.id || i} style={[s.deliveryRow, i < recentDeliveries.length - 1 && s.deliveryRowBorder]}>
                  <View style={[s.statusStrip, { backgroundColor: ss.dot }]} />
                  <View style={s.deliveryBody}>
                    <View style={s.deliveryTop}>
                      <Text style={s.deliveryFarmer} numberOfLines={1}>{d.farmer_name || 'Farmer'}</Text>
                      <View style={[s.badge, { backgroundColor: ss.bg }]}>
                        <Text style={[s.badgeText, { color: ss.color }]}>{cap(d.status)}</Text>
                      </View>
                    </View>
                    <View style={s.deliveryBottom}>
                      <Text style={s.deliverySub} numberOfLines={1}>{d.delivery_number || d.farm_name || ''}</Text>
                      <View style={s.deliveryMeta}>
                        {d.net_weight_kg != null && (
                          <View style={s.weightChip}>
                            <Ionicons name="scale-outline" size={10} color={C.muted} />
                            <Text style={s.weightText}>{Number(d.net_weight_kg).toFixed(1)} kg</Text>
                          </View>
                        )}
                        <Text style={s.deliveryDate}>{fmtDate(d.created_at)}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <View style={[s.sectionDot, { backgroundColor: C.c700 }]} />
              <Text style={s.cardTitle}>Quick Actions</Text>
            </View>
          </View>
          <View style={s.actionsGrid}>
            {quickActions.map((a) => (
              <TouchableOpacity
                key={a.label}
                style={[s.actionCard, { backgroundColor: a.bg }]}
                onPress={a.nav}
                activeOpacity={0.8}
              >
                <View style={[s.actionIconWrap, { backgroundColor: a.color + '20' }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={[s.actionLabel, { color: a.color }]} numberOfLines={2}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero:     { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 24, overflow: 'hidden' },
  decor1:   { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.04)', top: -70, right: -50 },
  decor2:   { position: 'absolute', width: 150, height: 150, borderRadius: 75,  backgroundColor: 'rgba(255,255,255,0.05)', bottom: -40, right: 70 },
  heroTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 16 },
  workspaceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  workspaceText:  { fontSize: 10, fontWeight: '800', color: C.c400, textTransform: 'uppercase', letterSpacing: 1 },
  greet:    { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: 2 },
  name:     { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  roleTag:  { fontSize: 11, fontWeight: '700', color: C.c400, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroBadgeBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  heroBadgeBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  heroStats:       { flexDirection: 'row', alignItems: 'center', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8 },
  heroStat:        { flex: 1, alignItems: 'center' },
  heroStatVal:     { fontSize: 20, fontWeight: '900', color: '#fff' },
  heroStatLabel:   { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },

  scroll:  { flex: 1 },
  content: { padding: 14 },

  // Metric cards
  metricsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard:    { width: '47.5%', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  metricIconWrap:{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  metricVal:     { fontSize: 32, fontWeight: '900', marginBottom: 3 },
  metricLabel:   { fontSize: 11, fontWeight: '700', color: C.muted, lineHeight: 14 },
  metricArrow:   { position: 'absolute', top: 14, right: 14 },

  // Generic card
  card:          { backgroundColor: C.white, borderRadius: 20, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  cardHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot:    { width: 8, height: 8, borderRadius: 4 },
  cardTitle:     { fontSize: 15, fontWeight: '800', color: C.ink },
  seeAll:        { fontSize: 13, color: C.c700, fontWeight: '700' },

  // Empty
  emptyBox:  { alignItems: 'center', paddingVertical: 36, gap: 6 },
  emptyTitle:{ fontSize: 14, fontWeight: '700', color: C.steel600, marginTop: 6 },
  emptyMsg:  { fontSize: 12, color: C.muted, textAlign: 'center', paddingHorizontal: 32 },

  // Delivery rows
  deliveryRow:       { flexDirection: 'row', alignItems: 'stretch' },
  deliveryRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusStrip:       { width: 3, marginVertical: 8, marginLeft: 16, borderRadius: 2 },
  deliveryBody:      { flex: 1, paddingVertical: 12, paddingHorizontal: 12, paddingRight: 16 },
  deliveryTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  deliveryBottom:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deliveryFarmer:    { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink, marginRight: 8 },
  deliverySub:       { flex: 1, fontSize: 11, color: C.muted },
  deliveryMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weightChip:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  weightText:        { fontSize: 11, color: C.muted, fontWeight: '600' },
  deliveryDate:      { fontSize: 11, color: C.muted },
  badge:             { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText:         { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  // Quick actions grid
  actionsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 14, paddingTop: 2 },
  actionCard:    { width: '47%', borderRadius: 16, padding: 14, alignItems: 'flex-start' },
  actionIconWrap:{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel:   { fontSize: 13, fontWeight: '700', lineHeight: 18 },
});
