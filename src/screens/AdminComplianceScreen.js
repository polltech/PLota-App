import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const RiskBar = ({ label, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={s.riskRow}>
      <Text style={s.riskLabel}>{label}</Text>
      <View style={s.riskBarBg}>
        <View style={[s.riskBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[s.riskCount, { color }]}>{count}</Text>
    </View>
  );
};

const DDS_STATUS = {
  pending: { bg: '#fef3c7', fg: '#92400e', label: 'PENDING' },
  approved: { bg: C.eudrLowBg, fg: C.eudrLow, label: 'APPROVED' },
  rejected: { bg: C.eudrHighBg, fg: C.eudrHigh, label: 'REJECTED' },
  submitted: { bg: '#e0f2fe', fg: '#0369a1', label: 'SUBMITTED' },
};

const DDSCard = ({ dds, onApprove, onReject }) => {
  const st = DDS_STATUS[dds.status] || { bg: C.steel100, fg: C.steel700, label: (dds.status || '').toUpperCase() };
  return (
    <View style={s.ddsCard}>
      <View style={s.ddsTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.ddsRef} numberOfLines={1}>{dds.reference_number || `DDS-${dds.id}`}</Text>
          <Text style={s.ddsMeta}>{dds.operator_name || '—'} · {fmtDate(dds.created_at)}</Text>
        </View>
        <View style={[s.statusChip, { backgroundColor: st.bg }]}>
          <Text style={[s.statusText, { color: st.fg }]}>{st.label}</Text>
        </View>
      </View>

      {dds.commodity && (
        <Text style={s.ddsCommodity}>{dds.commodity} · {dds.country_of_production || '—'}</Text>
      )}

      {dds.status === 'pending' && (
        <View style={s.ddsActions}>
          <TouchableOpacity style={s.ddsRejectBtn} onPress={() => onReject(dds)}>
            <Text style={s.ddsRejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.ddsApproveBtn} onPress={() => onApprove(dds)}>
            <Text style={s.ddsApproveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const TABS = ['Overview', 'DDS'];

export default function AdminComplianceScreen() {
  const [tab, setTab] = useState('Overview');
  const [overview, setOverview] = useState(null);
  const [ddsList, setDdsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [ovRes, ddsRes] = await Promise.all([
        adminAPI.getComplianceOverview(),
        adminAPI.getDDSList(),
      ]);
      setOverview(ovRes.data);
      const d = ddsRes.data;
      setDdsList(Array.isArray(d) ? d : d?.items || []);
    } catch (e) {
      console.warn('Admin compliance:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleApprove = (dds) => {
    Alert.alert('Approve DDS', `Approve DDS ${dds.reference_number || dds.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await adminAPI.approveDDS(dds.id);
            setDdsList((prev) => prev.map((d) => d.id === dds.id ? { ...d, status: 'approved' } : d));
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to approve DDS.');
          }
        },
      },
    ]);
  };

  const handleReject = (dds) => {
    Alert.alert('Reject DDS', `Reject DDS ${dds.reference_number || dds.id}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminAPI.rejectDDS(dds.id, 'Rejected by admin');
            setDdsList((prev) => prev.map((d) => d.id === dds.id ? { ...d, status: 'rejected' } : d));
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Failed to reject DDS.');
          }
        },
      },
    ]);
  };

  const totalFarms = (overview?.low_risk_farms ?? 0) + (overview?.medium_risk_farms ?? 0) + (overview?.high_risk_farms ?? 0);
  const pendingDds = ddsList.filter((d) => d.status === 'pending').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <Text style={s.heroTitle}>EUDR Compliance</Text>
          <Text style={s.heroSub}>Regulation (EU) 2023/1115 monitoring</Text>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t}{t === 'DDS' && pendingDds > 0 ? ` (${pendingDds})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : tab === 'Overview' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        >
          {/* Summary cards */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Risk Summary</Text>
            <View style={s.summaryRow}>
              <View style={[s.summaryCard, { borderTopColor: C.eudrLow }]}>
                <Text style={[s.summaryVal, { color: C.eudrLow }]}>{overview?.low_risk_farms ?? '—'}</Text>
                <Text style={s.summaryLabel}>Low Risk</Text>
              </View>
              <View style={[s.summaryCard, { borderTopColor: C.eudrMedium }]}>
                <Text style={[s.summaryVal, { color: C.eudrMedium }]}>{overview?.medium_risk_farms ?? '—'}</Text>
                <Text style={s.summaryLabel}>Medium Risk</Text>
              </View>
              <View style={[s.summaryCard, { borderTopColor: C.eudrHigh }]}>
                <Text style={[s.summaryVal, { color: C.eudrHigh }]}>{overview?.high_risk_farms ?? '—'}</Text>
                <Text style={s.summaryLabel}>High Risk</Text>
              </View>
            </View>
          </View>

          {/* Risk distribution bars */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Risk Distribution</Text>
            <View style={s.card}>
              <RiskBar label="Low" count={overview?.low_risk_farms ?? 0} total={totalFarms} color={C.eudrLow} />
              <RiskBar label="Medium" count={overview?.medium_risk_farms ?? 0} total={totalFarms} color={C.eudrMedium} />
              <RiskBar label="High" count={overview?.high_risk_farms ?? 0} total={totalFarms} color={C.eudrHigh} />
            </View>
          </View>

          {/* Compliance stats */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Traceability</Text>
            <View style={s.card}>
              {[
                { label: 'Farms with polygon', value: overview?.farms_with_polygon },
                { label: 'Farms analysed', value: overview?.farms_analysed },
                { label: 'Deforestation detected', value: overview?.deforestation_detected },
                { label: 'Compliance rate', value: overview?.compliance_rate != null ? `${(overview.compliance_rate * 100).toFixed(1)}%` : null },
                { label: 'Total area mapped', value: overview?.total_area_ha != null ? `${Number(overview.total_area_ha).toFixed(1)} ha` : null },
              ].map(({ label, value }, i, arr) => (
                <View key={label} style={[s.infoRow, i < arr.length - 1 && s.borderBottom]}>
                  <Text style={s.infoLabel}>{label}</Text>
                  <Text style={s.infoVal}>{value ?? '—'}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      ) : (
        <FlatList
          data={ddsList}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <DDSCard dds={item} onApprove={handleApprove} onReject={handleReject} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="document-text-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No DDS documents</Text>
              <Text style={s.emptyMsg}>DDS submissions will appear here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.steel100 },
  tabBtnActive: { backgroundColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  tabTextActive: { color: C.white },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 16, borderTopWidth: 3, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  summaryVal: { fontSize: 26, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 4 },

  riskRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  riskLabel: { fontSize: 13, fontWeight: '700', color: C.ink, width: 60 },
  riskBarBg: { flex: 1, height: 8, backgroundColor: C.steel100, borderRadius: 4, overflow: 'hidden' },
  riskBarFill: { height: '100%', borderRadius: 4 },
  riskCount: { fontSize: 13, fontWeight: '800', width: 30, textAlign: 'right' },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoVal: { fontSize: 14, color: C.ink, fontWeight: '700' },

  list: { padding: 16, paddingBottom: 80 },
  ddsCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  ddsTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  ddsRef: { fontSize: 15, fontWeight: '800', color: C.ink },
  ddsMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  ddsCommodity: { fontSize: 12, color: C.muted, marginTop: 4 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 9, fontWeight: '800' },
  ddsActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.steel100 },
  ddsRejectBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.eudrHigh, borderRadius: 12, paddingVertical: 10 },
  ddsRejectText: { fontSize: 13, fontWeight: '800', color: C.eudrHigh },
  ddsApproveBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: C.eudrLow, borderRadius: 12, paddingVertical: 10 },
  ddsApproveText: { fontSize: 13, fontWeight: '800', color: C.white },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8 },
});
