import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────
const eudrColor = (s) => {
  if (!s) return C.subtle;
  const u = s.toUpperCase();
  if (u.includes('LOW') || u.includes('COMPLIANT')) return C.eudrLow;
  if (u.includes('MEDIUM') || u.includes('PENDING')) return C.eudrMedium;
  return C.eudrHigh;
};

const verifyInfo = (status) => {
  if (!status) return { label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' };
  const s = status.toLowerCase();
  if (s.includes('approved') || s === 'verified') return { label: 'Fully Approved', color: '#15803d', bg: '#f0fdf4', icon: 'checkmark-circle' };
  if (s.includes('rejected'))                     return { label: 'Rejected',       color: '#dc2626', bg: '#fef2f2', icon: 'close-circle' };
  if (s.includes('pending'))                      return { label: 'Pending Review', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' };
  return { label: status, color: C.muted, bg: C.steel100, icon: 'ellipse-outline' };
};

const statusBadge = (vs) => {
  if (!vs) return { label: 'Draft', color: C.steel600, bg: C.steel100 };
  const s = vs.toLowerCase();
  if (s === 'admin_approved') return { label: 'Approved', color: '#15803d', bg: '#dcfce7' };
  if (s === 'coop_approved')  return { label: 'Coop ✓',   color: '#1d4ed8', bg: '#dbeafe' };
  if (s === 'pending')        return { label: 'Pending',  color: '#b45309', bg: '#fef3c7' };
  if (s === 'rejected')       return { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' };
  return { label: 'Draft', color: C.steel600, bg: C.steel100 };
};

const deliveryStatus = (s) => {
  if (!s) return { label: 'Pending', color: '#b45309', bg: '#fef3c7' };
  const u = s.toLowerCase();
  if (u === 'verified')  return { label: 'Verified',  color: '#15803d', bg: '#dcfce7' };
  if (u === 'received')  return { label: 'Received',  color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'rejected')  return { label: 'Rejected',  color: '#dc2626', bg: '#fee2e2' };
  return { label: 'Pending', color: '#b45309', bg: '#fef3c7' };
};

const fmt = (n) => n != null ? Number(n).toLocaleString() : '—';
const fmtDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch { return ''; }
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color, onPress }) => (
  <TouchableOpacity style={s.statCard} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
    <View style={[s.statIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={s.statVal}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {!!sub && <Text style={s.statSub}>{sub}</Text>}
  </TouchableOpacity>
);

const SectionHeader = ({ title, onSeeAll }) => (
  <View style={s.sectionRow}>
    <Text style={s.sectionTitle}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={s.seeAll}>See all</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ── Main screen ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [stats,       setStats]       = useState(null);
  const [farms,       setFarms]       = useState([]);
  const [deliveries,  setDeliveries]  = useState([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Agent';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, farmsRes, deliveriesRes, notifRes] = await Promise.allSettled([
        farmerAPI.getStats(),
        farmerAPI.getFarms(),
        farmerAPI.getDeliveries(),
        farmerAPI.getNotifications(),
      ]);
      if (statsRes.status      === 'fulfilled') setStats(statsRes.value.data);
      if (farmsRes.status      === 'fulfilled') setFarms(farmsRes.value.data?.farms || farmsRes.value.data || []);
      if (deliveriesRes.status === 'fulfilled') setDeliveries(deliveriesRes.value.data?.deliveries || deliveriesRes.value.data || []);
      if (notifRes.status      === 'fulfilled') setNotifications(notifRes.value.data?.notifications || []);
      try {
        const { dbService: db } = require('../services/database');
        const r = await db.getPendingCount();
        setPendingSync(r?.count || 0);
      } catch (_) {}
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // Derived data
  const recentFarms      = farms.slice(0, 5);
  const recentDeliveries = Array.isArray(deliveries) ? deliveries.slice(0, 5) : [];
  const totalKg          = Array.isArray(deliveries)
    ? deliveries.reduce((sum, d) => sum + (d.weight_kg || d.net_weight_kg || 0), 0)
    : 0;

  const farmApproved = farms.filter(f => f.verification_status === 'admin_approved').length;
  const farmPending  = farms.filter(f => !f.verification_status || f.verification_status === 'pending').length;
  const farmDraft    = farms.filter(f => f.verification_status === 'draft').length;

  const vi = verifyInfo(user?.verification_status || user?.status);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroInner}>
            <View>
              <Text style={s.greet}>{greeting},</Text>
              <Text style={s.name}>{firstName}</Text>
            </View>
            <View style={s.logoCircle}>
              <Image source={require('../../assets/logo.jpeg')} style={s.logo} />
            </View>
          </View>
          {pendingSync > 0 && (
            <TouchableOpacity
              style={s.syncBanner}
              onPress={() => navigation.navigate('Dashboard', { screen: 'QueueList' })}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fbbf24" />
              <Text style={s.syncBannerText}>{pendingSync} capture{pendingSync > 1 ? 's' : ''} pending sync — tap to view</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Verification Status ─────────────────────────────────────── */}
        <View style={[s.verifyCard, { backgroundColor: vi.bg, borderColor: vi.color + '40' }]}>
          <Ionicons name={vi.icon} size={22} color={vi.color} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.verifyLabel}>Account Status</Text>
            <Text style={[s.verifyValue, { color: vi.color }]}>{vi.label}</Text>
          </View>
          {user?.cooperative_name && (
            <View style={s.coopBadge}>
              <Text style={s.coopBadgeText}>{user.cooperative_name}</Text>
            </View>
          )}
        </View>

        {/* ── Stats Cards (4) ─────────────────────────────────────────── */}
        <SectionHeader title="Overview" />
        <View style={s.statsGrid}>
          <StatCard
            icon="leaf-outline"
            label="My Farms"
            value={stats?.farms_count ?? farms.length}
            sub={farmApproved > 0 ? `${farmApproved} approved` : farmPending > 0 ? `${farmPending} pending` : null}
            color={C.c600}
            onPress={() => navigation.navigate('Farms')}
          />
          <StatCard
            icon="cube-outline"
            label="Deliveries"
            value={stats?.deliveries_count ?? recentDeliveries.length}
            sub={totalKg > 0 ? `${fmt(totalKg.toFixed(0))} kg` : null}
            color="#0ea5e9"
            onPress={() => navigation.navigate('Deliveries')}
          />
          <StatCard
            icon="map-outline"
            label="Parcels"
            value={stats?.parcels_count ?? '—'}
            color="#6366f1"
          />
          <StatCard
            icon="shield-checkmark-outline"
            label="EUDR"
            value={stats?.eudr_risk_level ? stats.eudr_risk_level.split(' ')[0] : '—'}
            sub={stats?.eudr_risk_level ? 'Risk Level' : null}
            color={eudrColor(stats?.eudr_risk_level)}
          />
        </View>

        {/* ── Farm Status Breakdown ───────────────────────────────────── */}
        {farms.length > 0 && (farmApproved > 0 || farmPending > 0 || farmDraft > 0) && (
          <View style={s.breakdownCard}>
            <Text style={s.breakdownTitle}>Farm Status</Text>
            <View style={s.breakdownRow}>
              {farmApproved > 0 && (
                <View style={s.breakdownItem}>
                  <View style={[s.breakdownDot, { backgroundColor: '#15803d' }]} />
                  <Text style={s.breakdownLabel}>{farmApproved} Approved</Text>
                </View>
              )}
              {farmPending > 0 && (
                <View style={s.breakdownItem}>
                  <View style={[s.breakdownDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={s.breakdownLabel}>{farmPending} Pending</Text>
                </View>
              )}
              {farmDraft > 0 && (
                <View style={s.breakdownItem}>
                  <View style={[s.breakdownDot, { backgroundColor: C.steel400 }]} />
                  <Text style={s.breakdownLabel}>{farmDraft} Draft</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Quick Actions ───────────────────────────────────────────── */}
        <SectionHeader title="Quick Actions" />
        <View style={s.actionsRow}>
          {[
            { icon: 'location-outline',     label: 'Capture\nBoundary',  color: C.c700,    onPress: () => navigation.navigate('Capture', { screen: 'CaptureLanding' }) },
            { icon: 'leaf-outline',          label: 'My\nFarms',          color: '#6366f1', onPress: () => navigation.navigate('Farms') },
            { icon: 'cube-outline',          label: 'Deliveries',         color: '#0ea5e9', onPress: () => navigation.navigate('Deliveries') },
            { icon: 'document-text-outline', label: 'Documents',          color: '#f59e0b', onPress: () => navigation.navigate('Profile') },
          ].map(({ icon, label, color, onPress }) => (
            <TouchableOpacity key={label} style={s.actionBtn} onPress={onPress} activeOpacity={0.75}>
              <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={24} color={color} />
              </View>
              <Text style={s.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── My Farms Table (web-style) ──────────────────────────────── */}
        {recentFarms.length > 0 && (
          <>
            <SectionHeader title="My Farms" onSeeAll={() => navigation.navigate('Farms')} />
            <View style={s.tableCard}>
              <View style={s.tableHeader}>
                <Text style={[s.thText, { flex: 2 }]}>Farm</Text>
                <Text style={[s.thText, { flex: 1, textAlign: 'center' }]}>Area</Text>
                <Text style={[s.thText, { flex: 1, textAlign: 'right' }]}>Status</Text>
              </View>
              {recentFarms.map((farm, i) => {
                const sb = statusBadge(farm.verification_status);
                return (
                  <TouchableOpacity
                    key={farm.id || i}
                    style={[s.tableRow, i < recentFarms.length - 1 && s.tableRowBorder]}
                    onPress={() => navigation.navigate('Farms', { screen: 'FarmDetail', params: { farm } })}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={s.tdFarmName} numberOfLines={1}>{farm.farm_name || 'Unnamed Farm'}</Text>
                      <Text style={s.tdMeta} numberOfLines={1}>{farm.county || farm.district || ''}</Text>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'center' }]}>
                      {farm.total_area_ha != null ? `${Number(farm.total_area_ha).toFixed(1)} ha` : '—'}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <View style={[s.statusBadge, { backgroundColor: sb.bg }]}>
                        <Text style={[s.statusBadgeText, { color: sb.color }]}>{sb.label}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={s.tableFooter} onPress={() => navigation.navigate('Farms')} activeOpacity={0.8}>
                <Text style={s.tableFooterText}>Manage all farms →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Recent Deliveries Table (web-style) ─────────────────────── */}
        {recentDeliveries.length > 0 && (
          <>
            <SectionHeader title="Recent Deliveries" onSeeAll={() => navigation.navigate('Deliveries')} />
            <View style={s.tableCard}>
              <View style={s.tableHeader}>
                <Text style={[s.thText, { flex: 2 }]}>Reference</Text>
                <Text style={[s.thText, { flex: 1, textAlign: 'center' }]}>Weight</Text>
                <Text style={[s.thText, { flex: 1, textAlign: 'right' }]}>Date</Text>
              </View>
              {recentDeliveries.map((d, i) => {
                const ds = deliveryStatus(d.status);
                return (
                  <View
                    key={d.id || i}
                    style={[s.tableRow, i < recentDeliveries.length - 1 && s.tableRowBorder]}
                  >
                    <View style={{ flex: 2 }}>
                      <Text style={s.tdFarmName} numberOfLines={1}>{d.batch_number || d.reference || `DEL-${i + 1}`}</Text>
                      <View style={[s.statusBadge, { backgroundColor: ds.bg, alignSelf: 'flex-start', marginTop: 2 }]}>
                        <Text style={[s.statusBadgeText, { color: ds.color }]}>{ds.label}</Text>
                      </View>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'center' }]}>
                      {d.weight_kg != null ? `${fmt(d.weight_kg)} kg` : '—'}
                    </Text>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'right' }]}>
                      {fmtDate(d.delivered_at || d.created_at)}
                    </Text>
                  </View>
                );
              })}
              <TouchableOpacity style={s.tableFooter} onPress={() => navigation.navigate('Deliveries')} activeOpacity={0.8}>
                <Text style={s.tableFooterText}>View all deliveries →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Notifications ───────────────────────────────────────────── */}
        {notifications.length > 0 && (
          <>
            <SectionHeader title="Notifications" />
            {notifications.slice(0, 3).map((n, i) => (
              <View key={n.id || i} style={s.notifCard}>
                <View style={s.notifDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle} numberOfLines={1}>{n.title || 'Notification'}</Text>
                  <Text style={s.notifMsg} numberOfLines={2}>{n.message || ''}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },

  // Hero
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 0 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginBottom: 16 },
  greet: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: C.white },
  logoCircle: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logo: { width: '100%', height: '100%' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  syncBannerText: { fontSize: 12, color: '#fbbf24', fontWeight: '700', flex: 1 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 20 },

  // Verification status
  verifyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1.5 },
  verifyLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  verifyValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  coopBadge: { backgroundColor: C.c100, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  coopBadgeText: { fontSize: 10, fontWeight: '800', color: C.c700, letterSpacing: 0.5 },

  // Section
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8 },
  seeAll: { fontSize: 13, color: C.c600, fontWeight: '700' },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: C.white, borderRadius: 18, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statVal: { fontSize: 22, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  statSub: { fontSize: 10, color: C.subtle, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Farm status breakdown
  breakdownCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  breakdownTitle: { fontSize: 11, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  breakdownRow: { flexDirection: 'row', gap: 16 },
  breakdownItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: { fontSize: 12, fontWeight: '700', color: C.ink },

  // Quick actions
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  actionBtn: { alignItems: 'center', flex: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.steel700, textAlign: 'center', lineHeight: 14 },

  // Table card (farms + deliveries)
  tableCard: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.steel100, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  thText: { fontSize: 10, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  tdFarmName: { fontSize: 14, fontWeight: '700', color: C.ink },
  tdMeta: { fontSize: 11, color: C.muted, marginTop: 1 },
  tdText: { fontSize: 13, color: C.ink, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  tableFooter: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.steel100 },
  tableFooterText: { fontSize: 13, color: C.c700, fontWeight: '700' },

  // Notifications
  notifCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.c600, marginTop: 5 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  notifMsg: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
});
