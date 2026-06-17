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
  if (u === 'received' || u === 'processed') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'in_processing') return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'ready_for_batching' || u === 'batched') return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'rejected') return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};
const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';

const BigStatCard = ({ icon, iconColor, value, label, accent, onPress }) => (
  <TouchableOpacity
    style={[s.bigCard, { borderLeftColor: accent }]}
    onPress={onPress}
    activeOpacity={onPress ? 0.8 : 1}
    disabled={!onPress}
  >
    <Ionicons name={icon} size={28} color={iconColor} style={s.bigCardIcon} />
    <Text style={s.bigCardVal}>{value ?? '—'}</Text>
    <Text style={s.bigCardLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function CoopDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [farmers,           setFarmers]          = useState([]);
  const [farms,             setFarms]             = useState([]);
  const [pendingFarmers,    setPendingFarmers]    = useState([]);
  const [recentDeliveries,  setRecentDeliveries]  = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [refreshing,        setRefreshing]        = useState(false);

  const firstName = user?.first_name || 'Officer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [fRes, farmRes, pfRes, dRes] = await Promise.allSettled([
        coopAPI.getFarmers(),
        coopAPI.getFarms(),
        coopAPI.getPendingFarmers(),
        coopAPI.getDeliveries(),
      ]);
      if (fRes.status === 'fulfilled') {
        const d = fRes.value.data;
        setFarmers(Array.isArray(d) ? d : []);
      }
      if (farmRes.status === 'fulfilled') {
        const d = farmRes.value.data;
        setFarms(Array.isArray(d) ? d : (d?.farms || []));
      }
      if (pfRes.status === 'fulfilled') {
        const d = pfRes.value.data;
        setPendingFarmers(Array.isArray(d) ? d : []);
      }
      if (dRes.status === 'fulfilled') {
        const d = dRes.value.data;
        setRecentDeliveries((Array.isArray(d) ? d : (d?.deliveries || [])).slice(0, 5));
      }
    } catch (e) {
      console.warn('CoopDashboard load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>;
  }

  const pendingFarmsCount = farms.filter(f =>
    !f.coop_status || f.coop_status === 'pending' || f.coop_status === 'update_requested'
  ).length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroTop}>
            <View>
              <Text style={s.greet}>{greeting},</Text>
              <Text style={s.name}>{firstName}</Text>
              <Text style={s.roleTag}>Cooperative Officer</Text>
            </View>
            <View style={s.heroActions}>
              {pendingFarmers.length > 0 && (
                <TouchableOpacity
                  style={s.heroBadgeBtn}
                  onPress={() => navigation.navigate('CoopFarmers')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-outline" size={14} color="#fbbf24" />
                  <Text style={s.heroBadgeBtnText}>{pendingFarmers.length} farmers</Text>
                </TouchableOpacity>
              )}
              {/* Profile avatar button — top right */}
              <TouchableOpacity
                style={s.profileBtn}
                onPress={() => navigation.navigate('CoopProfile')}
                activeOpacity={0.8}
              >
                <Text style={s.profileBtnText}>
                  {((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase() || 'CO'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* 4 Stat cards — matching web app */}
        <View style={s.cardsGrid}>
          <BigStatCard
            icon="people"  iconColor="#16a34a"
            value={farmers.length}
            label="Total Farmers"
            accent="#16a34a"
            onPress={() => navigation.navigate('CoopFarmers')}
          />
          <BigStatCard
            icon="hourglass-outline"  iconColor="#15803d"
            value={pendingFarmers.length}
            label="Pending Farmer Approvals"
            accent="#15803d"
            onPress={() => navigation.navigate('CoopFarmers')}
          />
          <BigStatCard
            icon="location-outline"  iconColor="#15803d"
            value={pendingFarmsCount}
            label="Farms Awaiting Approval"
            accent="#15803d"
            onPress={() => navigation.navigate('CoopFarmers', { screen: 'CoopFarmsList' })}
          />
          <BigStatCard
            icon="cube-outline"  iconColor="#15803d"
            value={recentDeliveries.length}
            label="Recent Deliveries"
            accent="#15803d"
            onPress={() => navigation.navigate('CoopDeliveries')}
          />
        </View>

        {/* Recent Deliveries table */}
        <View style={s.tableCard}>
          <View style={s.tableCardHeader}>
            <View style={s.tableCardHeaderLeft}>
              <Ionicons name="time-outline" size={16} color="#15803d" />
              <Text style={s.tableCardTitle}>Recent Deliveries</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('CoopDeliveries')}>
              <Text style={s.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentDeliveries.length === 0 ? (
            <View style={s.tableEmpty}>
              <Ionicons name="cube-outline" size={36} color={C.steel300} />
              <Text style={s.tableEmptyText}>No deliveries yet</Text>
            </View>
          ) : (
            <>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 2 }]}>Farmer</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'center' }]}>Weight</Text>
                <Text style={[s.th, { flex: 1.2, textAlign: 'center' }]}>Status</Text>
                <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Date</Text>
              </View>
              {recentDeliveries.map((d, i) => {
                const ss = statusStyle(d.status);
                return (
                  <View key={d.id || i} style={[s.tableRow, i < recentDeliveries.length - 1 && s.tableRowBorder]}>
                    <View style={{ flex: 2 }}>
                      <Text style={s.tdName} numberOfLines={1}>{d.farmer_name || 'Farmer'}</Text>
                      <Text style={s.tdSub} numberOfLines={1}>{d.farm_name || d.delivery_number || ''}</Text>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'center' }]}>
                      {d.net_weight_kg != null ? `${Number(d.net_weight_kg).toFixed(1)} kg` : '—'}
                    </Text>
                    <View style={{ flex: 1.2, alignItems: 'center' }}>
                      <View style={[s.badge, { backgroundColor: ss.bg }]}>
                        <Text style={[s.badgeText, { color: ss.color }]}>{cap(d.status)}</Text>
                      </View>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'right', color: C.muted }]}>
                      {fmtDate(d.created_at)}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={s.tableCard}>
          <View style={s.tableCardHeader}>
            <View style={s.tableCardHeaderLeft}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={s.tableCardTitle}>Quick Actions</Text>
            </View>
          </View>
          {[
            { icon: 'person-add-outline', label: 'Review Farmer Applications', color: '#f86441', nav: () => navigation.navigate('CoopFarmers') },
            { icon: 'map-outline', label: 'Review Farm Submissions', color: '#1aa053', nav: () => navigation.navigate('CoopFarmers', { screen: 'CoopFarmsList' }) },
            { icon: 'add-circle-outline', label: 'Record Delivery', color: '#0d6efd', nav: () => navigation.navigate('CoopDeliveries', { screen: 'CreateDelivery' }) },
            { icon: 'layers-outline', label: 'Manage Batches', color: '#8b5cf6', nav: () => navigation.navigate('CoopBatches') },
            { icon: 'airplane-outline', label: 'Consignments', color: '#0891b2', nav: () => navigation.navigate('CoopConsignments') },
            { icon: 'person-circle-outline', label: 'Manage Delivery Agents', color: '#16a34a', nav: () => navigation.navigate('CoopStaff') },
          ].map((a, i, arr) => (
            <TouchableOpacity
              key={a.label}
              style={[s.actionRow, i < arr.length - 1 && s.tableRowBorder]}
              onPress={a.nav}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: a.color + '18' }]}>
                <Ionicons name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.subtle} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingHorizontal: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 14 },
  greet: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '800', color: C.white },
  roleTag: { fontSize: 11, fontWeight: '700', color: C.c400, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroActions: { gap: 8, alignItems: 'flex-end' },
  heroBadgeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  heroBadgeBtnText: { fontSize: 11, fontWeight: '700', color: '#fbbf24' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  profileBtnText: { fontSize: 14, fontWeight: '900', color: C.white },

  scroll: { flex: 1 },
  content: { padding: 16 },

  // 4 big stat cards (2×2 grid)
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  bigCard: {
    width: '47.5%', backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderLeftWidth: 4, borderLeftColor: C.c700,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  bigCardIcon: { marginBottom: 8 },
  bigCardVal: { fontSize: 28, fontWeight: '900', color: C.ink, marginBottom: 4 },
  bigCardLabel: { fontSize: 11, fontWeight: '700', color: C.muted, lineHeight: 14 },

  // Table cards
  tableCard: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  tableCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableCardTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  seeAll: { fontSize: 13, color: C.c700, fontWeight: '700' },
  tableEmpty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  tableEmptyText: { fontSize: 13, color: C.muted },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.steel100, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  th: { fontSize: 10, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  tdName: { fontSize: 13, fontWeight: '700', color: C.ink },
  tdSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  tdText: { fontSize: 12, color: C.ink, fontWeight: '600' },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  // Quick actions
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
});
