import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const BATCH_STATUS_FLOW = ['draft', 'released', 'under_satellite_review', 'verified', 'dds_submitted'];

const batchStatusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'verified')              return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'released')              return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'under_satellite_review')return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'dds_submitted')         return { color: '#0891b2', bg: '#e0f2fe' };
  if (u === 'finalized')             return { color: '#15803d', bg: '#dcfce7' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const deliveryStatusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'batched' || u === 'ready_for_batching') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'in_processing') return { color: '#1d4ed8', bg: '#dbeafe' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function BatchDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { batchId, batch: initial } = route.params || {};

  const [detail, setDetail] = useState(initial || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const id = batchId || initial?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getBatch(id);
      setDetail(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to load batch');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleRelease = () => {
    Alert.alert(
      'Release Batch',
      'Release this batch to Plotra Admin for satellite screening? The batch will be locked after release.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release', style: 'destructive', onPress: async () => {
            setReleasing(true);
            try {
              await coopAPI.releaseBatch(id);
              await load(true);
              Alert.alert('Released', 'Batch submitted for satellite screening.');
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to release batch');
            } finally {
              setReleasing(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !detail) {
    return <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>;
  }
  if (!detail) return null;

  const ss = batchStatusStyle(detail.status);
  const isDraft = (detail.status || '').toLowerCase() === 'draft';
  const eudrPct = detail.total_weight_kg > 0
    ? ((detail.eudr_eligible_kg || 0) / detail.total_weight_kg * 100).toFixed(1)
    : null;

  const currIdx = BATCH_STATUS_FLOW.indexOf((detail.status || '').toLowerCase());

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            {isDraft && (
              <TouchableOpacity
                style={[s.releaseBtn, releasing && { opacity: 0.6 }]}
                onPress={handleRelease}
                disabled={releasing}
                activeOpacity={0.85}
              >
                {releasing
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <>
                      <Ionicons name="rocket-outline" size={15} color={C.white} />
                      <Text style={s.releaseBtnText}>Release for Screening</Text>
                    </>
                }
              </TouchableOpacity>
            )}
          </View>
          <Text style={s.heroTitle} numberOfLines={1}>{detail.batch_reference}</Text>
          <View style={[s.statusChip, { backgroundColor: ss.bg + 'cc' }]}>
            <Text style={[s.statusChipText, { color: ss.color }]}>{cap(detail.status)}</Text>
          </View>
          <View style={s.heroStats}>
            {[
              { val: fmtKg(detail.total_weight_kg), lbl: 'Total Weight' },
              { val: fmtKg(detail.eudr_eligible_kg), lbl: 'EUDR Eligible' },
              { val: String(detail.deliveries?.length || 0), lbl: 'Deliveries' },
              { val: String(detail.total_farmers || 0), lbl: 'Farmers' },
            ].map((st, i, arr) => (
              <React.Fragment key={st.lbl}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatVal} numberOfLines={1}>{st.val}</Text>
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
          <Text style={s.sectionTitle}>Batch Status Flow</Text>
          <View style={s.progressRow}>
            {BATCH_STATUS_FLOW.map((st, i) => {
              const done = i <= currIdx;
              const active = i === currIdx;
              return (
                <View key={st} style={s.progressItem}>
                  <View style={[s.progressDot, done && { backgroundColor: active ? C.c700 : '#15803d' }]}>
                    <Ionicons name={done ? 'checkmark' : 'ellipse-outline'} size={12} color={done ? C.white : C.steel400} />
                  </View>
                  {i < BATCH_STATUS_FLOW.length - 1 && (
                    <View style={[s.progressLine, done && i < currIdx && { backgroundColor: '#15803d' }]} />
                  )}
                  <Text style={[s.progressLabel, active && { color: C.c700, fontWeight: '800' }]} numberOfLines={2}>
                    {cap(st)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Batch details */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>Batch Details</Text>
          {[
            { label: 'Batch Number', value: detail.batch_reference },
            { label: 'Lot Number', value: detail.lot_number },
            { label: 'Crop Year', value: detail.crop_year?.toString() },
            { label: 'Processing Method', value: cap(detail.processing_method) },
            { label: 'Quality Grade', value: detail.quality_grade },
            { label: 'Harvest Start', value: fmtDate(detail.harvest_period_start) },
            { label: 'Harvest End', value: fmtDate(detail.harvest_period_end) },
            { label: 'Released At', value: fmtDate(detail.released_at) },
          ].map((r, i, arr) => r.value ? (
            <View key={r.label} style={[s.row, i < arr.length - 1 && s.rowBorder]}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value}</Text>
            </View>
          ) : null)}
        </View>

        {/* EUDR eligibility */}
        <View style={[s.card, { borderLeftWidth: 4, borderLeftColor: '#15803d' }]}>
          <Text style={s.sectionTitle}>EUDR Eligibility</Text>
          <View style={s.eudrRow}>
            <View style={s.eudrStat}>
              <Text style={s.eudrStatVal}>{fmtKg(detail.eudr_eligible_kg)}</Text>
              <Text style={s.eudrStatLbl}>Eligible Weight</Text>
            </View>
            <View style={s.eudrStat}>
              <Text style={s.eudrStatVal}>{fmtKg(detail.total_weight_kg)}</Text>
              <Text style={s.eudrStatLbl}>Total Weight</Text>
            </View>
            {eudrPct && (
              <View style={s.eudrStat}>
                <Text style={[s.eudrStatVal, { color: '#15803d' }]}>{eudrPct}%</Text>
                <Text style={s.eudrStatLbl}>Eligibility</Text>
              </View>
            )}
          </View>
          <View style={s.eudrBar}>
            <View style={[s.eudrBarFill, { width: `${Math.min(parseFloat(eudrPct || 0), 100)}%` }]} />
          </View>
          {detail.compliance_status && (
            <Text style={s.complianceNote}>{detail.compliance_status}</Text>
          )}
        </View>

        {/* Notes */}
        {!!detail.notes && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Notes</Text>
            <Text style={s.notesText}>{detail.notes}</Text>
          </View>
        )}

        {/* Deliveries in batch */}
        {detail.deliveries?.length > 0 && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Deliveries ({detail.deliveries.length})</Text>
            {detail.deliveries.map((d, i) => {
              const dst = deliveryStatusStyle(d.status);
              return (
                <TouchableOpacity
                  key={d.id || i}
                  style={[s.delivRow, i < detail.deliveries.length - 1 && s.rowBorder]}
                  onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: d.id, delivery: d })}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.delivNo}>{d.delivery_number || `DEL-${i + 1}`}</Text>
                    <Text style={s.delivKg}>{fmtKg(d.net_weight_kg)}</Text>
                  </View>
                  <View style={s.delivRight}>
                    {d.eudr_eligible !== false && (
                      <Ionicons name="shield-checkmark" size={13} color="#15803d" style={{ marginRight: 4 }} />
                    )}
                    <View style={[s.miniBadge, { backgroundColor: dst.bg }]}>
                      <Text style={[s.miniBadgeText, { color: dst.color }]}>{cap(d.status)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={C.subtle} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Release CTA if draft */}
        {isDraft && (
          <TouchableOpacity
            style={[s.releaseCTA, releasing && { opacity: 0.6 }]}
            onPress={handleRelease}
            disabled={releasing}
            activeOpacity={0.85}
          >
            {releasing
              ? <ActivityIndicator color={C.white} />
              : <>
                  <Ionicons name="rocket-outline" size={20} color={C.white} />
                  <Text style={s.releaseCTAText}>Release for Satellite Screening</Text>
                </>
            }
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 20 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#15803d', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  releaseBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
  heroTitle: { fontSize: 20, fontWeight: '800', color: C.white, marginBottom: 8 },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 14 },
  statusChipText: { fontSize: 12, fontWeight: '800' },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 14, fontWeight: '800', color: C.white },
  heroStatLbl: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2 },
  heroSep: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.2)' },

  content: { padding: 16 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  progressItem: { flex: 1, alignItems: 'center' },
  progressDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.steel200, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  progressLine: { position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, backgroundColor: C.steel200, zIndex: -1 },
  progressLabel: { fontSize: 9, fontWeight: '600', color: C.muted, textAlign: 'center', lineHeight: 13 },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  rowLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600' },
  rowValue: { fontSize: 13, color: C.ink, fontWeight: '700', textAlign: 'right', flex: 1 },

  // EUDR
  eudrRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  eudrStat: { alignItems: 'center' },
  eudrStatVal: { fontSize: 17, fontWeight: '800', color: C.ink },
  eudrStatLbl: { fontSize: 10, color: C.muted, marginTop: 2 },
  eudrBar: { height: 8, backgroundColor: C.steel100, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  eudrBarFill: { height: '100%', backgroundColor: '#15803d', borderRadius: 6 },
  complianceNote: { fontSize: 12, color: C.muted, textAlign: 'center' },

  notesText: { fontSize: 13, color: C.ink, lineHeight: 20 },

  // Delivery rows
  delivRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  delivNo: { fontSize: 13, fontWeight: '800', color: C.ink },
  delivKg: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  delivRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  miniBadgeText: { fontSize: 9, fontWeight: '800' },

  // Release CTA
  releaseCTA: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#15803d', borderRadius: 18, paddingVertical: 18, marginBottom: 14, shadowColor: '#15803d', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  releaseCTAText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
