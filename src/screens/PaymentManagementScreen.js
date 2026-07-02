import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
  TextInput, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const fmtKg  = (v) => v != null ? `${Number(v).toFixed(2)} kg` : '—';
const fmtKes = (v) => v != null ? `KES ${Number(v).toLocaleString('en-KE', { minimumFractionDigits: 2 })}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_COLORS = {
  released:   { bg: '#dcfce7', text: '#15803d' },
  exported:   { bg: '#dbeafe', text: '#1d4ed8' },
  pending:    { bg: '#fef9c3', text: '#a16207' },
  processing: { bg: '#ede9fe', text: '#7c3aed' },
};
const statusStyle = (s) => STATUS_COLORS[(s || '').toLowerCase()] || { bg: C.steel100, text: C.steel600 };

// ── Apportionment modal ───────────────────────────────────────────────────────
function ApportionmentModal({ visible, batch, onClose }) {
  const [rate, setRate]       = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePreview = async () => {
    const r = parseFloat(rate);
    if (!rate.trim() || isNaN(r) || r <= 0) {
      Alert.alert('Invalid rate', 'Enter a positive rate in KES per kg (e.g. 80.00)');
      return;
    }
    setLoading(true);
    try {
      const res = await coopAPI.getBatchApportionment(batch.id, r);
      setPreview(res.data);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to calculate apportionment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const r = parseFloat(rate);
    if (!preview) { Alert.alert('Preview first', 'Calculate the apportionment preview before submitting'); return; }
    Alert.alert(
      'Confirm Submission',
      `Submit payment apportionment at ${fmtKes(r)}/kg for batch ${batch.batch_number}?\n\nThis will record payment obligations for ${preview.producers?.length ?? 0} farmer(s).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await coopAPI.submitBatchApportionment(batch.id, r);
              Alert.alert('Submitted', 'Payment apportionment has been submitted for approval.');
              onClose(true);
            } catch (e) {
              Alert.alert('Failed', e.response?.data?.detail || 'Submission failed');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const onDismiss = () => { setRate(''); setPreview(null); onClose(false); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onDismiss}>
      <View style={m.sheet}>
        <View style={m.header}>
          <View>
            <Text style={m.title}>Payment Apportionment</Text>
            <Text style={m.sub}>{batch?.batch_number}</Text>
          </View>
          <TouchableOpacity onPress={onDismiss} style={m.closeBtn}>
            <Ionicons name="close" size={22} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={m.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Batch summary */}
          <View style={m.infoBand}>
            <View style={m.infoItem}>
              <Text style={m.infoVal}>{fmtKg(batch?.net_weight_kg ?? batch?.total_weight_kg)}</Text>
              <Text style={m.infoLbl}>Net Weight</Text>
            </View>
            <View style={m.infoItem}>
              <Text style={m.infoVal}>{batch?.deliveries_count ?? '—'}</Text>
              <Text style={m.infoLbl}>Deliveries</Text>
            </View>
            <View style={m.infoItem}>
              <Text style={m.infoVal}>{batch?.grade ?? '—'}</Text>
              <Text style={m.infoLbl}>Grade</Text>
            </View>
          </View>

          {/* Rate input */}
          <Text style={m.label}>Rate (KES per kg) *</Text>
          <View style={m.rateRow}>
            <TextInput
              style={m.rateInput}
              value={rate}
              onChangeText={(t) => { setRate(t); setPreview(null); }}
              keyboardType="decimal-pad"
              placeholder="e.g. 80.00"
              placeholderTextColor={C.subtle}
            />
            <TouchableOpacity style={[m.calcBtn, loading && { opacity: 0.6 }]} onPress={handlePreview} disabled={loading}>
              {loading
                ? <ActivityIndicator size="small" color={C.white} />
                : <Text style={m.calcBtnText}>Calculate</Text>}
            </TouchableOpacity>
          </View>
          <Text style={m.hint}>Enter the price per kg to see each farmer's share before submitting.</Text>

          {/* Preview results */}
          {preview && (
            <>
              <View style={m.previewHeader}>
                <Text style={m.previewTitle}>Apportionment Preview</Text>
                <Text style={m.previewTotal}>Total: {fmtKes(preview.total_payable)}</Text>
              </View>

              {(preview.producers || []).map((p, i) => (
                <View key={i} style={m.farmerRow}>
                  <View style={m.farmerAvatar}>
                    <Text style={m.farmerInitials}>
                      {((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.farmerName}>{p.first_name} {p.last_name}</Text>
                    <Text style={m.farmerKg}>{fmtKg(p.weight_kg)} · {p.share_pct?.toFixed(1)}%</Text>
                  </View>
                  <Text style={m.farmerAmount}>{fmtKes(p.amount_kes)}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[m.submitBtn, submitting && { opacity: 0.65 }]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color={C.white} />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                      <Text style={m.submitBtnText}>Submit for Approval</Text>
                    </>}
              </TouchableOpacity>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function PaymentManagementScreen() {
  const [batches, setBatches]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedBatch, setSelected]  = useState(null);

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await coopAPI.getBatches();
      const all = Array.isArray(res.data) ? res.data : (res.data?.batches ?? []);
      // Show only batches that are released or exported (ready for payment)
      const payable = all.filter(b => ['released', 'exported'].includes((b.status || '').toLowerCase()));
      setBatches(payable);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to load batches');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const renderBatch = ({ item }) => {
    const ss = statusStyle(item.status);
    return (
      <TouchableOpacity style={s.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.batchNum}>{item.batch_number}</Text>
            <Text style={s.batchDate}>{fmtDate(item.created_at)}</Text>
          </View>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.text }]}>{(item.status || '').toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statVal}>{fmtKg(item.net_weight_kg ?? item.total_weight_kg)}</Text>
            <Text style={s.statLbl}>Net Weight</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{item.deliveries_count ?? '—'}</Text>
            <Text style={s.statLbl}>Deliveries</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{item.grade ?? '—'}</Text>
            <Text style={s.statLbl}>Grade</Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statVal}>{item.cup_score ?? '—'}</Text>
            <Text style={s.statLbl}>Cup Score</Text>
          </View>
        </View>

        <View style={s.cardFooter}>
          <Ionicons name="cash-outline" size={14} color={C.c700} />
          <Text style={s.cardFooterText}>Tap to calculate & submit payment</Text>
          <Ionicons name="chevron-forward" size={14} color={C.c700} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <View>
              <Text style={s.heroTitle}>Payment Management</Text>
              <Text style={s.heroSub}>Apportionment for released batches</Text>
            </View>
            <View style={s.heroIcon}>
              <Ionicons name="cash-outline" size={26} color={C.white} />
            </View>
          </View>

          <View style={s.summaryRow}>
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{batches.length}</Text>
              <Text style={s.summaryLbl}>Pending{'\n'}Payments</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>
                {fmtKg(batches.reduce((sum, b) => sum + (b.net_weight_kg ?? b.total_weight_kg ?? 0), 0))}
              </Text>
              <Text style={s.summaryLbl}>Total{'\n'}Weight</Text>
            </View>
            <View style={s.summaryDivider} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{batches.reduce((sum, b) => sum + (b.deliveries_count ?? 0), 0)}</Text>
              <Text style={s.summaryLbl}>Total{'\n'}Deliveries</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.c700} />
          <Text style={s.loadingText}>Loading batches…</Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderBatch}
          contentContainerStyle={[s.list, batches.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cash-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No Batches Pending Payment</Text>
              <Text style={s.emptyBody}>Released and exported batches will appear here for payment apportionment.</Text>
            </View>
          }
        />
      )}

      {/* ── Apportionment modal ── */}
      {selectedBatch && (
        <ApportionmentModal
          visible={!!selectedBatch}
          batch={selectedBatch}
          onClose={(refreshNeeded) => {
            setSelected(null);
            if (refreshNeeded) load();
          }}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },

  hero:       { backgroundColor: C.c700, paddingLeft: 56, paddingRight: 20, paddingBottom: 20 },
  heroRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, marginBottom: 18 },
  heroTitle:  { fontSize: 20, fontWeight: '900', color: C.white },
  heroSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '600' },
  heroIcon:   { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  summaryRow:     { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14, gap: 0 },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  summaryVal:     { fontSize: 17, fontWeight: '900', color: C.white, textAlign: 'center' },
  summaryLbl:     { fontSize: 10, color: 'rgba(255,255,255,0.65)', fontWeight: '700', textAlign: 'center', marginTop: 3 },

  list:      { padding: 16, gap: 12 },
  listEmpty: { flexGrow: 1 },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: C.muted, fontSize: 13, fontWeight: '600' },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center' },
  emptyBody:  { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },

  card:       { backgroundColor: C.white, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTop:    { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  batchNum:   { fontSize: 15, fontWeight: '800', color: C.ink },
  batchDate:  { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  badge:      { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:  { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },

  statsRow: { flexDirection: 'row', gap: 0, borderTopWidth: 1, borderTopColor: C.steel100, paddingTop: 12, marginBottom: 10 },
  stat:     { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: 14, fontWeight: '800', color: C.ink },
  statLbl:  { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

  cardFooter:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: C.steel100, paddingTop: 10 },
  cardFooterText: { flex: 1, fontSize: 12, color: C.c700, fontWeight: '700' },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  sheet:    { flex: 1, backgroundColor: C.white },
  header:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  title:    { fontSize: 18, fontWeight: '800', color: C.ink },
  sub:      { fontSize: 13, color: C.muted, fontWeight: '600', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },

  body: { padding: 20 },

  infoBand: { flexDirection: 'row', backgroundColor: C.steel100, borderRadius: 12, padding: 14, marginBottom: 20 },
  infoItem: { flex: 1, alignItems: 'center' },
  infoVal:  { fontSize: 15, fontWeight: '800', color: C.ink },
  infoLbl:  { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

  label: { fontSize: 11, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },

  rateRow:    { flexDirection: 'row', gap: 10, marginBottom: 6 },
  rateInput:  { flex: 1, backgroundColor: C.steel100, borderRadius: 12, height: 50, paddingHorizontal: 14, fontSize: 16, fontWeight: '700', color: C.ink, borderWidth: 1.5, borderColor: C.steel200 },
  calcBtn:    { backgroundColor: C.c700, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  calcBtnText:{ color: C.white, fontWeight: '800', fontSize: 14 },
  hint:       { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 24 },

  previewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  previewTitle:  { fontSize: 13, fontWeight: '800', color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  previewTotal:  { fontSize: 14, fontWeight: '900', color: C.c700 },

  farmerRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmerAvatar:   { width: 38, height: 38, borderRadius: 19, backgroundColor: C.c100, alignItems: 'center', justifyContent: 'center' },
  farmerInitials: { fontSize: 14, fontWeight: '800', color: C.c700 },
  farmerName:     { fontSize: 14, fontWeight: '700', color: C.ink },
  farmerKg:       { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  farmerAmount:   { fontSize: 15, fontWeight: '900', color: C.ink },

  submitBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 16, paddingVertical: 16, marginTop: 24 },
  submitBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
