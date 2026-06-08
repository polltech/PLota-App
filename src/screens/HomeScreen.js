import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { farmerAPI } from '../services/api';
import { dbService } from '../services/database';
import { C } from '../theme';

// ── Profile dropdown ──────────────────────────────────────────────────────────
const ProfileMenu = ({ user, navigation, onClose, onSignOut }) => (
  <Modal transparent animationType="fade" visible onRequestClose={onClose}>
    <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose}>
      <View style={pm.menu}>
        <View style={pm.header}>
          <View style={pm.avatar}>
            <Text style={pm.avatarText}>
              {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pm.fullName} numberOfLines={1}>
              {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Farmer'}
            </Text>
            <Text style={pm.email} numberOfLines={1}>{user?.email || ''}</Text>
          </View>
        </View>
        <View style={pm.divider} />
        <TouchableOpacity style={pm.item} activeOpacity={0.8}
          onPress={() => { onClose(); navigation.navigate('Dashboard', { screen: 'Profile' }); }}>
          <Ionicons name="person-outline" size={18} color={C.steel700} />
          <Text style={pm.itemText}>My Profile</Text>
        </TouchableOpacity>
        <View style={pm.divider} />
        <TouchableOpacity style={pm.item} activeOpacity={0.8}
          onPress={() => { onClose(); onSignOut(); }}>
          <Ionicons name="log-out-outline" size={18} color="#dc2626" />
          <Text style={[pm.itemText, { color: '#dc2626' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  </Modal>
);

const pm = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu:       { position: 'absolute', top: 88, right: 18, width: 230, backgroundColor: C.white, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12, overflow: 'hidden' },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900', color: C.white },
  fullName:   { fontSize: 13, fontWeight: '800', color: C.ink },
  email:      { fontSize: 11, color: C.muted, marginTop: 1 },
  divider:    { height: 1, backgroundColor: C.steel100 },
  item:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  itemText:   { fontSize: 14, fontWeight: '600', color: C.ink },
});

// ── Chart helpers ─────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const groupDeliveriesByMonth = (deliveries) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), kg: 0, count: 0 };
  });
  (deliveries || []).forEach((d) => {
    const date = new Date(d.delivered_at || d.created_at);
    if (isNaN(date)) return;
    const slot = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (slot) { slot.kg += d.weight_kg || d.net_weight_kg || 0; slot.count++; }
  });
  return months;
};

const BarChart = ({ data, valueKey, labelKey, color, unit, emptyMsg }) => {
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  const hasData = data.some(d => (d[valueKey] || 0) > 0);
  if (!hasData) return (
    <View style={ch.empty}>
      <Ionicons name="bar-chart-outline" size={32} color={C.steel300} />
      <Text style={ch.emptyText}>{emptyMsg || 'No data yet'}</Text>
    </View>
  );
  return (
    <View style={ch.barChart}>
      {data.map((item, i) => {
        const pct = max > 0 ? (item[valueKey] || 0) / max : 0;
        return (
          <View key={i} style={ch.barCol}>
            <Text style={ch.barVal} numberOfLines={1}>
              {item[valueKey] > 0 ? (item[valueKey] >= 1000 ? `${(item[valueKey]/1000).toFixed(1)}k` : String(Math.round(item[valueKey]))) : ''}
            </Text>
            <View style={ch.barTrack}>
              <View style={[ch.barFill, { height: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%`, backgroundColor: color }]} />
            </View>
            <Text style={ch.barLabel}>{item[labelKey]}</Text>
          </View>
        );
      })}
    </View>
  );
};

const HorizBar = ({ label, value, max, color, bg }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={ch.horizRow}>
      <Text style={ch.horizLabel}>{label}</Text>
      <View style={ch.horizTrack}>
        <View style={[ch.horizFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
      <Text style={ch.horizVal}>{value}</Text>
    </View>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const eudrColor = (s) => {
  if (!s) return C.subtle;
  const u = s.toUpperCase();
  if (u.includes('LOW') || u.includes('COMPLIANT')) return C.eudrLow;
  if (u.includes('MEDIUM') || u.includes('PENDING')) return C.eudrMedium;
  return C.eudrHigh;
};

const verifyInfo = (user) => {
  const uCoopStatus  = user?.coop_status || '';
  const uAdminStatus = user?.verification_status || user?.status || 'pending';
  const coopApproved  = uCoopStatus === 'coop_approved' || uAdminStatus === 'verified';
  const adminApproved = uAdminStatus === 'verified';
  const coopRejected  = uCoopStatus === 'coop_rejected';
  const adminRejected = uAdminStatus === 'rejected' && !coopRejected;

  if (adminApproved && coopApproved) {
    const by = [user?.coop_verified_by_name, user?.admin_verified_by_name].filter(Boolean).join(' & ') || 'Cooperative & Plotra';
    return { label: 'Fully Approved', sub: `By ${by}`, color: '#15803d', bg: '#f0fdf4', icon: 'checkmark-circle' };
  }
  if (coopRejected) {
    const reason = user?.coop_notes ? `Reason: ${user.coop_notes}` : (user?.coop_verified_by_name || 'By Cooperative');
    return { label: 'Rejected by Cooperative', sub: reason, color: '#dc2626', bg: '#fef2f2', icon: 'close-circle' };
  }
  if (adminRejected) {
    const reason = user?.admin_notes ? `Reason: ${user.admin_notes}` : (user?.admin_verified_by_name || 'By Plotra');
    return { label: 'Rejected by Plotra', sub: reason, color: '#dc2626', bg: '#fef2f2', icon: 'close-circle' };
  }
  if (coopApproved && !adminApproved) {
    const by = user?.coop_verified_by_name || 'Cooperative';
    return { label: 'Cooperative Approved', sub: `By ${by} — Pending Plotra Review`, color: '#0891b2', bg: '#ecfeff', icon: 'checkmark-circle-outline' };
  }
  return { label: 'Pending Verification', sub: 'Awaiting Cooperative approval', color: '#f59e0b', bg: '#fffbeb', icon: 'time-outline' };
};

const statusBadge = (vs, cs) => {
  const s = (vs || '').toLowerCase();
  const c = (cs || '').toLowerCase();
  if (s === 'verified' || s === 'admin_approved') return { label: 'Approved', byWho: 'by Plotra',              color: '#15803d', bg: '#dcfce7' };
  if (s === 'rejected' && c === 'coop_rejected')  return { label: 'Rejected', byWho: 'by Cooperative',         color: '#dc2626', bg: '#fee2e2' };
  if (s === 'rejected')                           return { label: 'Rejected', byWho: 'by Plotra',              color: '#dc2626', bg: '#fee2e2' };
  if (c === 'coop_approved')                      return { label: 'Coop ✓',   byWho: 'Pending Plotra Review',  color: '#1d4ed8', bg: '#dbeafe' };
  if (c === 'coop_rejected')                      return { label: 'Coop ✗',   byWho: 'Rejected by Cooperative',color: '#dc2626', bg: '#fee2e2' };
  if (s === 'pending')                            return { label: 'Pending',  byWho: 'Awaiting Cooperative',   color: '#b45309', bg: '#fef3c7' };
  return { label: 'Draft', byWho: 'Not submitted', color: C.steel600, bg: C.steel100 };
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
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [profileOpen, setProfileOpen] = useState(false);

  const [stats,       setStats]       = useState(null);
  const [farms,       setFarms]       = useState([]);
  const [deliveries,  setDeliveries]  = useState([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Agent';

  const getTimeData = () => {
    const now = new Date();
    const h = now.getHours();
    let greeting;
    if      (h <  5) greeting = 'Good night';
    else if (h <  8) greeting = 'Good dawn';
    else if (h < 12) greeting = 'Good morning';
    else if (h < 13) greeting = 'Good noon';
    else if (h < 17) greeting = 'Good afternoon';
    else if (h < 20) greeting = 'Good evening';
    else             greeting = 'Good night';
    return {
      greeting,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };
  const [timeData, setTimeData] = useState(getTimeData);
  useEffect(() => {
    const tick = () => setTimeData(getTimeData());
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  const { greeting, time } = timeData;

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    // Safety net: always clear loading after 12s even if a promise stalls
    const safetyTimer = setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 12000);
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
        const pendingCount = await Promise.race([
          dbService.getPendingCount(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('db timeout')), 3000)),
        ]);
        setPendingSync(pendingCount?.count || 0);
      } catch (_) {}
    } finally {
      clearTimeout(safetyTimer);
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

  const vi = verifyInfo(user);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
        <Text style={s.loadingText}>Loading your dashboard...</Text>
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
              <Text style={s.heroTime}>{time}</Text>
            </View>
            <View style={s.heroActions}>
              {/* Notification bell */}
              <TouchableOpacity
                style={s.bellBtn}
                onPress={() => navigation.navigate('Notifications')}
                activeOpacity={0.85}
              >
                <Ionicons name="notifications-outline" size={22} color={C.white} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>
                      {Math.min(notifications.filter(n => !n.is_read).length, 9)}
                      {notifications.filter(n => !n.is_read).length > 9 ? '+' : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Profile avatar */}
              <TouchableOpacity style={s.avatarBtn} onPress={() => setProfileOpen(true)} activeOpacity={0.85}>
                <Text style={s.avatarBtnText}>
                  {(user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {profileOpen && (
            <ProfileMenu
              user={user}
              navigation={navigation}
              onClose={() => setProfileOpen(false)}
              onSignOut={logout}
            />
          )}
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
            <Text style={s.verifyLabel}>Your Verification Status</Text>
            <Text style={[s.verifyValue, { color: vi.color }]}>{vi.label}</Text>
            {!!vi.sub && <Text style={s.verifySub}>{vi.sub}</Text>}
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
            icon="wallet-outline"
            label="Wallet Balance"
            value={stats?.mbt_balance != null ? `KES ${Number(stats.mbt_balance).toLocaleString()}` : 'KES 0'}
            sub={stats?.returns_trend || 'View wallet'}
            color="#10b981"
            onPress={() => navigation.navigate('Wallet')}
          />
          <StatCard
            icon="shield-checkmark-outline"
            label="Compliance"
            value={stats?.compliance_score != null ? `${stats.compliance_score}%` : 'N/A'}
            sub="EUDR Readiness Score"
            color="#f59e0b"
            onPress={() => navigation.navigate('Compliance')}
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

        {/* ── Delivery Trend Chart ────────────────────────────────────── */}
        <SectionHeader title="Delivery Trend (6 months)" />
        <View style={s.chartCard}>
          <BarChart
            data={groupDeliveriesByMonth(deliveries)}
            valueKey="kg"
            labelKey="label"
            color="#0ea5e9"
            unit="kg"
            emptyMsg="No deliveries recorded yet"
          />
          <Text style={s.chartNote}>Delivery weight (kg) per month</Text>
        </View>

        {/* ── Wallet & Payments ───────────────────────────────────────── */}
        <SectionHeader title="Wallet & Payments" onSeeAll={() => navigation.navigate('Wallet')} />
        <View style={s.walletCard}>
          <View style={s.walletRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.walletRowLabel}>Staked MBT</Text>
              <Text style={s.walletRowValue}>KES {stats?.staked_mbt != null ? Number(stats.staked_mbt).toLocaleString() : '0'}</Text>
            </View>
            {!!stats?.staked_trend && (
              <View style={[s.trendBadge, { backgroundColor: '#dcfce7' }]}>
                <Text style={[s.trendBadgeText, { color: '#15803d' }]}>{stats.staked_trend}</Text>
              </View>
            )}
          </View>
          <View style={s.walletDivider} />
          <View style={s.walletRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.walletRowLabel}>Annual Interest</Text>
              <Text style={s.walletRowValue}>KES {stats?.annual_interest != null ? Number(stats.annual_interest).toLocaleString() : '0'}</Text>
            </View>
            {!!stats?.interest_trend && (
              <View style={[s.trendBadge, { backgroundColor: '#dbeafe' }]}>
                <Text style={[s.trendBadgeText, { color: '#1d4ed8' }]}>{stats.interest_trend}</Text>
              </View>
            )}
          </View>
          <View style={s.walletActions}>
            <TouchableOpacity
              style={s.walletBtn}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-outline" size={16} color={C.white} />
              <Text style={s.walletBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Farms Status Chart ───────────────────────────────────────── */}
        {farms.length > 0 && (
          <>
            <SectionHeader title="Farms by Status" />
            <View style={s.chartCard}>
              <HorizBar label="Approved"  value={farmApproved} max={farms.length} color="#15803d" />
              <HorizBar label="Pending"   value={farmPending}  max={farms.length} color="#f59e0b" />
              <HorizBar label="Draft"     value={farmDraft}    max={farms.length} color={C.steel400} />
              {(() => {
                const compliant = farms.filter(f => {
                  const r = (f.eudr_risk_level || '').toLowerCase();
                  return r.includes('low') || r.includes('compliant');
                }).length;
                const nonCompliant = farms.filter(f => {
                  const r = (f.eudr_risk_level || '').toLowerCase();
                  return r.includes('high') || r.includes('risk');
                }).length;
                return (
                  <>
                    <View style={s.chartDivider} />
                    <HorizBar label="EUDR Compliant"     value={compliant}    max={farms.length} color={C.eudrLow} />
                    <HorizBar label="EUDR Non-Compliant" value={nonCompliant} max={farms.length} color={C.eudrHigh} />
                  </>
                );
              })()}
              <Text style={s.chartNote}>Total: {farms.length} farm{farms.length !== 1 ? 's' : ''}</Text>
            </View>
          </>
        )}

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
                const sb = statusBadge(farm.verification_status, farm.coop_status);
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
                    <View style={{ flex: 1.3, alignItems: 'flex-end' }}>
                      <View style={[s.statusBadge, { backgroundColor: sb.bg }]}>
                        <Text style={[s.statusBadgeText, { color: sb.color }]}>{sb.label}</Text>
                      </View>
                      {!!sb.byWho && <Text style={s.tdByWho} numberOfLines={1}>{sb.byWho}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={s.tableFooter} onPress={() => navigation.navigate('Farms')} activeOpacity={0.8}>
                <Text style={s.tableFooterText}>Manage all farms</Text>
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
                <Text style={[s.thText, { flex: 0.8, textAlign: 'center' }]}>Grade</Text>
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
                      <Text style={s.tdFarmName} numberOfLines={1}>{(() => { const r = d.batch_reference || d.reference || d.delivery_number || ''; return r.startsWith('PCFDELIVERY/') ? r.replace('PCFDELIVERY/', '') : (r || `D-${i + 1}`); })()}</Text>
                      <View style={[s.statusBadge, { backgroundColor: ds.bg, alignSelf: 'flex-start', marginTop: 2 }]}>
                        <Text style={[s.statusBadgeText, { color: ds.color }]}>{ds.label}</Text>
                      </View>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'center' }]}>
                      {d.weight_kg != null ? `${fmt(d.weight_kg)} kg` : d.net_weight_kg != null ? `${fmt(d.net_weight_kg)} kg` : '—'}
                    </Text>
                    <View style={{ flex: 0.8, alignItems: 'center' }}>
                      <View style={[s.statusBadge, { backgroundColor: '#dbeafe' }]}>
                        <Text style={[s.statusBadgeText, { color: '#1d4ed8' }]}>{d.quality_grade || 'PB'}</Text>
                      </View>
                    </View>
                    <Text style={[s.tdText, { flex: 1, textAlign: 'right' }]}>
                      {fmtDate(d.delivered_at || d.created_at)}
                    </Text>
                  </View>
                );
              })}
              <TouchableOpacity style={s.tableFooter} onPress={() => navigation.navigate('Deliveries')} activeOpacity={0.8}>
                <Text style={s.tableFooterText}>View all deliveries</Text>
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
  loadingText: { marginTop: 14, fontSize: 13, color: C.muted, fontWeight: '600' },

  // Hero
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 0 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginBottom: 16 },
  greet: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: C.white },
  heroTime: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginTop: 2 },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#dc2626', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: C.c800 },
  bellBadgeText: { color: C.white, fontSize: 9, fontWeight: '900' },
  avatarBtn:     { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarBtnText: { fontSize: 18, fontWeight: '900', color: C.white },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  syncBannerText: { fontSize: 12, color: '#fbbf24', fontWeight: '700', flex: 1 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 20 },

  // Verification status
  verifyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, padding: 16, marginBottom: 20, borderWidth: 1.5 },
  verifyLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  verifyValue: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  verifySub: { fontSize: 11, color: C.muted, marginTop: 3, fontWeight: '500' },
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

  // Table card (farms + deliveries)
  tableCard: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.steel100, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  thText: { fontSize: 10, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  tdFarmName: { fontSize: 14, fontWeight: '700', color: C.ink },
  tdMeta: { fontSize: 11, color: C.muted, marginTop: 1 },
  tdByWho: { fontSize: 10, color: C.muted, marginTop: 2, textAlign: 'right' },
  tdText: { fontSize: 13, color: C.ink, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  tableFooter: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.steel100 },
  tableFooterText: { fontSize: 13, color: C.c700, fontWeight: '700' },

  // Wallet & Payments
  walletCard: { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  walletRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  walletRowLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  walletRowValue: { fontSize: 22, fontWeight: '800', color: C.ink },
  walletDivider: { height: 1, backgroundColor: C.steel100, marginVertical: 14 },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  trendBadgeText: { fontSize: 11, fontWeight: '800' },
  walletActions: { marginTop: 16 },
  walletBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.c700, borderRadius: 12, paddingVertical: 13 },
  walletBtnText: { fontSize: 13, fontWeight: '700', color: C.white },

  // Chart card
  chartCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  chartNote: { fontSize: 11, color: C.subtle, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  chartDivider: { height: 1, backgroundColor: C.steel100, marginVertical: 8 },

  // Notifications
  notifCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.c600, marginTop: 5 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  notifMsg: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
});

// ── Chart styles ───────────────────────────────────────────────────────────────
const ch = StyleSheet.create({
  // Vertical bar chart
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barVal: { fontSize: 9, fontWeight: '700', color: C.muted, marginBottom: 2, height: 12 },
  barTrack: { width: '80%', flex: 1, backgroundColor: C.steel100, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { borderRadius: 6, minHeight: 2 },
  barLabel: { fontSize: 9, color: C.muted, fontWeight: '600', marginTop: 4 },
  // Horizontal bar chart
  horizRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  horizLabel: { fontSize: 12, fontWeight: '600', color: C.ink, width: 110 },
  horizTrack: { flex: 1, height: 10, backgroundColor: C.steel100, borderRadius: 6, overflow: 'hidden' },
  horizFill: { height: '100%', borderRadius: 6 },
  horizVal: { fontSize: 12, fontWeight: '800', color: C.ink, width: 28, textAlign: 'right' },
  // Empty
  empty: { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 13, color: C.subtle, fontWeight: '500' },
});
