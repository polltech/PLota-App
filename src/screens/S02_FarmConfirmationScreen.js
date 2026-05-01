import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { API_BASE_URL, API_KEY } from '../config';
import { C } from '../theme';

// ----- helpers -----
const fmt = (v) => (v == null ? null : String(v));
const fmtNum = (v, decimals = 2) =>
  v == null ? null : Number(v).toFixed(decimals);
const fmtBool = (v) => (v == null ? null : v ? 'Yes' : 'No');
const fmtList = (v) =>
  !Array.isArray(v) || v.length === 0 ? null : v.join(', ');

// Render a single detail row — skips if value is null
const DetailRow = ({ label, value }) => {
  if (value == null) return null;
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
};

// Section header
const Section = ({ title }) => (
  <Text style={s.sectionTitle}>{title}</Text>
);

const FarmConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, farm: initialFarm } = route.params || {};

  const [isOnline, setIsOnline] = useState(true);
  const [farm, setFarm] = useState(initialFarm || null);
  const [loading, setLoading] = useState(!initialFarm);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnectivity();
    if (!initialFarm) fetchFarmDetails();
  }, []);

  const checkConnectivity = async () => {
    const state = await Network.getNetworkStateAsync();
    setIsOnline(!!state.isConnected);
  };

  const fetchFarmDetails = async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/farms/${encodeURIComponent(farmId)}`,
        { headers: { 'X-API-Key': API_KEY } }
      );
      if (res.ok) {
        setFarm(await res.json());
      } else {
        setError(`Farm not found (${res.status})`);
        setFarm({ farm_id: farmId });
      }
    } catch (e) {
      setError('Could not reach server');
      setFarm({ farm_id: farmId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.c600} />
        <Text style={s.loadingText}>Loading farm details…</Text>
      </View>
    );
  }

  // Compliance badge colour
  const complianceColor =
    farm?.compliance_status === 'Compliant'
      ? { bg: C.syncedBg, text: C.syncedText }
      : farm?.compliance_status === 'Non-Compliant'
      ? { bg: C.failedBg, text: C.failedText }
      : { bg: C.pendingBg, text: C.pendingText };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirm farm</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Error banner */}
        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorBannerText}>{error} — check the Farm ID and try again</Text>
          </View>
        )}

        {/* ── Identity card ── */}
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Farm ID</Text>
              <Text style={s.farmIdText}>{farmId}</Text>
            </View>
            {farm?.compliance_status ? (
              <View style={[s.badge, { backgroundColor: complianceColor.bg }]}>
                <Text style={[s.badgeText, { color: complianceColor.text }]}>
                  {farm.compliance_status}
                </Text>
              </View>
            ) : (
              <View style={[s.badge, { backgroundColor: C.pendingBg }]}>
                <Text style={[s.badgeText, { color: C.pendingText }]}>No polygon yet</Text>
              </View>
            )}
          </View>

          {farm?.farm_name ? (
            <Text style={s.farmName}>{farm.farm_name}</Text>
          ) : null}

          {farm?.cooperative_name ? (
            <Text style={s.cooperativeName}>{farm.cooperative_name}</Text>
          ) : null}
        </View>

        {/* ── Land & Area ── */}
        <View style={s.card}>
          <Section title="Land & Area" />
          <DetailRow label="Total area" value={farm?.area_hectares ? `${fmtNum(farm.area_hectares, 4)} ha` : null} />
          <DetailRow label="Farm type" value={fmt(farm?.farm_type)} />
          <DetailRow label="Land use" value={fmt(farm?.land_use_type)} />
          <DetailRow label="Soil type" value={fmt(farm?.soil_type)} />
          <DetailRow label="Terrain" value={fmt(farm?.terrain)} />
          <DetailRow label="Farm status" value={fmt(farm?.farm_status)} />
          {farm?.centroid_lat && farm?.centroid_lon ? (
            <DetailRow
              label="Centroid (lat, lon)"
              value={`${fmtNum(farm.centroid_lat, 6)}, ${fmtNum(farm.centroid_lon, 6)}`}
            />
          ) : null}
        </View>

        {/* ── Coffee Profile ── */}
        <View style={s.card}>
          <Section title="Coffee Profile" />
          <DetailRow label="Varieties" value={fmtList(farm?.coffee_varieties)} />
          <DetailRow label="Year planted" value={fmt(farm?.year_coffee_planted)} />
          <DetailRow label="Tree count" value={farm?.coffee_tree_count ? `${farm.coffee_tree_count.toLocaleString()} trees` : null} />
          <DetailRow label="Coffee area %" value={farm?.coffee_percent ? `${farm.coffee_percent}%` : null} />
          <DetailRow label="Avg. annual yield" value={farm?.average_annual_production_kg ? `${fmtNum(farm.average_annual_production_kg, 0)} kg` : null} />
          <DetailRow label="Years farming" value={farm?.years_farming ? `${farm.years_farming} yrs` : null} />
          <DetailRow label="Planting method" value={fmt(farm?.planting_method)} />
          <DetailRow label="Mixed farming" value={fmtBool(farm?.mixed_farming)} />
          <DetailRow label="Irrigation" value={fmtBool(farm?.irrigation_used)} />
        </View>

        {/* ── EUDR / Compliance ── */}
        <View style={s.card}>
          <Section title="EUDR Compliance" />
          <DetailRow label="Status" value={fmt(farm?.compliance_status)} />
          <DetailRow label="Risk score" value={farm?.deforestation_risk_score != null ? `${fmtNum(farm.deforestation_risk_score, 2)} / 10` : null} />
          <DetailRow label="Certifications" value={fmtList(farm?.certifications)} />
          <DetailRow label="Profile submitted" value={fmtBool(farm?.profile_submitted)} />
        </View>

        {/* Notice */}
        <View style={s.noteBox}>
          <Text style={s.noteText}>
            Verify the details match the farmer before proceeding to boundary walk
          </Text>
        </View>

        {!isOnline && (
          <View style={s.offlineBanner}>
            <Text style={s.offlineText}>Offline — details may be outdated</Text>
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={[s.primaryBtn, !!error && s.btnDisabled]}
          onPress={() => navigation.navigate('WalkBoundary', { farmId, farm })}
          disabled={!!error}
          activeOpacity={0.8}
        >
          <Text style={s.primaryBtnText}>Start polygon walk →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryBtnText}>Wrong farm — go back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.c050 },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink2 },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  errorBanner: {
    backgroundColor: C.failedBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.failedText,
  },
  errorBannerText: { fontSize: 13, color: C.failedText, lineHeight: 19 },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  farmIdText: { fontSize: 22, fontWeight: '800', color: C.ink, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  farmName: { fontSize: 17, fontWeight: '600', color: C.ink2, marginBottom: 2 },
  cooperativeName: { fontSize: 13, color: C.muted },

  badge: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginLeft: 8,
    marginTop: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.c600,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  detailLabel: { fontSize: 13, color: C.muted, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '500', color: C.ink2, flex: 1, textAlign: 'right' },

  noteBox: {
    backgroundColor: C.c050,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.c400,
  },
  noteText: { fontSize: 13, color: C.muted, lineHeight: 19 },

  offlineBanner: {
    marginBottom: 12,
    backgroundColor: C.failedBg,
    borderRadius: 6,
    padding: 10,
  },
  offlineText: { fontSize: 12, color: C.failedText, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: C.c600,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: { backgroundColor: C.c200 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },

  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.c600,
  },
  secondaryBtnText: { color: C.c600, fontSize: 15, fontWeight: '600' },
});

export default FarmConfirmationScreen;
