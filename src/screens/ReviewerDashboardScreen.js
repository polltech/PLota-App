import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const RiskCard = ({ label, count, icon, color, bg }) => (
  <View style={[s.riskCard, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={24} color={color} />
    <Text style={[s.riskCount, { color }]}>{count ?? '—'}</Text>
    <Text style={[s.riskLabel, { color }]}>{label}</Text>
  </View>
);

const StatRow = ({ label, value }) => (
  <View style={s.statRow}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={s.statVal}>{value ?? '—'}</Text>
  </View>
);

export default function ReviewerDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminAPI.getComplianceOverview();
      setOverview(res.data);
    } catch (e) {
      console.warn('Reviewer dashboard:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const total = (overview?.low_risk_farms ?? 0) + (overview?.medium_risk_farms ?? 0) + (overview?.high_risk_farms ?? 0);
  const complianceRate = overview?.compliance_rate != null
    ? `${(overview.compliance_rate * 100).toFixed(1)}%`
    : '—';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <View>
              <Text style={s.heroGreet}>{greeting}, {user?.first_name || 'Reviewer'}</Text>
              <Text style={s.heroSub}>EUDR Due Diligence Review</Text>
            </View>
            <View style={s.reviewerBadge}>
              <Ionicons name="eye-outline" size={15} color={C.white} />
              <Text style={s.reviewerBadgeText}>REVIEWER</Text>
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
            {/* EUDR Risk Overview */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Risk Overview · {total} farms assessed</Text>
              <View style={s.riskGrid}>
                <RiskCard
                  label="Low Risk"
                  count={overview?.low_risk_farms}
                  icon="checkmark-circle"
                  color={C.eudrLow}
                  bg={C.eudrLowBg}
                />
                <RiskCard
                  label="Medium Risk"
                  count={overview?.medium_risk_farms}
                  icon="warning"
                  color={C.eudrMedium}
                  bg={C.eudrMedBg}
                />
                <RiskCard
                  label="High Risk"
                  count={overview?.high_risk_farms}
                  icon="alert-circle"
                  color={C.eudrHigh}
                  bg={C.eudrHighBg}
                />
              </View>
            </View>

            {/* Compliance metrics */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Compliance Metrics</Text>
              <View style={s.card}>
                <StatRow label="Overall compliance rate" value={complianceRate} />
                <StatRow label="Farms with polygon mapped" value={overview?.farms_with_polygon} />
                <StatRow label="Farms analysed by ML" value={overview?.farms_analysed} />
                <StatRow label="Deforestation detected" value={overview?.deforestation_detected} />
                <StatRow label="Total area mapped" value={overview?.total_area_ha != null ? `${Number(overview.total_area_ha).toFixed(1)} ha` : null} />
              </View>
            </View>

            {/* DDS quick access */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Due Diligence</Text>
              <View style={s.card}>
                <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('ReviewerDDS')} activeOpacity={0.8}>
                  <View style={s.menuIcon}>
                    <Ionicons name="document-text-outline" size={20} color={C.c600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>DDS Documents</Text>
                    <Text style={s.menuSub}>Review and manage due diligence statements</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.subtle} />
                </TouchableOpacity>

                <TouchableOpacity style={s.menuItem} onPress={() => navigation.navigate('ReviewerFarms')} activeOpacity={0.8}>
                  <View style={s.menuIcon}>
                    <Ionicons name="leaf-outline" size={20} color={C.c600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>Farm Compliance</Text>
                    <Text style={s.menuSub}>Browse farm-level EUDR risk assessments</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.subtle} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Compliance regulation reference */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Regulation Reference</Text>
              <View style={s.card}>
                {[
                  { icon: 'shield-checkmark-outline', title: 'EUDR Regulation (EU) 2023/1115', desc: 'Zero-deforestation due diligence requirements for commodities.' },
                  { icon: 'earth-outline', title: 'Hansen GFC v1.10', desc: 'Tree cover loss data derived from Landsat imagery (2000–2023).' },
                  { icon: 'satellite-outline', title: 'Copernicus Sentinel-2', desc: 'NDVI, BSI, NBR indices from CDSE free-tier API.' },
                  { icon: 'hardware-chip-outline', title: 'XGBoost Classifier', desc: '32-feature ML model scoring deforestation & farming risk.' },
                ].map(({ icon, title, desc }, i, arr) => (
                  <View key={title} style={[s.refRow, i < arr.length - 1 && s.borderBottom]}>
                    <View style={s.refIcon}>
                      <Ionicons name={icon} size={18} color={C.c600} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.refTitle}>{title}</Text>
                      <Text style={s.refDesc}>{desc}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

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
  reviewerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  reviewerBadgeText: { fontSize: 11, fontWeight: '800', color: C.white, letterSpacing: 0.5 },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  riskGrid: { flexDirection: 'row', gap: 10 },
  riskCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  riskCount: { fontSize: 26, fontWeight: '800' },
  riskLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  statLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  statVal: { fontSize: 14, color: C.ink, fontWeight: '700' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  menuIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuLabel: { fontSize: 14, fontWeight: '700', color: C.ink },
  menuSub: { fontSize: 11, color: C.muted, marginTop: 2 },

  refRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  refIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  refTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 3 },
  refDesc: { fontSize: 12, color: C.muted, lineHeight: 17 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
});
