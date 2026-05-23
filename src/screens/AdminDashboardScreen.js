import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—';

const StatCard = ({ icon, label, value, sub, color }) => (
  <View style={[s.statCard, { borderTopColor: color || C.c700 }]}>
    <View style={[s.statIcon, { backgroundColor: (color || C.c700) + '18' }]}>
      <Ionicons name={icon} size={20} color={color || C.c700} />
    </View>
    <Text style={s.statVal}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {sub != null && <Text style={s.statSub}>{sub}</Text>}
  </View>
);

const QuickAction = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={s.qaBtn} onPress={onPress} activeOpacity={0.8}>
    <View style={[s.qaIcon, { backgroundColor: (color || C.c700) + '18' }]}>
      <Ionicons name={icon} size={22} color={color || C.c700} />
    </View>
    <Text style={s.qaLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function AdminDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
    } catch (e) {
      console.warn('Admin stats:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.first_name || 'Admin';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <View>
              <Text style={s.heroGreet}>{greeting}, {firstName}</Text>
              <Text style={s.heroSub}>Platform Administration</Text>
            </View>
            <View style={[s.adminBadge]}>
              <Ionicons name="shield-checkmark" size={16} color={C.white} />
              <Text style={s.adminBadgeText}>ADMIN</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >
        {loading ? (
          <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
        ) : (
          <>
            {/* Alert banner for pending items */}
            {(stats?.pending_farmer_verifications > 0 || stats?.pending_dds > 0) && (
              <View style={s.alertBanner}>
                <Ionicons name="warning-outline" size={18} color="#92400e" />
                <Text style={s.alertText}>
                  {[
                    stats.pending_farmer_verifications > 0 && `${stats.pending_farmer_verifications} farmer(s) pending verification`,
                    stats.pending_dds > 0 && `${stats.pending_dds} DDS pending review`,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
            )}

            {/* Stats grid */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Platform Overview</Text>
              <View style={s.statsGrid}>
                <StatCard
                  icon="people"
                  label="Total Users"
                  value={stats?.total_users}
                  sub={`${stats?.active_users ?? 0} active`}
                  color={C.c700}
                />
                <StatCard
                  icon="leaf"
                  label="Farms"
                  value={stats?.total_farms}
                  sub={`${stats?.verified_farms ?? 0} verified`}
                  color={C.eudrLow}
                />
                <StatCard
                  icon="business"
                  label="Cooperatives"
                  value={stats?.total_cooperatives}
                  color="#6366f1"
                />
                <StatCard
                  icon="cube"
                  label="Deliveries"
                  value={stats?.total_deliveries}
                  sub={`${stats?.total_kg != null ? Number(stats.total_kg).toFixed(0) : 0} kg`}
                  color="#0284c7"
                />
                <StatCard
                  icon="shield-checkmark"
                  label="EUDR Compliant"
                  value={stats?.compliant_farms != null ? `${stats.compliant_farms}` : '—'}
                  sub={stats?.compliance_rate != null ? `${(stats.compliance_rate * 100).toFixed(0)}% rate` : null}
                  color={C.eudrLow}
                />
                <StatCard
                  icon="alert-circle"
                  label="High Risk"
                  value={stats?.high_risk_farms}
                  color={C.eudrHigh}
                />
              </View>
            </View>

            {/* Quick actions */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Management</Text>
              <View style={s.qaGrid}>
                <QuickAction
                  icon="people-outline"
                  label="Users"
                  color={C.c700}
                  onPress={() => navigation.navigate('AdminUsers')}
                />
                <QuickAction
                  icon="person-add-outline"
                  label="Verify Farmers"
                  color={C.eudrMedium}
                  onPress={() => navigation.navigate('AdminFarmers')}
                />
                <QuickAction
                  icon="document-text-outline"
                  label="Compliance"
                  color={C.eudrLow}
                  onPress={() => navigation.navigate('AdminCompliance')}
                />
                <QuickAction
                  icon="business-outline"
                  label="Cooperatives"
                  color="#6366f1"
                  onPress={() => navigation.navigate('AdminCoops')}
                />
                <QuickAction
                  icon="hardware-chip-outline"
                  label="ML Engine"
                  color="#0284c7"
                  onPress={() => navigation.navigate('AdminML')}
                />
                <QuickAction
                  icon="leaf-outline"
                  label="All Farms"
                  color={C.eudrLow}
                  onPress={() => navigation.navigate('AdminFarms')}
                />
              </View>
            </View>

            {/* Recent users */}
            {stats?.recent_users?.length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Recent Users</Text>
                <View style={s.card}>
                  {stats.recent_users.map((u, i) => (
                    <View key={u.id} style={[s.userRow, i < stats.recent_users.length - 1 && s.borderBottom]}>
                      <View style={s.userAvatar}>
                        <Text style={s.userAvatarText}>
                          {(u.first_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.userName}>
                          {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email}
                        </Text>
                        <Text style={s.userMeta}>{u.role} · {fmtDate(u.created_at)}</Text>
                      </View>
                      <View style={[s.statusDot, { backgroundColor: u.is_active ? C.eudrLow : C.eudrHigh }]} />
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 32 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 24 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  heroGreet: { fontSize: 20, fontWeight: '800', color: C.white },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  adminBadgeText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 0.5 },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: C.eudrMedium, margin: 16, borderRadius: 12, padding: 14 },
  alertText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#92400e' },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '31%', backgroundColor: C.white, borderRadius: 16, padding: 14, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statVal: { fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '700', color: C.muted },
  statSub: { fontSize: 10, color: C.subtle, marginTop: 2 },

  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaBtn: { width: '31%', backgroundColor: C.white, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  qaIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  qaLabel: { fontSize: 11, fontWeight: '700', color: C.ink, textAlign: 'center' },

  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  userRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  userAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 15, fontWeight: '800', color: C.white },
  userName: { fontSize: 14, fontWeight: '700', color: C.ink },
  userMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
});
