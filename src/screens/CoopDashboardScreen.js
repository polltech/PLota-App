import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const StatCard = ({ icon, label, value, color, sub, onPress }) => (
  <TouchableOpacity style={s.statCard} onPress={onPress} activeOpacity={onPress ? 0.75 : 1} disabled={!onPress}>
    <View style={[s.statIcon, { backgroundColor: (color || C.c600) + '18' }]}>
      <Ionicons name={icon} size={22} color={color || C.c600} />
    </View>
    <Text style={s.statVal}>{value ?? '—'}</Text>
    <Text style={s.statLabel}>{label}</Text>
    {sub != null && <Text style={s.statSub}>{sub}</Text>}
  </TouchableOpacity>
);

export default function CoopDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [stats, setStats] = useState(null);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.first_name || 'Officer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [batches, setBatches] = useState([]);
  const [consignments, setConsignments] = useState([]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, delivRes, batchRes, consRes] = await Promise.allSettled([
        coopAPI.getStats(),
        coopAPI.getDeliveries(),
        coopAPI.getBatches(),
        coopAPI.getConsignments(),
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (delivRes.status === 'fulfilled') {
        const d = delivRes.value.data;
        setRecentDeliveries((Array.isArray(d) ? d : d?.deliveries || []).slice(0, 5));
      }
      if (batchRes.status === 'fulfilled') {
        const d = batchRes.value.data;
        setBatches(Array.isArray(d) ? d : (d?.batches || []));
      }
      if (consRes.status === 'fulfilled') {
        const d = consRes.value.data;
        setConsignments(Array.isArray(d) ? d : []);
      }
    } catch (e) {
      console.warn('CoopDashboard load error:', e.message);
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

  const pendingCount = stats?.pending_verification ?? 0;
  const inProcessing = recentDeliveries.filter(d => d.status === 'in_processing').length;
  const readyForBatching = recentDeliveries.filter(d => d.status === 'ready_for_batching').length;
  const draftBatches = batches.filter(b => (b.status || 'draft') === 'draft').length;
  const releasedBatches = batches.filter(b => b.status === 'released').length;
  const pendingConsignments = consignments.filter(c => c.consignment_status === 'pending_dds').length;

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
            <View style={s.logoCircle}>
              <Image source={require('../../assets/logo.jpeg')} style={s.logo} />
            </View>
          </View>

          {pendingCount > 0 && (
            <TouchableOpacity
              style={s.alertBanner}
              onPress={() => navigation.navigate('Farmers', { screen: 'CoopFarmersList', params: { tab: 'pending' } })}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#fbbf24" />
              <Text style={s.alertText}>
                {pendingCount} farmer{pendingCount > 1 ? 's' : ''} awaiting verification — tap to review
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#fbbf24" />
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
        {/* Stats grid */}
        <Text style={s.sectionTitle}>Cooperative Overview</Text>
        <View style={s.statsGrid}>
          <StatCard icon="people-outline" label="Members" value={stats?.total_members ?? stats?.member_count} color="#6366f1" onPress={() => navigation.navigate('CoopFarmers')} />
          <StatCard icon="leaf-outline" label="Verified Farms" value={stats?.verified_farms} color={C.eudrLow} />
          <StatCard icon="time-outline" label="Pending KYC" value={pendingCount} color={pendingCount > 0 ? C.eudrMedium : C.subtle} onPress={pendingCount > 0 ? () => navigation.navigate('CoopFarmers') : undefined} />
          <StatCard icon="cube-outline" label="Deliveries" value={stats?.total_deliveries} color="#0ea5e9" onPress={() => navigation.navigate('CoopDeliveries')} />
          <StatCard icon="scale-outline" label="Total kg" value={stats?.total_weight_kg != null ? `${Number(stats.total_weight_kg).toLocaleString()}` : '—'} color={C.c600} />
          <StatCard icon="layers-outline" label="Batches" value={batches.length} color="#8b5cf6" onPress={() => navigation.navigate('CoopBatches')} />
        </View>

        {/* Processing pipeline */}
        <Text style={s.sectionTitle}>Processing Pipeline</Text>
        <View style={s.pipelineRow}>
          {[
            { label: 'In Processing', value: inProcessing, color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Ready to Batch', value: readyForBatching, color: '#15803d', bg: '#dcfce7' },
            { label: 'Draft Batches', value: draftBatches, color: '#b45309', bg: '#fef3c7' },
            { label: 'Released', value: releasedBatches, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Consignments', value: pendingConsignments, color: '#0891b2', bg: '#e0f2fe' },
          ].map(p => (
            <View key={p.label} style={[s.pipelineCard, { backgroundColor: p.bg, borderColor: p.color + '40' }]}>
              <Text style={[s.pipelineVal, { color: p.color }]}>{p.value}</Text>
              <Text style={[s.pipelineLabel, { color: p.color }]}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsRow}>
          {[
            { icon: 'add-circle-outline', label: 'Record\nDelivery', color: C.c700, nav: () => navigation.navigate('CoopDeliveries', { screen: 'CreateDelivery' }) },
            { icon: 'people-outline', label: 'Farmers', color: '#6366f1', nav: () => navigation.navigate('CoopFarmers') },
            { icon: 'layers-outline', label: 'Batches', color: '#8b5cf6', nav: () => navigation.navigate('CoopBatches') },
            { icon: 'airplane-outline', label: 'Consignments', color: '#0891b2', nav: () => navigation.navigate('CoopConsignments') },
          ].map(({ icon, label, color, nav }) => (
            <TouchableOpacity key={label} style={s.actionBtn} onPress={nav} activeOpacity={0.75}>
              <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={24} color={color} />
              </View>
              <Text style={s.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent deliveries */}
        {recentDeliveries.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recent Deliveries</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Deliveries')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentDeliveries.map((d) => (
              <View key={d.id} style={s.delivCard}>
                <View style={s.delivLeft}>
                  <Ionicons name="cube-outline" size={18} color={C.c600} />
                </View>
                <View style={s.delivContent}>
                  <Text style={s.delivNo} numberOfLines={1}>
                    {d.delivery_number || d.batch_number || `#${d.id}`}
                  </Text>
                  <Text style={s.delivMeta}>
                    {d.net_weight_kg != null ? `${Number(d.net_weight_kg).toFixed(1)} kg` : '—'}
                    {d.quality_grade ? ` · ${d.quality_grade}` : ''}
                  </Text>
                </View>
                <View style={[s.delivStatus, {
                  backgroundColor: d.status === 'received' ? C.eudrLowBg : C.pendingBg
                }]}>
                  <Text style={[s.delivStatusText, {
                    color: d.status === 'received' ? C.eudrLow : C.pendingText
                  }]}>
                    {(d.status || 'pending').toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 16, marginBottom: 16 },
  greet: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  name: { fontSize: 22, fontWeight: '800', color: C.white },
  roleTag: { fontSize: 11, fontWeight: '700', color: C.c400, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  logoCircle: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logo: { width: '100%', height: '100%' },

  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  alertText: { flex: 1, fontSize: 12, color: '#fbbf24', fontWeight: '700' },

  scroll: { flex: 1 },
  content: { padding: 20 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  seeAll: { fontSize: 13, color: C.c600, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '31%', backgroundColor: C.white, borderRadius: 16, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  statSub: { fontSize: 10, color: C.subtle, marginTop: 2 },

  pipelineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  pipelineCard: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', minWidth: '18%', borderWidth: 1 },
  pipelineVal: { fontSize: 18, fontWeight: '900' },
  pipelineLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 12 },

  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.steel700, textAlign: 'center', lineHeight: 14 },

  delivCard: { backgroundColor: C.white, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  delivLeft: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  delivContent: { flex: 1 },
  delivNo: { fontSize: 14, fontWeight: '700', color: C.ink },
  delivMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  delivStatus: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  delivStatusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
});
