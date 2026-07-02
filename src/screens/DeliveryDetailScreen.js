import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { ROLES } from '../utils/roles';

const STATUS_FLOW = ['received', 'in_processing', 'ready_for_batching', 'batched'];
const ALL_STEP_TYPES = ['sorting', 'washing', 'drying', 'milling', 'grading', 'packing'];

// Steps each role is allowed to log
const ROLE_STEPS = {
  [ROLES.DELIVERY_AGENT]:   ['sorting'],
  [ROLES.WASHING_STATION]:  ['sorting', 'washing'],
  [ROLES.POST_HARVEST]:     ['drying', 'milling', 'grading', 'packing'],
  [ROLES.COOP_OFFICER]:     ALL_STEP_TYPES,
  [ROLES.ADMIN]:            ALL_STEP_TYPES,
};

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'ready_for_batching') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'batched')            return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'in_processing')      return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'received')           return { color: '#0891b2', bg: '#e0f2fe' };
  if (u === 'rejected')           return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(2)} kg` : '—';

const STEP_ICONS = {
  sorting: 'filter-outline', washing: 'water-outline', drying: 'sunny-outline',
  milling: 'settings-outline', grading: 'ribbon-outline', packing: 'cube-outline',
};
const STEP_COLORS = {
  sorting: '#b45309', washing: '#0891b2', drying: '#d97706',
  milling: '#7c3aed', grading: '#15803d', packing: '#1d4ed8',
};

export default function DeliveryDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { deliveryId, delivery: initial } = route.params || {};

  // Steps this user can log (fall back to all steps for unknown roles)
  const STEP_TYPES = ROLE_STEPS[user?.role] || ALL_STEP_TYPES;

  const [detail, setDetail] = useState(initial || null);
  const [loading, setLoading] = useState(!initial);
  const [refreshing, setRefreshing] = useState(false);

  const id = deliveryId || initial?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getDelivery(id);
      setDetail(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to load delivery');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleStatusChange = async (newStatus) => {
    Alert.alert('Update Status', `Change to "${cap(newStatus)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          try {
            await coopAPI.updateDeliveryStatus(id, newStatus);
            await load(true);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to update status');
          }
        }
      },
    ]);
  };

  if (loading && !detail) {
    return <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>;
  }

  if (!detail) return null;

  const ss = statusStyle(detail.status);
  const logs = detail.processing_log || [];
  // Any staff with processing duties can see the processing steps screen
  const hasProcessingRole = STEP_TYPES.length > 0;


  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            {hasProcessingRole && (
              <TouchableOpacity
                style={s.heroActionBtn}
                onPress={() => navigation.navigate('ProcessingSteps', { deliveryId: id, delivery: detail })}
                activeOpacity={0.8}
              >
                <Ionicons name="list-outline" size={16} color={C.white} />
                <Text style={s.heroActionBtnText}>Processing</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.heroTitle} numberOfLines={1}>{detail.delivery_number || `DEL-${id}`}</Text>
          <View style={s.heroMeta}>
            <View style={[s.statusChip, { backgroundColor: ss.bg + 'cc' }]}>
              <Text style={[s.statusChipText, { color: ss.color }]}>{cap(detail.status)}</Text>
            </View>
            {detail.eudr_eligible !== false && (
              <View style={s.eudrChip}>
                <Ionicons name="shield-checkmark-outline" size={12} color="#15803d" />
                <Text style={s.eudrChipText}>EUDR Eligible</Text>
              </View>
            )}
          </View>
          <View style={s.heroStats}>
            {[
              { val: fmtKg(detail.net_weight_kg), lbl: 'Net Weight' },
              { val: detail.quality_grade || '—', lbl: 'Grade' },
              { val: fmtDate(detail.reception_date || detail.created_at), lbl: 'Received' },
            ].map((st, i, arr) => (
              <React.Fragment key={st.lbl}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal}>{st.val}</Text>
                  <Text style={s.heroStatLbl}>{st.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.heroSep} />}
              </React.Fragment>
            ))}
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >
        {/* Status progression */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Status Progression</Text>
          <View style={s.progressRow}>
            {STATUS_FLOW.map((st, i) => {
              const curr = (detail.status || '').toLowerCase();
              const currIdx = STATUS_FLOW.indexOf(curr);
              const done = i <= currIdx;
              const active = st === curr;
              return (
                <TouchableOpacity
                  key={st}
                  style={[s.progressStep, active && s.progressStepActive, done && !active && s.progressStepDone]}
                  onPress={() => !active && !['batched','rejected'].includes(curr) && handleStatusChange(st)}
                  activeOpacity={active ? 1 : 0.8}
                >
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={active ? C.c700 : done ? '#15803d' : C.steel400}
                  />
                  <Text style={[s.progressStepText, (done || active) && { color: active ? C.c700 : '#15803d', fontWeight: '700' }]}>
                    {cap(st)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Farmer & Farm */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Farmer & Farm</Text>
          {[
            { label: 'Farmer', value: detail.farmer_name },
            { label: 'Phone', value: detail.farmer_phone },
            { label: 'Farm', value: detail.farm_name },
            { label: 'Parcel ID', value: detail.parcel_id },
          ].map((r, i, arr) => r.value ? (
            <View key={r.label} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value}</Text>
            </View>
          ) : null)}
        </View>

        {/* Weight & Quality */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Weight & Quality</Text>
          {[
            { label: 'Net Weight', value: fmtKg(detail.net_weight_kg) },
            { label: 'Moisture', value: detail.moisture_content != null ? `${detail.moisture_content}%` : null },
            { label: 'Grade', value: detail.quality_grade },
            { label: 'Cherry Type', value: detail.cherry_type },
          ].map((r, i, arr) => r.value ? (
            <View key={r.label} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value}</Text>
            </View>
          ) : null)}
        </View>


        {/* Notes */}
        {!!detail.notes && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.notesText}>{detail.notes}</Text>
          </View>
        )}

        {/* Processing log */}
        <View style={s.card}>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>Processing Log ({logs.length})</Text>
            {hasProcessingRole && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ProcessingSteps', { deliveryId: id, delivery: detail })}
                activeOpacity={0.8}
              >
                <Text style={s.addStepLink}>View Steps →</Text>
              </TouchableOpacity>
            )}
          </View>

          {logs.length === 0 ? (
            <View style={s.emptyLog}>
              <Ionicons name="hourglass-outline" size={32} color={C.steel300} />
              <Text style={s.emptyLogText}>No processing steps logged yet.</Text>
            </View>
          ) : (
            logs.map((lg, i) => {
              const col = STEP_COLORS[lg.step_type] || C.c700;
              const icon = STEP_ICONS[lg.step_type] || 'checkmark-circle-outline';
              return (
                <View key={lg.id || i} style={[s.logItem, i < logs.length - 1 && s.logItemBorder]}>
                  <View style={[s.logDot, { backgroundColor: col + '22' }]}>
                    <Ionicons name={icon} size={16} color={col} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.logHeader}>
                      <Text style={s.logStep}>{cap(lg.step_type)}</Text>
                      <Text style={s.logDate}>{fmtDate(lg.step_date)}</Text>
                    </View>
                    {!!lg.log_number && (
                      <Text style={s.logRef}>{lg.log_number}</Text>
                    )}
                    {lg.step_type === 'grading' && lg.grade && <Text style={s.logMeta}>Grade: {lg.grade}</Text>}
                    {lg.notes && <Text style={s.logNotes}>{lg.notes}</Text>}
                    {!!lg.logged_by_name && (
                      <View style={s.logByRow}>
                        <Ionicons name="person-circle-outline" size={12} color={C.subtle} />
                        <Text style={s.logBy}>{lg.logged_by_name}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 20 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  heroActionBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 10 },
  heroMeta: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusChipText: { fontSize: 12, fontWeight: '800' },
  eudrChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(21,128,61,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  eudrChipText: { fontSize: 11, fontWeight: '700', color: '#4ade80' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '800', color: C.white },
  heroStatLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },
  heroSep: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  content: { padding: 16 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  addStepLink: { fontSize: 13, fontWeight: '700', color: C.c700 },

  // Status progression
  progressRow: { gap: 8 },
  progressStep: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.steel100 },
  progressStepActive: { backgroundColor: C.c050, borderWidth: 1.5, borderColor: C.c300 },
  progressStepDone: { backgroundColor: '#f0fdf4' },
  progressStepText: { fontSize: 13, color: C.steel600, fontWeight: '600' },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  rowLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600' },
  rowValue: { fontSize: 13, color: C.ink, fontWeight: '700', textAlign: 'right', flex: 1 },

  notesText: { fontSize: 13, color: C.ink, lineHeight: 20 },

  // Log
  emptyLog: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyLogText: { fontSize: 13, color: C.muted },
  logItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  logItemBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  logDot: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  logStep: { fontSize: 14, fontWeight: '800', color: C.ink },
  logDate: { fontSize: 12, color: C.muted, fontWeight: '600' },
  logRef: { fontSize: 10, fontWeight: '700', color: C.c600, letterSpacing: 0.3, marginBottom: 3 },
  logMeta: { fontSize: 12, color: C.muted, fontWeight: '600' },
  logNotes: { fontSize: 12, color: C.steel600, marginTop: 3, lineHeight: 17, fontStyle: 'italic' },
  logByRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  logBy: { fontSize: 11, color: C.subtle, fontWeight: '600' },

});
