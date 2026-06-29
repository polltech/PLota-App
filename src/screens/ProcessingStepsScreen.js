import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { coopAPI } from '../services/api';
import { C } from '../theme';
import { ROLES } from '../utils/roles';

// Global ordered chain — all steps in sequence
const STEP_SEQUENCE = ['sorting', 'washing', 'drying', 'milling', 'grading', 'packing'];

// Steps each role is permitted to record — exactly their own step(s), no more
const ROLE_STEPS = {
  [ROLES.DELIVERY_AGENT]:  ['sorting'],
  [ROLES.WASHING_STATION]: ['washing'],
  [ROLES.POST_HARVEST]:    ['drying', 'milling', 'grading', 'packing'],
  [ROLES.COOP_OFFICER]:    STEP_SEQUENCE,
  [ROLES.ADMIN]:           STEP_SEQUENCE,
};

// Human-readable owner label per step
const STEP_OWNER = {
  sorting: 'Delivery Agent',
  washing: 'Washing Station',
  drying:  'Post-Harvest Officer',
  milling: 'Post-Harvest Officer',
  grading: 'Post-Harvest Officer',
  packing: 'Post-Harvest Officer',
};

const STEP_ICONS = {
  sorting: 'filter-outline', washing: 'water-outline', drying: 'sunny-outline',
  milling: 'settings-outline', grading: 'ribbon-outline', packing: 'cube-outline',
};
const STEP_COLORS = {
  sorting: '#b45309', washing: '#0891b2', drying: '#d97706',
  milling: '#7c3aed', grading: '#15803d', packing: '#1d4ed8',
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(2)} kg` : '—';

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'ready_for_batching') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'batched')            return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'in_processing')      return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'received')           return { color: '#0891b2', bg: '#e0f2fe' };
  if (u === 'rejected')           return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

export default function ProcessingStepsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { deliveryId, delivery: initial } = route.params || {};

  const [detail, setDetail]     = useState(initial || null);
  const [loading, setLoading]   = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);

  const mySteps = ROLE_STEPS[user?.role] || STEP_SEQUENCE;
  const id = deliveryId || initial?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getDelivery(id);
      setDetail(res.data);
    } catch (e) {
      const d = e.response?.data?.detail;
      const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x.msg || String(x)).join(', ') : 'Failed to load delivery';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading && !detail) {
    return <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>;
  }
  if (!detail) return null;

  const logs = detail.processing_log || [];
  const ss = statusStyle(detail.status);
  const isFinished = ['batched', 'rejected'].includes((detail.status || '').toLowerCase());

  // Map step_type → log entry
  const doneSteps = {};
  logs.forEach(lg => { doneSteps[lg.step_type] = lg; });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.heroTitle} numberOfLines={1}>
                {detail.delivery_number || `DEL-${id}`}
              </Text>
              <Text style={s.heroSub}>Processing Steps</Text>
            </View>
            <View style={[s.statusChip, { backgroundColor: ss.bg + 'cc' }]}>
              <Text style={[s.statusChipText, { color: ss.color }]}>{cap(detail.status)}</Text>
            </View>
          </View>

        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >
        {STEP_SEQUENCE.map((step, index) => {
          const done      = !!doneSteps[step];
          const log       = doneSteps[step];
          const prevStep  = index > 0 ? STEP_SEQUENCE[index - 1] : null;
          const prevDone  = !prevStep || !!doneSteps[prevStep];
          const isMyStep  = mySteps.includes(step);
          const color     = STEP_COLORS[step];
          const icon      = STEP_ICONS[step];
          // User can act: their step, not yet done, previous done, delivery not closed
          const canAct    = isMyStep && !done && prevDone && !isFinished;
          // Blocked: their step, not yet done, previous NOT done
          const waiting   = isMyStep && !done && !prevDone && !isFinished;

          return (
            <View key={step} style={[s.stepCard, done && { borderLeftColor: color, borderLeftWidth: 3 }]}>
              {/* ── Step header row ── */}
              <View style={s.stepHead}>
                <View style={[s.stepIconBox, { backgroundColor: done ? color + '20' : C.steel100 }]}>
                  <Ionicons
                    name={done ? 'checkmark-circle' : icon}
                    size={20}
                    color={done ? color : isMyStep ? color : C.steel300}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.stepName, { color: done ? color : isMyStep ? C.ink : C.steel400 }]}>
                    {index + 1}. {cap(step)}
                  </Text>
                  <Text style={s.stepOwnerText}>{STEP_OWNER[step]}</Text>
                </View>

                {done && (
                  <View style={[s.pill, { backgroundColor: color + '18' }]}>
                    <Ionicons name="checkmark-circle" size={12} color={color} />
                    <Text style={[s.pillText, { color }]}>Done</Text>
                  </View>
                )}
                {!done && canAct && (
                  <View style={[s.pill, { backgroundColor: color + '18' }]}>
                    <Text style={[s.pillText, { color }]}>Your step</Text>
                  </View>
                )}
                {!done && waiting && (
                  <View style={[s.pill, { backgroundColor: '#fef3c7' }]}>
                    <Ionicons name="hourglass-outline" size={11} color="#b45309" />
                    <Text style={[s.pillText, { color: '#b45309' }]}>Waiting</Text>
                  </View>
                )}
                {!done && !isMyStep && (
                  <View style={[s.pill, { backgroundColor: C.steel100 }]}>
                    <Text style={[s.pillText, { color: C.steel400 }]}>Other role</Text>
                  </View>
                )}
              </View>

              {/* ── Completed: show log details ── */}
              {done && log && (
                <View style={s.logBox}>
                  <View style={s.logRow}>
                    <Ionicons name="calendar-outline" size={13} color={C.muted} />
                    <Text style={s.logText}>{fmtDate(log.step_date)}</Text>
                  </View>
                  {log.grade && (
                    <View style={s.logRow}>
                      <Ionicons name="ribbon-outline" size={13} color={C.muted} />
                      <Text style={s.logText}>Grade: {log.grade}</Text>
                    </View>
                  )}
                  {log.notes ? (
                    <View style={s.logRow}>
                      <Ionicons name="document-text-outline" size={13} color={C.muted} />
                      <Text style={[s.logText, { fontStyle: 'italic', color: C.steel600 }]}>{log.notes}</Text>
                    </View>
                  ) : null}
                  {log.logged_by_name && (
                    <View style={s.logRow}>
                      <Ionicons name="person-circle-outline" size={13} color={C.muted} />
                      <Text style={[s.logText, { color: C.muted }]}>{log.logged_by_name}</Text>
                    </View>
                  )}
                  {log.log_number && <Text style={s.logRef}>{log.log_number}</Text>}
                </View>
              )}

              {/* ── Active: Record button ── */}
              {canAct && (
                <TouchableOpacity
                  style={[s.recordBtn, { backgroundColor: color }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('AddProcessingStep', {
                    deliveryId: id,
                    deliveryNumber: detail.delivery_number || `DEL-${id}`,
                    stepType: step,
                  })}
                >
                  <Ionicons name="add-circle-outline" size={18} color={C.white} />
                  <Text style={s.recordBtnText}>Record {cap(step)} Step</Text>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              )}

              {/* ── Waiting: previous step not done ── */}
              {waiting && (
                <View style={s.waitRow}>
                  <Ionicons name="hourglass-outline" size={15} color="#b45309" />
                  <Text style={s.waitText}>
                    Waiting for{' '}
                    <Text style={{ fontWeight: '800' }}>{cap(prevStep)}</Text>
                    {' '}to be completed first
                  </Text>
                </View>
              )}

              {/* ── Other role's step, not done ── */}
              {!done && !isMyStep && (
                <View style={s.otherRow}>
                  <Ionicons name="lock-closed-outline" size={13} color={C.steel300} />
                  <Text style={s.otherText}>Handled by {STEP_OWNER[step]}</Text>
                </View>
              )}
            </View>
          );
        })}

        {isFinished && (
          <View style={s.finishedBanner}>
            <Ionicons name="checkmark-circle" size={18} color="#15803d" />
            <Text style={s.finishedText}>
              Delivery is <Text style={{ fontWeight: '800' }}>{cap(detail.status)}</Text> — no more steps can be added
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.steel100 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero:       { backgroundColor: C.c800, paddingHorizontal: 20, paddingBottom: 16 },
  heroNav:    { flexDirection: 'row', alignItems: 'center', paddingTop: 14, marginBottom: 14 },
  backBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle:  { fontSize: 17, fontWeight: '800', color: C.white },
  heroSub:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusChipText: { fontSize: 11, fontWeight: '800' },

  content: { padding: 14, gap: 10 },

  stepCard: {
    backgroundColor: C.white, borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  stepHead:    { flexDirection: 'row', alignItems: 'center', padding: 14 },
  stepIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepName:    { fontSize: 15, fontWeight: '800' },
  stepOwnerText: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },

  pill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '700' },

  logBox: { paddingHorizontal: 14, paddingBottom: 14, gap: 7 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  logText: { fontSize: 13, color: C.ink, fontWeight: '600', flex: 1, lineHeight: 18 },
  logRef:  { fontSize: 10, fontWeight: '700', color: C.c600, letterSpacing: 0.3, marginTop: 2 },

  recordBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginTop: 0, padding: 14, borderRadius: 12 },
  recordBtnText: { flex: 1, color: C.white, fontSize: 14, fontWeight: '800' },

  waitRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginTop: 0, padding: 12, borderRadius: 10, backgroundColor: '#fef3c7' },
  waitText: { fontSize: 13, color: '#92400e', flex: 1, lineHeight: 18 },

  otherRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  otherText: { fontSize: 12, color: C.steel400, fontWeight: '600' },

  finishedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
  },
  finishedText: { flex: 1, fontSize: 13, color: '#15803d', fontWeight: '600', lineHeight: 18 },
});
