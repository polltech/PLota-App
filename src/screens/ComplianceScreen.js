import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI, eudrAPI } from '../services/api';
import { C } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────
const docTypeLabel = (t) => {
  const map = {
    title_deed: 'Title Deed', lease_agreement: 'Lease Agreement',
    customary_rights: 'Customary Rights', inheritance_letter: 'Inheritance Letter',
    community_land_title: 'Community Land Title', other: 'Other',
  };
  return map[t] || t || 'Document';
};

const docIcon = (t) => {
  if (!t) return 'document-outline';
  if (t.includes('deed') || t.includes('title')) return 'ribbon-outline';
  if (t.includes('lease')) return 'contract-outline';
  return 'document-text-outline';
};

const riskColor = (r) => {
  if (!r) return C.subtle;
  const s = r.toUpperCase();
  if (s.includes('LOW') || s.includes('COMPLIANT')) return '#15803d';
  if (s.includes('MEDIUM') || s.includes('PENDING')) return '#b45309';
  return '#dc2626';
};

const riskBg = (r) => {
  if (!r) return C.steel100;
  const s = r.toUpperCase();
  if (s.includes('LOW') || s.includes('COMPLIANT')) return '#dcfce7';
  if (s.includes('MEDIUM') || s.includes('PENDING')) return '#fef3c7';
  return '#fee2e2';
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle }) => (
  <View style={s.sectionHeader}>
    <View style={s.sectionHeaderLeft}>
      <Ionicons name={icon} size={22} color={C.c700} />
      <View style={{ marginLeft: 10 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.sectionSub}>{subtitle}</Text>}
      </View>
    </View>
  </View>
);

const DocCard = ({ doc }) => (
  <View style={s.docCard}>
    <View style={[s.docIcon, { backgroundColor: C.c050 }]}>
      <Ionicons name={docIcon(doc.document_type)} size={22} color={C.c700} />
    </View>
    <View style={{ flex: 1, marginLeft: 12 }}>
      <Text style={s.docName} numberOfLines={1}>{doc.document_name || docTypeLabel(doc.document_type)}</Text>
      <Text style={s.docMeta}>
        {docTypeLabel(doc.document_type)}{doc.farm_name ? ` · ${doc.farm_name}` : ''}
      </Text>
      <Text style={s.docDate}>Uploaded {fmtDate(doc.created_at || doc.uploaded_at)}</Text>
    </View>
    <View style={[s.verifiedBadge, { backgroundColor: doc.verified ? '#dcfce7' : '#fef3c7' }]}>
      <Text style={[s.verifiedText, { color: doc.verified ? '#15803d' : '#b45309' }]}>
        {doc.verified ? 'Verified' : 'Pending'}
      </Text>
    </View>
  </View>
);

const FarmComplianceRow = ({ farm, onPress }) => {
  const risk = farm.eudr_risk_level || farm.compliance_status;
  return (
    <TouchableOpacity style={s.compRow} onPress={onPress} activeOpacity={0.8}>
      <View style={s.compRowLeft}>
        <View style={[s.compDot, { backgroundColor: riskColor(risk) }]} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={s.compFarmName} numberOfLines={1}>{farm.farm_name || 'Unnamed Farm'}</Text>
          <Text style={s.compFarmMeta}>{farm.county || farm.district || ''}</Text>
        </View>
      </View>
      <View style={[s.riskBadge, { backgroundColor: riskBg(risk) }]}>
        <Text style={[s.riskText, { color: riskColor(risk) }]}>{risk || 'Pending'}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ComplianceScreen() {
  const navigation = useNavigation();

  const [documents,   setDocuments]   = useState([]);
  const [farms,       setFarms]       = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [docError,    setDocError]    = useState(null);
  const [activeTab,   setActiveTab]   = useState('eudr'); // 'eudr' | 'docs'

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [docsRes, farmsRes, statsRes] = await Promise.allSettled([
        farmerAPI.getDocuments(),
        farmerAPI.getFarms(),
        farmerAPI.getStats(),
      ]);
      if (docsRes.status  === 'fulfilled') setDocuments(docsRes.value.data || []);
      else setDocError('Could not load documents');
      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value.data?.farms || farmsRes.value.data || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const overallRisk = stats?.eudr_risk_level;
  const compliantCount = farms.filter(f => {
    const r = (f.eudr_risk_level || '').toLowerCase();
    return r.includes('low') || r.includes('compliant');
  }).length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Compliance</Text>
        <Text style={s.headerSub}>KYC Documents & EUDR Status</Text>
      </SafeAreaView>

      {/* Tab switcher */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'eudr' && s.tabActive]}
          onPress={() => setActiveTab('eudr')}
          activeOpacity={0.8}
        >
          <Ionicons name="shield-checkmark-outline" size={16} color={activeTab === 'eudr' ? C.c700 : C.muted} />
          <Text style={[s.tabText, activeTab === 'eudr' && s.tabTextActive]}>EUDR Compliance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'docs' && s.tabActive]}
          onPress={() => setActiveTab('docs')}
          activeOpacity={0.8}
        >
          <Ionicons name="document-text-outline" size={16} color={activeTab === 'docs' ? C.c700 : C.muted} />
          <Text style={[s.tabText, activeTab === 'docs' && s.tabTextActive]}>KYC Documents</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── EUDR COMPLIANCE TAB ─────────────────────────────────────── */}
        {activeTab === 'eudr' && (
          <>
            {/* Overall score */}
            <View style={[s.eudrScoreCard, { borderColor: riskColor(overallRisk) + '50' }]}>
              <View style={[s.eudrScoreIcon, { backgroundColor: riskBg(overallRisk) }]}>
                <Ionicons name="shield-checkmark" size={32} color={riskColor(overallRisk)} />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={s.eudrScoreLabel}>Overall EUDR Status</Text>
                <Text style={[s.eudrScoreValue, { color: riskColor(overallRisk) }]}>
                  {overallRisk || 'Pending Review'}
                </Text>
                <Text style={s.eudrScoreSub}>
                  {compliantCount} of {farms.length} farm{farms.length !== 1 ? 's' : ''} compliant
                </Text>
              </View>
            </View>

            {/* Info card */}
            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#1d4ed8" />
              <Text style={s.infoText}>
                EUDR (EU) 2023/1115 requires that all coffee products are free of deforestation risk. Satellite analysis verifies your farm boundaries against the December 31, 2020 baseline.
              </Text>
            </View>

            {/* Per-farm compliance */}
            <SectionHeader icon="leaf-outline" title="Farm Compliance" subtitle="Tap a farm to view detailed EUDR analysis" />
            <View style={s.card}>
              {farms.length === 0 ? (
                <View style={s.emptyInCard}>
                  <Text style={s.emptyInCardText}>No farms registered yet</Text>
                </View>
              ) : (
                farms.map((farm, i) => (
                  <View key={farm.id || i} style={i < farms.length - 1 ? s.rowBorder : null}>
                    <FarmComplianceRow
                      farm={farm}
                      onPress={() => navigation.navigate('Farms', { screen: 'FarmDetail', params: { farm } })}
                    />
                  </View>
                ))
              )}
            </View>

            {/* EUDR Requirements */}
            <SectionHeader icon="checkmark-circle-outline" title="EUDR Requirements" subtitle="Required for market access to EU" />
            <View style={s.card}>
              {[
                { check: farms.length > 0, label: 'Farm registered in Plotra', sub: 'At least one farm required' },
                { check: farms.some(f => f.parcels_count > 0), label: 'GPS boundary captured', sub: 'Polygon coordinates for parcel' },
                { check: compliantCount > 0, label: 'Satellite analysis passed', sub: 'No deforestation risk detected' },
                { check: documents.length > 0, label: 'KYC documents uploaded', sub: 'Title deed or land rights document' },
              ].map((item, i) => (
                <View key={i} style={[s.requirementRow, i < 3 && s.rowBorder]}>
                  <View style={[s.reqDot, { backgroundColor: item.check ? '#15803d' : '#f59e0b' }]}>
                    <Ionicons name={item.check ? 'checkmark' : 'time-outline'} size={12} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.reqLabel}>{item.label}</Text>
                    <Text style={s.reqSub}>{item.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── KYC DOCUMENTS TAB ──────────────────────────────────────── */}
        {activeTab === 'docs' && (
          <>
            {/* Upload prompt */}
            <View style={s.uploadCard}>
              <Ionicons name="cloud-upload-outline" size={28} color={C.c700} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.uploadTitle}>Upload Documents</Text>
                <Text style={s.uploadSub}>Upload via the Plotra web dashboard at portal.plotra.eu.</Text>
              </View>
            </View>

            {/* Document types info */}
            <SectionHeader icon="folder-open-outline" title="Accepted Documents" subtitle="For EUDR and KYC verification" />
            <View style={s.card}>
              {[
                { icon: 'ribbon-outline',       label: 'Title Deed',          sub: 'Government-issued land ownership certificate' },
                { icon: 'document-outline',     label: 'Lease Agreement',     sub: 'For leased or rented land' },
                { icon: 'people-outline',        label: 'Customary Rights',    sub: 'Community or traditional land allocation' },
                { icon: 'mail-outline',          label: 'Inheritance Letter',  sub: 'Family plot or inherited land' },
              ].map((item, i) => (
                <View key={i} style={[s.docTypeRow, i < 3 && s.rowBorder]}>
                  <View style={s.docTypeIcon}>
                    <Ionicons name={item.icon} size={18} color={C.c700} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={s.docTypeLabel}>{item.label}</Text>
                    <Text style={s.docTypeSub}>{item.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Existing documents */}
            <SectionHeader
              icon="document-text-outline"
              title="My Documents"
              subtitle={documents.length > 0 ? `${documents.length} document${documents.length !== 1 ? 's' : ''} uploaded` : 'No documents yet'}
            />
            {docError ? (
              <View style={s.errorBox}>
                <Ionicons name="cloud-offline-outline" size={20} color={C.muted} />
                <Text style={s.errorText}>{docError}</Text>
              </View>
            ) : documents.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="folder-open-outline" size={48} color={C.steel300} />
                <Text style={s.emptyTitle}>No documents uploaded</Text>
                <Text style={s.emptyMsg}>Upload your land title deed or rights documentation via the web dashboard to complete your KYC profile.</Text>
              </View>
            ) : (
              <View style={s.card}>
                {documents.map((doc, i) => (
                  <View key={doc.id || i} style={i < documents.length - 1 && s.rowBorder}>
                    <DocCard doc={doc} />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingLeft: 56, paddingRight: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  tabTextActive: { color: C.c700 },

  content: { padding: 20 },

  // EUDR score card
  eudrScoreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 20, marginBottom: 14, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  eudrScoreIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  eudrScoreLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  eudrScoreValue: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  eudrScoreSub: { fontSize: 12, color: C.muted, marginTop: 4 },

  // Info card
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18, fontWeight: '500' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  sectionSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  // Card
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },

  // Farm compliance row
  compRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  compRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  compDot: { width: 10, height: 10, borderRadius: 5 },
  compFarmName: { fontSize: 14, fontWeight: '700', color: C.ink },
  compFarmMeta: { fontSize: 12, color: C.muted, marginTop: 1 },
  riskBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  riskText: { fontSize: 11, fontWeight: '800' },

  // Requirements
  requirementRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  reqDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reqLabel: { fontSize: 14, fontWeight: '700', color: C.ink },
  reqSub: { fontSize: 12, color: C.muted, marginTop: 1 },

  // Upload card
  uploadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.c050, borderRadius: 18, padding: 18, marginBottom: 20, borderWidth: 1.5, borderColor: C.c200 },
  uploadTitle: { fontSize: 15, fontWeight: '800', color: C.c800, marginBottom: 4 },
  uploadSub: { fontSize: 12, color: C.muted, lineHeight: 17 },

  // Document type rows
  docTypeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  docTypeIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  docTypeLabel: { fontSize: 14, fontWeight: '700', color: C.ink },
  docTypeSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  // Document card
  docCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  docIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  docName: { fontSize: 14, fontWeight: '700', color: C.ink },
  docMeta: { fontSize: 12, color: C.muted, marginTop: 1 },
  docDate: { fontSize: 11, color: C.subtle, marginTop: 2 },
  verifiedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { fontSize: 10, fontWeight: '800' },

  // Empty / error
  emptyBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16, marginBottom: 8 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  emptyInCard: { padding: 20, alignItems: 'center' },
  emptyInCardText: { fontSize: 13, color: C.muted },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.white, borderRadius: 14, padding: 16, marginBottom: 16 },
  errorText: { fontSize: 13, color: C.muted },
});
