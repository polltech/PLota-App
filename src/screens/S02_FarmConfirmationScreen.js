import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { API_BASE_URL, API_KEY } from '../config';
import { C } from '../theme';

const fmtNum = (v, decimals = 2) => v == null ? '—' : Number(v).toFixed(decimals);
const fmtBool = (v) => v == null ? '—' : v ? 'Yes' : 'No';
const fmtList = (v) => !Array.isArray(v) || v.length === 0 ? '—' : v.join(', ');

const DetailItem = ({ label, value }) => (
  <View style={s.detailItem}>
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      const res = await fetch(
        `${API_BASE_URL}/farms/${encodeURIComponent(farmId)}`,
        {
          headers: { 'X-API-Key': API_KEY },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) setFarm(await res.json());
      else setError(`Farm not found`);
    } catch (e) {
      if (e.name === 'AbortError') setError('Request timed out. Using local fallback.');
      else setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.c700} />
        <Text style={s.loadingText}>Fetching details...</Text>
      </View>
    );
  }

  const statusColor = farm?.compliance_status === 'Compliant' ? C.syncedText : C.pendingText;
  const statusBg = farm?.compliance_status === 'Compliant' ? C.syncedBg : C.pendingBg;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" transparent />

      <ScrollView bounces={false} contentContainerStyle={s.scrollContent}>
        {/* Hero Section */}
        <View style={s.hero}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1551033541-20705c7d678e?q=80&w=1000&auto=format&fit=crop' }}
            style={s.heroImage}
          />
          <View style={s.heroOverlay} />

          <SafeAreaView style={s.heroHeader}>
            <View style={s.headerRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                <Text style={s.backBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={s.logoBadge}>
                <Image source={require('../../assets/logo.jpeg')} style={s.logoBadgeImg} />
              </View>
            </View>
          </SafeAreaView>

          <View style={s.heroContent}>
            <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[s.statusText, { color: statusColor }]}>
                {farm?.compliance_status || 'Review Pending'}
              </Text>
            </View>
            <Text style={s.heroTitle}>{farm?.farm_name || 'Verify Identity'}</Text>
            <Text style={s.heroSubtitle}>Farm ID: {farmId}</Text>
          </View>
        </View>

        <View style={s.main}>
          {error && <View style={s.errorBox}><Text style={s.errorText}>{error}</Text></View>}

          <View style={s.cardSection}>
            <Text style={s.sectionTitle}>Physical Attributes</Text>
            <View style={s.cardGrid}>
              <DetailItem label="Cooperative" value={farm?.cooperative_name} />
              <DetailItem label="Parcel Area" value={farm?.area_hectares ? `${fmtNum(farm.area_hectares)} ha` : null} />
              <DetailItem label="Terrain" value={farm?.terrain} />
              <DetailItem label="Soil Composition" value={farm?.soil_type} />
            </View>
          </View>

          <View style={s.cardSection}>
            <Text style={s.sectionTitle}>Production Profile</Text>
            <View style={s.cardGrid}>
              <DetailItem label="Coffee Varieties" value={fmtList(farm?.coffee_varieties)} />
              <DetailItem label="Tree Count" value={farm?.coffee_tree_count?.toLocaleString()} />
              <DetailItem label="Avg. Annual Yield" value={farm?.average_annual_production_kg ? `${farm.average_annual_production_kg} kg` : null} />
              <DetailItem label="Planting Method" value={farm?.planting_method} />
            </View>
          </View>

          <View style={s.complianceInfo}>
            <View style={s.infoIconWrap}>
              <Text style={s.infoIcon}>🛡</Text>
            </View>
            <View style={s.infoContent}>
               <Text style={s.infoTitle}>EUDR Compliance Notice</Text>
               <Text style={s.infoText}>
                 Data collected will be verified against historical satellite imagery to ensure zero-deforestation.
               </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <View style={s.btnRow}>
          <TouchableOpacity
            style={s.backBtnAction}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={s.backBtnActionText}>Go Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.confirmBtn}
            onPress={() => navigation.navigate('WalkBoundary', { farmId, farm })}
            activeOpacity={0.8}
          >
            <Text style={s.confirmBtnText}>Confirm & Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.c050 },
  loadingText: { marginTop: 15, color: C.muted, fontWeight: '700' },

  hero: { height: 340, backgroundColor: C.c900 },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 10, 0, 0.4)',
  },
  heroHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  logoBadge: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: C.white },
  logoBadgeImg: { width: '100%', height: '100%' },

  heroContent: { position: 'absolute', bottom: 35, left: 24, right: 24 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 15 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  heroTitle: { fontSize: 34, fontWeight: '800', color: C.white, marginBottom: 4 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  main: { flex: 1, backgroundColor: C.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 24, paddingBottom: 140 },
  cardSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 18 },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.steel100, borderRadius: 24, padding: 20 },
  detailItem: { width: '50%', marginBottom: 15 },
  detailLabel: { fontSize: 11, color: C.muted, marginBottom: 4, fontWeight: '600' },
  detailValue: { fontSize: 15, color: C.ink, fontWeight: '800' },

  complianceInfo: { flexDirection: 'row', backgroundColor: C.syncedBg, padding: 20, borderRadius: 24, borderLeftWidth: 5, borderLeftColor: C.syncedText },
  infoIconWrap: { marginRight: 15, marginTop: 2 },
  infoIcon: { fontSize: 24 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '800', color: C.syncedText, marginBottom: 4 },
  infoText: { fontSize: 13, color: C.steel700, lineHeight: 20, fontWeight: '500' },

  errorBox: { backgroundColor: C.failedBg, padding: 16, borderRadius: 16, marginBottom: 25 },
  errorText: { color: C.failedText, fontWeight: '700', textAlign: 'center' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: C.steel200 },
  btnRow: { flexDirection: 'row', gap: 12 },
  backBtnAction: { flex: 1, height: 64, borderRadius: 20, borderWidth: 2, borderColor: C.steel200, alignItems: 'center', justifyContent: 'center' },
  backBtnActionText: { color: C.steel700, fontSize: 16, fontWeight: '800' },
  confirmBtn: { flex: 2, backgroundColor: C.c700, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
  confirmBtnText: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
});

export default FarmConfirmationScreen;
