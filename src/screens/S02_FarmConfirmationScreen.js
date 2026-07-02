import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { polygonAPI } from '../services/api';
import { C } from '../theme';

const fmtNum = (v, d = 2) => v == null ? '—' : Number(v).toFixed(d);
const fmtList = (v) => !Array.isArray(v) || v.length === 0 ? '—' : v.join(', ');

const DetailRow = ({ label, value }) => (
  <View style={s.detailRow}>
    <Text style={s.detailLabel}>{label}</Text>
    <Text style={s.detailValue}>{value || '—'}</Text>
  </View>
);

const FarmConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, farm: initialFarm } = route.params || {};

  const [farm, setFarm] = useState(initialFarm || null);
  const [loading, setLoading] = useState(!initialFarm);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initialFarm) fetchFarmDetails();
  }, []);

  const fetchFarmDetails = async () => {
    try {
      const res = await polygonAPI.getFarm(farmId);
      if (res.status === 200) setFarm(res.data);
      else setError('Farm not found');
    } catch (e) {
      setError(e.response?.status === 404 ? 'Farm not found' : 'Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.c700} />
        <Text style={s.loadingText}>Fetching farm details…</Text>
      </View>
    );
  }

  const isCompliant = (farm?.compliance_status || '').toLowerCase() === 'compliant';

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
      <SafeAreaView style={s.safe} edges={['top']}>

{/* Top bar */}
         <View style={s.topBar}>
           <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
             <Ionicons name="chevron-back" size={20} color={C.ink} />
           </TouchableOpacity>
          <Text style={s.topTitle}>Confirm Farm</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Farm identity header */}
          <View style={s.farmHeader}>
            <View style={s.farmIconBox}>
              <Ionicons name="location" size={28} color={C.c700} />
            </View>
            <View style={s.farmHeaderText}>
              <Text style={s.farmName}>{farm?.farm_name || 'Unnamed Farm'}</Text>
              <Text style={s.farmId}>Farm ID: {farmId}</Text>
            </View>
            <View style={[s.statusBadge, isCompliant ? s.badgeGreen : s.badgeAmber]}>
              <Text style={[s.statusText, isCompliant ? s.badgeGreenText : s.badgeAmberText]}>
                {farm?.compliance_status || 'Pending'}
              </Text>
            </View>
          </View>

          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Physical Attributes */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Physical Attributes</Text>
            <View style={s.card}>
              <DetailRow label="Cooperative" value={farm?.cooperative_name} />
              <DetailRow label="Parcel Area" value={farm?.area_hectares ? `${fmtNum(farm.area_hectares)} ha` : null} />
              <DetailRow label="Terrain" value={farm?.terrain} />
              <DetailRow label="Soil Type" value={farm?.soil_type} />
            </View>
          </View>

          {/* Production */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>Production Profile</Text>
            <View style={s.card}>
              <DetailRow label="Coffee Varieties" value={fmtList(farm?.coffee_varieties)} />
              <DetailRow label="Tree Count" value={farm?.coffee_tree_count?.toLocaleString()} />
              <DetailRow label="Avg. Annual Yield" value={farm?.average_annual_production_kg ? `${farm.average_annual_production_kg} kg` : null} />
              <DetailRow label="Planting Method" value={farm?.planting_method} />
            </View>
          </View>

          {/* Sustainability notice */}
          <View style={s.noticeCard}>
            <View style={s.noticeIconBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={C.c700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>Sustainability Compliance</Text>
              <Text style={s.noticeText}>
                Data will be verified against historical satellite imagery to ensure zero-deforestation compliance.
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Footer actions */}
        <View style={s.footer}>
          <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.outlineBtnText}>Go back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.navigate('WalkBoundary', { farmId, farm })}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Confirm & Map</Text>
            <Ionicons name="chevron-forward" size={16} color={C.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f2f1' },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14, fontWeight: '500' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 56, paddingRight: 20, paddingVertical: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  topTitle: { fontSize: 16, fontWeight: '600', color: C.ink },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  farmHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderRadius: 8, padding: 16,
    borderWidth: 1, borderColor: C.steel200, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  farmIconBox: {
    width: 52, height: 52, borderRadius: 8, backgroundColor: C.c050,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.c200,
  },
  farmHeaderText: { flex: 1 },
  farmName: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 2 },
  farmId: { fontSize: 13, color: C.muted, fontWeight: '500' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
  badgeGreen: { backgroundColor: '#dcfce7' },
  badgeAmber: { backgroundColor: C.c050 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  badgeGreenText: { color: '#15803d' },
  badgeAmberText: { color: C.c700 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#fecaca', marginBottom: 16,
  },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13, fontWeight: '600' },

  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2,
  },
  card: {
    backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100,
  },
  detailLabel: { fontSize: 13, color: C.muted, fontWeight: '500', flex: 1 },
  detailValue: { fontSize: 13, color: C.ink, fontWeight: '600', flex: 1, textAlign: 'right' },

  noticeCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: C.c050, borderRadius: 8, padding: 14,
    borderWidth: 1, borderColor: C.c200,
  },
  noticeIconBox: { marginTop: 2 },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: C.c800, marginBottom: 4 },
  noticeText: { fontSize: 13, color: C.steel700, lineHeight: 19, fontWeight: '400' },

  footer: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel200,
  },
  outlineBtn: {
    flex: 1, height: 44, borderRadius: 6, borderWidth: 1.5, borderColor: C.steel300,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: C.steel700 },
  primaryBtn: {
    flex: 2, height: 44, borderRadius: 6, backgroundColor: C.c700,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },
});

export default FarmConfirmationScreen;
