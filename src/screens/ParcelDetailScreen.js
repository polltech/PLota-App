import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { satelliteAPI, eudrAPI } from '../services/api';
import { C } from '../theme';

const eudrColor = (s) => {
  if (!s) return C.subtle;
  const v = (s || '').toUpperCase();
  if (v.includes('LOW') || v.includes('COMPLIANT') || v === 'PRE_2020_CONFIRMED') return C.eudrLow;
  if (v.includes('MEDIUM') || v.includes('PENDING') || v.includes('UNCLEAR')) return C.eudrMedium;
  return C.eudrHigh;
};

const fmtDate = (d) => {
  if (!d) return '—';
  const parsed = new Date(d + (d.length === 7 ? '-01' : ''));
  return parsed.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : '—');

const IndexBar = ({ label, value, min = -1, max = 1, color }) => {
  const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <View style={s.indexRow}>
      <Text style={s.indexLabel}>{label}</Text>
      <View style={s.indexTrack}>
        <View style={[s.indexFill, { width: `${norm * 100}%`, backgroundColor: color || C.c600 }]} />
      </View>
      <Text style={s.indexVal}>{value != null ? Number(value).toFixed(3) : '—'}</Text>
    </View>
  );
};

const MINI_MAP_HTML = (coords) => `<!DOCTYPE html><html>
<head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#m{width:100vw;height:100vh}</style></head>
<body><div id="m"></div><script>
var m=L.map('m',{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(m);
var c=${JSON.stringify(coords)};
if(c&&c.length>2){
  var p=L.polygon(c.map(function(x){return[x.lat||x[1],x.lng||x[0]];}),{color:'#15803d',fillColor:'#16a34a',fillOpacity:0.5,weight:3}).addTo(m);
  m.fitBounds(p.getBounds().pad(0.25));
}
</script></body></html>`;

export default function ParcelDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { parcel: initialParcel, farmId } = route.params || {};

  const [parcel] = useState(initialParcel);
  const [indices, setIndices] = useState(null);
  const [history, setHistory] = useState(null);
  const [eudrAnalysis, setEudrAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [analysing, setAnalysing] = useState(false);
  const pollRef = useRef(null);

  const parcelId = parcel?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!parcelId) return;
    if (!isRefresh) setLoading(true);
    try {
      const [idxRes, histRes, eudrRes] = await Promise.allSettled([
        satelliteAPI.getIndices(parcelId),
        satelliteAPI.getHistory(parcelId),
        eudrAPI.getFarmingAnalysis(parcelId),
      ]);

      if (idxRes.status === 'fulfilled') setIndices(idxRes.value.data);
      if (histRes.status === 'fulfilled') setHistory(histRes.value.data);
      if (eudrRes.status === 'fulfilled' && eudrRes.value.data?.status !== 'not_found') {
        setEudrAnalysis(eudrRes.value.data);
      }
    } catch (e) {
      console.warn('Parcel load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parcelId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const triggerEudrAnalysis = async () => {
    if (!parcelId) return;
    setAnalysing(true);
    try {
      await eudrAPI.triggerFarmingAnalysis(parcelId);
      // Poll every 15s for up to 3 minutes
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await eudrAPI.getFarmingAnalysis(parcelId);
          const d = res.data;
          if (d?.status !== 'queued' && d?.status !== 'running') {
            clearInterval(pollRef.current);
            setEudrAnalysis(d);
            setAnalysing(false);
          }
        } catch (_) {}
        if (attempts >= 12) {
          clearInterval(pollRef.current);
          setAnalysing(false);
          Alert.alert('Analysis timeout', 'The analysis is still running. Check back later.');
        }
      }, 15000);
    } catch (e) {
      setAnalysing(false);
      Alert.alert('Error', e.response?.data?.detail || 'Failed to trigger analysis.');
    }
  };

  const mapCoords = (() => {
    const raw = parcel?.polygon_coordinates || parcel?.coordinates || [];
    if (Array.isArray(raw) && raw.length > 0) {
      if (typeof raw[0] === 'object' && ('lat' in raw[0] || 'latitude' in raw[0])) {
        return raw.map((p) => ({ lat: p.lat ?? p.latitude, lng: p.lng ?? p.longitude }));
      }
      if (Array.isArray(raw[0])) {
        return raw.map((p) => ({ lat: p[1], lng: p[0] }));
      }
    }
    return [];
  })();

  const eudrStatus = eudrAnalysis?.eudr_status || parcel?.eudr_risk_level;
  const eudrColor_ = eudrColor(eudrStatus);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <Text style={s.heroTitle} numberOfLines={2}>
            {parcel?.parcel_name || parcel?.name || 'Parcel Detail'}
          </Text>
          <View style={s.heroMeta}>
            <Text style={s.heroMetaText}>
              {parcel?.area_ha ? `${Number(parcel.area_ha).toFixed(3)} ha` : ''}
              {parcel?.crop_type ? `  •  ${parcel.crop_type}` : ''}
            </Text>
            {eudrStatus && (
              <View style={[s.heroBadge, { backgroundColor: eudrColor_ + '30' }]}>
                <Text style={[s.heroBadgeText, { color: eudrColor_ }]}>{eudrStatus}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>

      {/* Mini map */}
      {mapCoords.length > 2 && (
        <View style={s.mapWrap}>
          <WebView
            source={{ html: MINI_MAP_HTML(mapCoords) }}
            style={s.map}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {['info', 'satellite', 'eudr'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tab, activeTab === t && s.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
              {t === 'info' ? 'Info' : t === 'satellite' ? 'Satellite' : 'EUDR'}
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
        {/* ── INFO ── */}
        {activeTab === 'info' && (
          <View style={s.section}>
            {[
              ['leaf-outline', 'Crop Type', parcel?.crop_type],
              ['resize-outline', 'Area', parcel?.area_ha ? `${Number(parcel.area_ha).toFixed(4)} ha` : null],
              ['trending-up-outline', 'Perimeter', parcel?.perimeter_m ? `${Number(parcel.perimeter_m / 1000).toFixed(2)} km` : null],
              ['location-outline', 'GPS Points', parcel?.points_count],
              ['calendar-outline', 'Captured', parcel?.created_at ? new Date(parcel.created_at).toLocaleDateString() : null],
              ['checkmark-circle-outline', 'Verified', parcel?.is_verified ? 'Yes' : 'No'],
            ].map(([icon, label, value]) => (
              <View key={label} style={s.infoRow}>
                <Ionicons name={icon} size={16} color={C.c600} style={{ marginRight: 10 }} />
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoValue}>{value || '—'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── SATELLITE ── */}
        {activeTab === 'satellite' && (
          <>
            {indices ? (
              <>
                <View style={s.section}>
                  <Text style={s.subHeader}>Current Indices</Text>
                  <IndexBar label="NDVI" value={indices.ndvi} min={-0.2} max={0.9} color="#22c55e" />
                  <IndexBar label="EVI" value={indices.evi} min={-0.2} max={0.8} color="#16a34a" />
                  <IndexBar label="SAVI" value={indices.savi} min={-0.2} max={0.8} color="#15803d" />
                  <IndexBar label="NDMI" value={indices.ndmi} min={-0.5} max={0.6} color="#0ea5e9" />
                  <IndexBar label="BSI" value={indices.bsi} min={-0.3} max={0.5} color="#f59e0b" />
                  <IndexBar label="NBR" value={indices.nbr} min={-0.3} max={0.9} color="#6366f1" />
                </View>

                {indices.classification && (
                  <View style={s.section}>
                    <Text style={s.subHeader}>Index Analysis</Text>
                    <View style={s.classRow}>
                      <Text style={s.classLabel}>Class</Text>
                      <Text style={s.classVal}>{indices.classification.replace(/_/g, ' ')}</Text>
                    </View>
                    <View style={s.classRow}>
                      <Text style={s.classLabel}>Confidence</Text>
                      <Text style={s.classVal}>{pct(indices.confidence)}</Text>
                    </View>
                    {indices.reasoning && (
                      <Text style={s.reasoning}>{indices.reasoning}</Text>
                    )}
                  </View>
                )}

                {indices.observation_date && (
                  <Text style={s.obsDate}>
                    Observed: {new Date(indices.observation_date).toLocaleDateString()}
                    {indices.cloud_cover_pct != null ? `  •  Cloud: ${Math.round(indices.cloud_cover_pct)}%` : ''}
                  </Text>
                )}
              </>
            ) : (
              <View style={s.emptyWrap}>
                <Ionicons name="satellite-outline" size={48} color={C.steel300} />
                <Text style={s.emptyTitle}>No satellite data</Text>
                <Text style={s.emptyMsg}>Satellite indices will appear after the first analysis run.</Text>
              </View>
            )}

            {/* History summary */}
            {history?.events && history.events.length > 0 && (
              <View style={s.section}>
                <Text style={s.subHeader}>Recent Events</Text>
                {history.events.slice(0, 5).map((ev, i) => (
                  <View key={i} style={s.eventRow}>
                    <View style={[s.eventDot, { backgroundColor: eudrColor(ev.event_type) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.eventType}>{(ev.event_type || '').replace(/_/g, ' ')}</Text>
                      <Text style={s.eventDate}>{ev.observed_at ? new Date(ev.observed_at).toLocaleDateString() : '—'}</Text>
                    </View>
                    <Text style={s.eventConf}>{pct(ev.confidence)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── EUDR ── */}
        {activeTab === 'eudr' && (
          <>
            {eudrAnalysis && eudrAnalysis.status !== 'not_found' ? (
              <>
                {/* Verdict */}
                <View style={[s.eudrVerdictCard, { borderColor: eudrColor_ }]}>
                  <Ionicons name="shield-checkmark-outline" size={32} color={eudrColor_} />
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={s.verdictLabel}>EUDR Verdict</Text>
                    <Text style={[s.verdictStatus, { color: eudrColor_ }]}>
                      {eudrAnalysis.eudr_status?.replace(/_/g, ' ') || 'Unknown'}
                    </Text>
                    {eudrAnalysis.eudr_summary && (
                      <Text style={s.verdictSummary}>{eudrAnalysis.eudr_summary}</Text>
                    )}
                  </View>
                </View>

                {/* Key dates */}
                <View style={s.section}>
                  <Text style={s.subHeader}>Key Dates</Text>
                  {[
                    ['calendar-outline', 'Farming Start', fmtDate(eudrAnalysis.farming_start_month), eudrAnalysis.farming_start_confidence],
                    ['earth-outline', 'Land Clearing', fmtDate(eudrAnalysis.land_clearing_month), eudrAnalysis.clearing_confidence],
                    ['analytics-outline', 'Analysed', eudrAnalysis.analysed_at ? new Date(eudrAnalysis.analysed_at).toLocaleDateString() : null, null],
                  ].map(([icon, label, value, conf]) => (
                    <View key={label} style={s.infoRow}>
                      <Ionicons name={icon} size={16} color={C.c600} style={{ marginRight: 10 }} />
                      <Text style={s.infoLabel}>{label}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.infoValue}>{value || '—'}</Text>
                        {conf != null && (
                          <Text style={s.confText}>{pct(conf)} confidence</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Hansen data */}
                {(eudrAnalysis.hansen_treecover2000 != null || eudrAnalysis.hansen_loss_year != null) && (
                  <View style={s.section}>
                    <Text style={s.subHeader}>Hansen Forest Data</Text>
                    <View style={s.infoRow}>
                      <Ionicons name="leaf-outline" size={16} color={C.c600} style={{ marginRight: 10 }} />
                      <Text style={s.infoLabel}>Tree Cover (2000)</Text>
                      <Text style={s.infoValue}>{eudrAnalysis.hansen_treecover2000 != null ? `${Math.round(eudrAnalysis.hansen_treecover2000)}%` : '—'}</Text>
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="warning-outline" size={16} color={C.c600} style={{ marginRight: 10 }} />
                      <Text style={s.infoLabel}>Loss Year</Text>
                      <Text style={s.infoValue}>{eudrAnalysis.hansen_loss_year ? `20${eudrAnalysis.hansen_loss_year}` : '—'}</Text>
                    </View>
                    <View style={s.infoRow}>
                      <Ionicons name="checkmark-circle-outline" size={16} color={C.c600} style={{ marginRight: 10 }} />
                      <Text style={s.infoLabel}>Was Forested</Text>
                      <Text style={s.infoValue}>{eudrAnalysis.hansen_was_forested == null ? '—' : eudrAnalysis.hansen_was_forested ? 'Yes' : 'No'}</Text>
                    </View>
                  </View>
                )}

                {/* Risk flags */}
                {eudrAnalysis.eudr_risk_flags && eudrAnalysis.eudr_risk_flags.length > 0 && (
                  <View style={s.section}>
                    <Text style={s.subHeader}>Risk Flags</Text>
                    {eudrAnalysis.eudr_risk_flags.map((f, i) => (
                      <View key={i} style={s.flagRow}>
                        <Ionicons name="warning-outline" size={15} color={C.eudrHigh} />
                        <Text style={s.flagText}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Re-analyse */}
                <TouchableOpacity
                  style={[s.analysisBtn, analysing && s.btnDisabled]}
                  onPress={triggerEudrAnalysis}
                  disabled={analysing}
                >
                  {analysing
                    ? <><ActivityIndicator color={C.white} size="small" /><Text style={s.analysisBtnText}> Analysing… (up to 2 min)</Text></>
                    : <><Ionicons name="refresh-outline" size={18} color={C.white} /><Text style={s.analysisBtnText}> Re-analyse Farming History</Text></>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.emptyWrap}>
                <Ionicons name="shield-outline" size={52} color={C.steel300} />
                <Text style={s.emptyTitle}>No EUDR analysis yet</Text>
                <Text style={s.emptyMsg}>
                  Run the farming history analysis to determine EUDR compliance for this parcel.
                </Text>
                <TouchableOpacity
                  style={[s.analysisBtn, analysing && s.btnDisabled]}
                  onPress={triggerEudrAnalysis}
                  disabled={analysing}
                >
                  {analysing
                    ? <><ActivityIndicator color={C.white} size="small" /><Text style={s.analysisBtnText}> Analysing…</Text></>
                    : <><Ionicons name="analytics-outline" size={18} color={C.white} /><Text style={s.analysisBtnText}> Analyse Farming History</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 10 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  heroMetaText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  heroBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  heroBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  mapWrap: { height: 180, backgroundColor: C.steel200 },
  map: { flex: 1 },

  tabs: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.subtle },
  tabTextActive: { color: C.c700 },

  scroll: { flex: 1 },
  content: { padding: 20 },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  subHeader: { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600', flex: 1 },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '700', textAlign: 'right' },
  confText: { fontSize: 10, color: C.subtle, marginTop: 2 },

  indexRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  indexLabel: { fontSize: 12, fontWeight: '700', color: C.steel700, width: 48 },
  indexTrack: { flex: 1, height: 8, backgroundColor: C.steel100, borderRadius: 4, marginHorizontal: 10, overflow: 'hidden' },
  indexFill: { height: '100%', borderRadius: 4 },
  indexVal: { fontSize: 12, fontWeight: '700', color: C.ink, width: 50, textAlign: 'right' },

  classRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  classLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  classVal: { fontSize: 14, color: C.ink, fontWeight: '700' },
  reasoning: { fontSize: 13, color: C.steel700, lineHeight: 20, marginTop: 10 },
  obsDate: { fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 10 },

  eventRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100, gap: 10 },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  eventType: { fontSize: 14, fontWeight: '700', color: C.ink, textTransform: 'capitalize' },
  eventDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  eventConf: { fontSize: 12, color: C.muted, fontWeight: '600' },

  eudrVerdictCard: { backgroundColor: C.white, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1.5, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  verdictLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  verdictStatus: { fontSize: 18, fontWeight: '800', textTransform: 'capitalize' },
  verdictSummary: { fontSize: 13, color: C.steel700, lineHeight: 20, marginTop: 6 },

  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  flagText: { flex: 1, fontSize: 13, color: C.steel700, lineHeight: 18 },

  analysisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.c700, borderRadius: 16, paddingVertical: 16, marginTop: 12, shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  analysisBtnText: { color: C.white, fontSize: 15, fontWeight: '800', marginLeft: 6 },

  emptyWrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
