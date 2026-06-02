import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Modal,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

const fmt     = (n) => n != null ? `KES ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'KES 0.00';
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };

const paymentStatusColor = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'completed') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'failed' || u === 'rejected') return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const StatCard = ({ icon, label, value, sub, color, bg }) => (
  <View style={[s.statCard, { backgroundColor: bg || C.white }]}>
    <View style={[s.statIconWrap, { backgroundColor: color + '22' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    {!!sub && <Text style={s.statSub}>{sub}</Text>}
  </View>
);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MiniBarChart = ({ payments }) => {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: MONTHS[d.getMonth()], year: d.getFullYear(), month: d.getMonth(), amount: 0 };
  });
  (payments || []).forEach((p) => {
    const date = new Date(p.created_at);
    if (isNaN(date)) return;
    const slot = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
    if (slot) slot.amount += Number(p.amount) || 0;
  });
  const max = Math.max(...months.map(m => m.amount), 1);
  const hasData = months.some(m => m.amount > 0);
  if (!hasData) return (
    <View style={s.emptyChart}>
      <Ionicons name="bar-chart-outline" size={32} color={C.steel300} />
      <Text style={s.emptyChartText}>No payment data yet</Text>
    </View>
  );
  return (
    <View style={s.barChart}>
      {months.map((m, i) => {
        const pct = m.amount > 0 ? m.amount / max : 0;
        return (
          <View key={i} style={s.barCol}>
            <Text style={s.barVal} numberOfLines={1}>
              {m.amount > 0 ? (m.amount >= 1000 ? `${(m.amount / 1000).toFixed(0)}k` : String(Math.round(m.amount))) : ''}
            </Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { height: `${Math.max(pct * 100, pct > 0 ? 4 : 0)}%` }]} />
            </View>
            <Text style={s.barLabel}>{m.label}</Text>
          </View>
        );
      })}
    </View>
  );
};

export default function WalletScreen() {
  const navigation = useNavigation();

  const [stats,     setStats]     = useState(null);
  const [payments,  setPayments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount]   = useState('');
  const [withdrawPhone, setWithdrawPhone]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.allSettled([
        farmerAPI.getStats(),
        farmerAPI.getPayments(),
      ]);
      if (statsRes.status    === 'fulfilled') setStats(statsRes.value.data);
      if (paymentsRes.status === 'fulfilled') {
        const d = paymentsRes.value.data;
        setPayments(Array.isArray(d) ? d : (d?.payments || []));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (!withdrawPhone || withdrawPhone.length < 9) {
      Alert.alert('Invalid Phone', 'Please enter a valid M-Pesa phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await farmerAPI.requestWithdrawal({ amount: Number(withdrawAmount), phone: withdrawPhone });
      Alert.alert('Request Submitted', 'Your withdrawal request has been submitted and will be processed shortly.');
      setWithdrawVisible(false);
      setWithdrawAmount('');
      setWithdrawPhone('');
      load(true);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to submit withdrawal request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const balance       = stats?.mbt_balance ?? 0;
  const stakedMbt     = stats?.staked_mbt ?? 0;
  const annualInterest= stats?.annual_interest ?? 0;
  const totalPayouts  = stats?.total_payouts ?? payments.filter(p => (p.status || '').toLowerCase() === 'completed').reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const escrowBalance = stats?.escrow_balance ?? 0;

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

      {/* Header */}
      <View style={s.header}>
        <SafeAreaView>
          <View style={s.headerInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Wallet & Payments</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Balance Hero ────────────────────────────────────────────── */}
        <View style={s.balanceHero}>
          <Text style={s.balanceLabel}>Available Balance</Text>
          <Text style={s.balanceValue}>{fmt(balance)}</Text>
          {!!stats?.returns_trend && (
            <View style={s.trendPill}>
              <Ionicons name="trending-up" size={12} color="#15803d" />
              <Text style={s.trendPillText}>{stats.returns_trend}</Text>
            </View>
          )}
          <TouchableOpacity style={s.withdrawBtn} onPress={() => setWithdrawVisible(true)} activeOpacity={0.85}>
            <Ionicons name="arrow-up-circle-outline" size={18} color={C.white} />
            <Text style={s.withdrawBtnText}>Withdraw via M-Pesa</Text>
          </TouchableOpacity>
        </View>

        {/* ── 4 Stat Cards ────────────────────────────────────────────── */}
        <View style={s.statsGrid}>
          <StatCard icon="layers-outline"       label="Staked MBT"        value={fmt(stakedMbt)}      sub={stats?.staked_trend}    color={C.c600} />
          <StatCard icon="trending-up-outline"  label="Annual Interest"   value={fmt(annualInterest)} sub={stats?.interest_trend}  color="#10b981" />
          <StatCard icon="checkmark-done-outline" label="Total Payouts"   value={fmt(totalPayouts)}   sub="All time"               color="#3b82f6" />
          <StatCard icon="time-outline"         label="Escrow Balance"    value={fmt(escrowBalance)}  sub="Pending verification"   color="#f59e0b" />
        </View>

        {/* ── Payment Trends Chart ─────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Payment Trends (6 months)</Text>
        </View>
        <View style={s.chartCard}>
          <MiniBarChart payments={payments} />
          <Text style={s.chartNote}>Monthly payout amounts (KES)</Text>
        </View>

        {/* ── Recent Payments Table ────────────────────────────────────── */}
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>Recent Payments</Text>
        </View>
        <View style={s.tableCard}>
          <View style={s.tableHeader}>
            <Text style={[s.thText, { flex: 2 }]}>Type / Ref</Text>
            <Text style={[s.thText, { flex: 1.2, textAlign: 'center' }]}>Amount</Text>
            <Text style={[s.thText, { flex: 1, textAlign: 'center' }]}>Status</Text>
            <Text style={[s.thText, { flex: 1, textAlign: 'right' }]}>Date</Text>
          </View>
          {payments.length > 0 ? payments.slice(0, 10).map((p, i) => {
            const sc = paymentStatusColor(p.status);
            return (
              <View key={p.id || i} style={[s.tableRow, i < Math.min(payments.length, 10) - 1 && s.tableRowBorder]}>
                <View style={{ flex: 2 }}>
                  <Text style={s.tdMain} numberOfLines={1}>{p.payment_type || p.type || 'Payment'}</Text>
                  <Text style={s.tdMeta} numberOfLines={1}>#{String(p.id || p.reference || i + 1).slice(-6)}</Text>
                </View>
                <Text style={[s.tdAmount, { flex: 1.2, textAlign: 'center' }]}>
                  KES {Number(p.amount || 0).toLocaleString()}
                </Text>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[s.statusText, { color: sc.color }]}>{p.status || 'Pending'}</Text>
                  </View>
                </View>
                <Text style={[s.tdDate, { flex: 1, textAlign: 'right' }]}>{fmtDate(p.created_at)}</Text>
              </View>
            );
          }) : (
            <View style={s.emptyState}>
              <Ionicons name="receipt-outline" size={36} color={C.steel300} />
              <Text style={s.emptyText}>No payments yet</Text>
              <Text style={s.emptySubText}>Your payment history will appear here</Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Withdraw Modal ────────────────────────────────────────────── */}
      <Modal visible={withdrawVisible} animationType="slide" transparent onRequestClose={() => setWithdrawVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawVisible(false)}>
                <Ionicons name="close" size={22} color={C.muted} />
              </TouchableOpacity>
            </View>

            <View style={s.balancePill}>
              <Text style={s.balancePillLabel}>Available</Text>
              <Text style={s.balancePillValue}>{fmt(balance)}</Text>
            </View>

            <Text style={s.inputLabel}>Amount (KES)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholderTextColor={C.subtle}
            />

            <Text style={s.inputLabel}>M-Pesa Phone Number</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 0712345678"
              keyboardType="phone-pad"
              value={withdrawPhone}
              onChangeText={setWithdrawPhone}
              placeholderTextColor={C.subtle}
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleWithdraw}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color={C.white} size="small" />
                : <><Ionicons name="arrow-up-circle-outline" size={18} color={C.white} /><Text style={s.submitBtnText}>Submit Withdrawal</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.steel100 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:      { flex: 1 },
  content:     { padding: 20, paddingTop: 20 },

  // Header
  header:      { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20, paddingTop: 0 },
  headerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.white },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Balance hero
  balanceHero:  { backgroundColor: C.c700, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceValue: { fontSize: 34, fontWeight: '900', color: C.white, marginTop: 6, marginBottom: 8 },
  trendPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 18 },
  trendPillText:{ fontSize: 11, fontWeight: '700', color: '#15803d' },
  withdrawBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  withdrawBtnText: { fontSize: 14, fontWeight: '800', color: C.white },

  // Stat cards
  statsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard:     { width: '47%', backgroundColor: C.white, borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel:    { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  statValue:    { fontSize: 16, fontWeight: '800' },
  statSub:      { fontSize: 10, color: C.subtle, marginTop: 2, fontWeight: '600' },

  // Section
  sectionRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Chart
  chartCard:    { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  chartNote:    { fontSize: 11, color: C.subtle, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  barChart:     { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol:       { flex: 1, alignItems: 'center' },
  barVal:       { fontSize: 9, fontWeight: '700', color: C.muted, marginBottom: 2, height: 12 },
  barTrack:     { width: '80%', flex: 1, backgroundColor: C.steel100, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:      { borderRadius: 6, minHeight: 2, backgroundColor: C.c600 },
  barLabel:     { fontSize: 9, color: C.muted, fontWeight: '600', marginTop: 4 },
  emptyChart:   { height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText:{ fontSize: 13, color: C.subtle, fontWeight: '500' },

  // Table
  tableCard:       { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  tableHeader:     { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.steel100, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  thText:          { fontSize: 10, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  tableRowBorder:  { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  tdMain:          { fontSize: 13, fontWeight: '700', color: C.ink },
  tdMeta:          { fontSize: 11, color: C.muted, marginTop: 1 },
  tdAmount:        { fontSize: 13, fontWeight: '700', color: C.ink },
  tdDate:          { fontSize: 12, color: C.muted },
  statusBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  statusText:      { fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  emptyState:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:       { fontSize: 15, fontWeight: '700', color: C.steel600 },
  emptySubText:    { fontSize: 12, color: C.subtle },

  // Withdraw modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:       { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 18, fontWeight: '800', color: C.ink },
  balancePill:     { backgroundColor: C.steel100, borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  balancePillLabel:{ fontSize: 12, fontWeight: '700', color: C.muted },
  balancePillValue:{ fontSize: 16, fontWeight: '800', color: C.c700 },
  inputLabel:      { fontSize: 12, fontWeight: '700', color: C.steel700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  input:           { backgroundColor: C.steel100, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: C.ink, marginBottom: 16, borderWidth: 1, borderColor: C.steel200 },
  submitBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  submitBtnText:   { fontSize: 15, fontWeight: '800', color: C.white },
});
