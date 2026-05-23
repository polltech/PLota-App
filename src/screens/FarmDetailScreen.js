import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI, eudrAPI } from '../services/api';
import { C } from '../theme';

const eudrColor = (s) => {
  if (!s) return C.subtle;
  const v = s.toUpperCase();
  if (v.includes('LOW') || v.includes('COMPLIANT')) return C.eudrLow;
  if (v.includes('MEDIUM') || v.includes('PENDING')) return C.eudrMedium;
  return C.eudrHigh;
};

const InfoRow = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <Ionicons name={icon} size={16} color={C.c600} style={s.infoIcon} />
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value || '—'}</Text>
  </View>
);

const ParcelCard = ({ parcel, onPress }) => {
  const risk = parcel.eudr_risk_level || parcel.compliance_status;
  const col = eudrColor(risk);
  return (
    <TouchableOpacity style={s.parcelCard} onPress={onPress} activeOpacity={0.8}>
      <View style={s.parcelLeft}>
        <View style={s.parcelIconWrap}>
          <Ionicons name="map-outline" size={20} color={C.c600} />
        </View>
      </View>
      <View style={s.parcelContent}>
        <Text style={s.parcelName} numberOfLines={1}>{parcel.parcel_name || parcel.name || `Parcel ${parcel.id?.slice(-6) || ''}`}</Text>
        <Text style={s.parcelMeta}>
          {parcel.area_ha ? `${Number(parcel.area_ha).toFixed(3)} ha` : '—'}
          {parcel.crop_type ? ` • ${parcel.crop_type}` : ''}
        </Text>
        {risk && (
          <View style={[s.riskBadge, { backgroundColor: col + '18' }]}>
            <View style={[s.riskDot, { backgroundColor: col }]} />
            <Text style={[s.riskText, { color: col }]}>{risk}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
    </TouchableOpacity>
  );
};

export default function FarmDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { farm: initialFarm } = route.params || {};

  const [farm, setFarm] = useState(initialFarm || null);
  const [parcels, setParcels] = useState([]);
  const [eudrStatus, setEudrStatus] = useState(null);
  const [loading, setLoading] = useState(!initialFarm);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const farmId = farm?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!farmId) return;
    if (!isRefresh) setLoading(true);
    try {
      const [farmRes, parcelsRes, eudrRes] = await Promise.allSettled([
        !initialFarm || isRefresh ? farmerAPI.getFarm(farmId) : Promise.resolve({ data: initialFarm }),
        farmerAPI.getParcels(farmId),
        eudrAPI.getFarmCompliance(farmId),
      ]);

      if (farmRes.status === 'fulfilled') setFarm(farmRes.value.data);
      if (parcelsRes.status === 'fulfilled') {
        const d = parcelsRes.value.data;
        setParcels(Array.isArray(d) ? d : d?.parcels || []);
      }
      if (eudrRes.status === 'fulfilled') setEudrStatus(eudrRes.value.data);
    } catch (e) {
      console.warn('FarmDetail load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading && !farm) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  const riskColor = eudrColor(farm?.eudr_risk_level || eudrStatus?.risk_level);
  const areaHa = farm?.total_area_ha ?? farm?.area_ha;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroHeader}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.captureBtn}
              onPress={() => navigation.navigate('Capture', { screen: 'CaptureLanding' })}
            >
              <Ionicons name="add-circle-outline" size={20} color={C.white} />
              <Text style={s.captureBtnText}>Add Parcel</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.heroTitle} numberOfLines={2}>
            {farm?.farm_name || farm?.name || 'Farm Details'}
          </Text>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{areaHa ? Number(areaHa).toFixed(2) : '—'}</Text>
              <Text style={s.heroStatLabel}>Total Ha</Text>
            </View>
            <View style={s.heroSep} />
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{parcels.length}</Text>
              <Text style={s.heroStatLabel}>Parcels</Text>
            </View>
            <View style={s.heroSep} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatVal, { color: riskColor }]}>
                {farm?.eudr_risk_level || eudrStatus?.risk_level || '—'}
              </Text>
              <Text style={s.heroStatLabel}>EUDR Risk</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {['info', 'parcels', 'eudr'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, activeTab === t && s.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t === 'info' ? 'Farm Info' : t === 'parcels' ? `Parcels (${parcels.length})` : 'EUDR Status'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >
        {/* ── INFO TAB ── */}
        {activeTab === 'info' && (
          <View style={s.section}>
            <InfoRow icon="person-outline" label="Farmer" value={farm?.farmer_name} />
            <InfoRow icon="call-outline" label="Phone" value={farm?.farmer_phone} />
            <InfoRow icon="card-outline" label="National ID" value={farm?.farmer_national_id} />
            <InfoRow icon="location-outline" label="County" value={farm?.county || farm?.district} />
            <InfoRow icon="location-outline" label="Sub-county" value={farm?.subcounty} />
            <InfoRow icon="resize-outline" label="Total Area" value={areaHa ? `${Number(areaHa).toFixed(4)} ha` : null} />
            <InfoRow icon="leaf-outline" label="Crop Types" value={
              Array.isArray(farm?.crop_types) ? farm.crop_types.join(', ') : farm?.crop_types
            } />
            <InfoRow icon="calendar-outline" label="Registered" value={
              farm?.created_at ? new Date(farm.created_at).toLocaleDateString() : null
            } />
            {farm?.coop_member_no && (
              <InfoRow icon="people-outline" label="Member No." value={farm.coop_member_no} />
            )}
          </View>
        )}

        {/* ── PARCELS TAB ── */}
        {activeTab === 'parcels' && (
          <>
            {parcels.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="map-outline" size={48} color={C.steel300} />
                <Text style={s.emptyTitle}>No parcels yet</Text>
                <Text style={s.emptyMsg}>Capture a boundary to add the first parcel.</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('Capture', { screen: 'CaptureLanding' })}
                >
                  <Text style={s.emptyBtnText}>Start Capture</Text>
                </TouchableOpacity>
              </View>
            ) : (
              parcels.map((p) => (
                <ParcelCard
                  key={p.id}
                  parcel={p}
                  onPress={() => navigation.navigate('ParcelDetail', { parcel: p, farmId })}
                />
              ))
            )}
          </>
        )}

        {/* ── EUDR TAB ── */}
        {activeTab === 'eudr' && (
          <View>
            {/* Compliance card */}
            <View style={[s.eudrCard, { borderLeftColor: riskColor }]}>
              <View style={s.eudrCardTop}>
                <Ionicons name="shield-checkmark-outline" size={28} color={riskColor} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={s.eudrCardLabel}>Overall Risk Level</Text>
                  <Text style={[s.eudrCardStatus, { color: riskColor }]}>
                    {eudrStatus?.risk_level || farm?.eudr_risk_level || 'Not assessed'}
                  </Text>
                </View>
              </View>
              {eudrStatus?.summary && (
                <Text style={s.eudrSummary}>{eudrStatus.summary}</Text>
              )}
            </View>

            {/* Risk flags */}
            {eudrStatus?.risk_flags && eudrStatus.risk_flags.length > 0 && (
              <View style={s.section}>
                <Text style={s.subHeader}>Risk Flags</Text>
                {eudrStatus.risk_flags.map((flag, i) => (
                  <View key={i} style={s.flagRow}>
                    <Ionicons name="warning-outline" size={16} color={C.eudrHigh} />
                    <Text style={s.flagText}>{flag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Parcel EUDR rows */}
            {parcels.length > 0 && (
              <View style={s.section}>
                <Text style={s.subHeader}>Parcel Status</Text>
                {parcels.map((p) => {
                  const col = eudrColor(p.eudr_risk_level || p.compliance_status);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={s.eudrParcelRow}
                      onPress={() => navigation.navigate('ParcelDetail', { parcel: p, farmId })}
                    >
                      <Text style={s.eudrParcelName} numberOfLines={1}>
                        {p.parcel_name || p.name || `Parcel ${p.id?.slice(-6)}`}
                      </Text>
                      <Text style={[s.eudrParcelRisk, { color: col }]}>
                        {p.eudr_risk_level || p.compliance_status || 'Pending'}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={C.subtle} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },

  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 28 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  captureBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: C.white, marginBottom: 20 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 20, fontWeight: '800', color: C.white },
  heroStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  heroSep: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  tabs: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.subtle },
  tabTextActive: { color: C.c700 },

  scroll: { flex: 1 },
  content: { padding: 20 },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  subHeader: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoIcon: { marginRight: 10 },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600', width: 110 },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '600', flex: 1, textAlign: 'right' },

  parcelCard: { backgroundColor: C.white, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  parcelLeft: { marginRight: 14 },
  parcelIconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  parcelContent: { flex: 1 },
  parcelName: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 4 },
  parcelMeta: { fontSize: 12, color: C.muted, fontWeight: '500' },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskText: { fontSize: 11, fontWeight: '700' },

  eudrCard: { backgroundColor: C.white, borderRadius: 18, padding: 18, borderLeftWidth: 4, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  eudrCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  eudrCardLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase' },
  eudrCardStatus: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  eudrSummary: { fontSize: 13, color: C.steel700, lineHeight: 20 },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  flagText: { flex: 1, fontSize: 13, color: C.steel700, lineHeight: 18 },
  eudrParcelRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  eudrParcelName: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '600' },
  eudrParcelRisk: { fontSize: 13, fontWeight: '700', marginRight: 8 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { marginTop: 20, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },
});
