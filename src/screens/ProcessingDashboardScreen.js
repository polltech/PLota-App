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
import { ROLES } from '../utils/roles';

const ROLE_STEPS = {
  [ROLES.DELIVERY_AGENT]:  ['sorting'],
  [ROLES.WASHING_STATION]: ['washing'],
  [ROLES.POST_HARVEST]:    ['drying', 'milling', 'grading', 'packing'],
};

const ROLE_LABEL = {
  [ROLES.DELIVERY_AGENT]:  'Delivery Agent',
  [ROLES.WASHING_STATION]: 'Washing Station Officer',
  [ROLES.POST_HARVEST]:    'Post-Harvest Officer',
};

// Tab names used in AppNavigator for each role's deliveries tab
const DELIVERIES_TAB = {
  [ROLES.DELIVERY_AGENT]:  'AgentDeliveries',
  [ROLES.WASHING_STATION]: 'WSDeliveries',
  [ROLES.POST_HARVEST]:    'PHDeliveries',
};

const CLOSED = new Set(['batched', 'rejected', 'ready_for_batching', 'processed']);

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';
const todayStr = () => new Date().toISOString().slice(0, 10);

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'in_processing') return { color: '#6d28d9', bg: '#ede9fe' };
  if (u === 'received')      return { color: '#0369a1', bg: '#e0f2fe' };
  return { color: '#b45309', bg: '#fef3c7' };
};

export default function ProcessingDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role;
  const mySteps = ROLE_STEPS[role] || [];
  const deliveriesTab = DELIVERIES_TAB[role] || 'AgentDeliveries';

  const firstName = user?.first_name || 'Officer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getDeliveries();
      const d = res.data;
      setDeliveries(Array.isArray(d) ? d : (d?.deliveries || []));
    } catch (e) {
      console.warn('ProcessingDashboard load:', e.message);
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

  const today = todayStr();

  // Deliveries where the user still has at least one step left to record
  const pending = deliveries.filter(d => {
    if (CLOSED.has((d.status || '').toLowerCase())) return false;
    const done = new Set((d.processing_log || []).map(l => l.step_type));
    return mySteps.some(step => !done.has(step));
  });

  // Deliveries where the user recorded their step today
  const doneToday = deliveries.filter(d =>
    mySteps.some(step =>
      (d.processing_log || []).some(
        l => l.step_type === step && (l.step_date || l.created_at || '').slice(0, 10) === today
      )
    )
  );

  // Deliveries where ALL of the user's steps are recorded (all time)
  const totalDone = deliveries.filter(d => {
    const done = new Set((d.processing_log || []).map(l => l.step_type));
    return mySteps.length > 0 && mySteps.every(step => done.has(step));
  });

  const recentPending = pending.slice(0, 5);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.greet}>{greeting},</Text>
              <Text style={s.name}>{firstName}</Text>
              <Text style={s.roleTag}>{ROLE_LABEL[role] || cap(role)}</Text>
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
        {/* ── Stats row ─────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { borderLeftColor: '#b45309' }]}>
            <Ionicons name="hourglass-outline" size={22} color="#b45309" />
            <Text style={[s.statVal, { color: '#b45309' }]}>{pending.length}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: '#15803d' }]}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#15803d" />
            <Text style={[s.statVal, { color: '#15803d' }]}>{doneToday.length}</Text>
            <Text style={s.statLabel}>Done Today</Text>
          </View>
          <View style={[s.statCard, { borderLeftColor: C.c700 }]}>
            <Ionicons name="cube-outline" size={22} color={C.c700} />
            <Text style={[s.statVal, { color: C.c700 }]}>{totalDone.length}</Text>
            <Text style={s.statLabel}>Total Done</Text>
          </View>
        </View>

        {/* ── My steps ──────────────────────────────────────────────── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>My Steps</Text>
          <View style={s.stepsRow}>
            {mySteps.map(step => (
              <View key={step} style={s.stepPill}>
                <Ionicons name="checkmark-circle" size={14} color={C.c700} />
                <Text style={s.stepPillText}>{cap(step)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Pending deliveries preview ─────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Needs Your Action</Text>
            {pending.length > 5 && (
              <TouchableOpacity onPress={() => navigation.navigate(deliveriesTab)}>
                <Text style={s.seeAll}>See all {pending.length} →</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentPending.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle" size={36} color="#15803d" />
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptyMsg}>No deliveries need your attention right now.</Text>
            </View>
          ) : (
            <View style={s.deliveryList}>
              {recentPending.map((item, i) => {
                const ss = statusStyle(item.status);
                const done = new Set((item.processing_log || []).map(l => l.step_type));
                const nextStep = mySteps.find(step => !done.has(step));
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    style={[s.delivRow, i < recentPending.length - 1 && s.delivRowBorder]}
                    activeOpacity={0.8}
                    onPress={() => navigation.navigate(deliveriesTab, {
                      screen: 'DeliveryDetail',
                      params: { deliveryId: item.id, delivery: item },
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={s.delivTop}>
                        <Text style={s.delivNo} numberOfLines={1}>
                          {item.delivery_number || `D-${item.id}`}
                        </Text>
                        <View style={[s.badge, { backgroundColor: ss.bg }]}>
                          <Text style={[s.badgeText, { color: ss.color }]}>
                            {cap(item.status || 'received')}
                          </Text>
                        </View>
                      </View>
                      {!!item.farmer_name && (
                        <Text style={s.delivMeta} numberOfLines={1}>{item.farmer_name}</Text>
                      )}
                      <View style={s.delivFooter}>
                        <View style={s.delivChip}>
                          <Ionicons name="scale-outline" size={11} color={C.muted} />
                          <Text style={s.delivChipText}>{fmtKg(item.net_weight_kg)}</Text>
                        </View>
                        {nextStep && (
                          <View style={[s.delivChip, { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }]}>
                            <Ionicons name="arrow-forward-circle-outline" size={11} color="#b45309" />
                            <Text style={[s.delivChipText, { color: '#b45309' }]}>
                              Record {cap(nextStep)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── View all button ────────────────────────────────────────── */}
        <TouchableOpacity
          style={s.viewAllBtn}
          onPress={() => navigation.navigate(deliveriesTab)}
          activeOpacity={0.85}
        >
          <Ionicons name="cube-outline" size={18} color={C.white} />
          <Text style={s.viewAllBtnText}>View All Deliveries</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { flex: 1 },
  content:   { padding: 16, gap: 14 },

  hero:    { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 20 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 14 },
  greet:   { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  name:    { fontSize: 24, fontWeight: '900', color: C.white, marginTop: 2 },
  roleTag: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 14,
    alignItems: 'center', gap: 6, borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statVal:   { fontSize: 26, fontWeight: '900', lineHeight: 30 },
  statLabel: { fontSize: 10, fontWeight: '700', color: C.muted, textAlign: 'center' },

  section:       { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: C.ink },
  seeAll:        { fontSize: 13, fontWeight: '700', color: C.c700 },

  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.c050, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  stepPillText: { fontSize: 12, fontWeight: '700', color: C.c700 },

  deliveryList: {
    backgroundColor: C.white, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  delivRow:       { flexDirection: 'row', alignItems: 'center', padding: 14 },
  delivRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  delivTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  delivNo:        { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  delivMeta:      { fontSize: 12, color: C.muted, marginBottom: 6 },
  delivFooter:    { flexDirection: 'row', gap: 8, alignItems: 'center' },
  delivChip:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  delivChipText:  { fontSize: 11, color: C.muted, fontWeight: '600' },
  badge:          { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText:      { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  emptyCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 32,
    alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  emptyMsg:   { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18 },

  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.c700, borderRadius: 14, padding: 16,
  },
  viewAllBtnText: { flex: 1, color: C.white, fontSize: 15, fontWeight: '800' },
});
