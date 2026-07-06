import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI, eudrAPI } from '../services/api';
import { C } from '../theme';

// ── helpers ───────────────────────────────────────────────────────────────────
const riskColor = (s) => {
  if (!s) return C.subtle;
  const v = s.toUpperCase();
  if (v.includes('LOW') || (v.includes('COMPLIANT') && !v.includes('NON'))) return '#15803d';
  if (v.includes('MEDIUM') || v.includes('REVIEW') || v.includes('PENDING')) return '#d97706';
  if (v.includes('HIGH') || v.includes('NON') || v.includes('RISK')) return '#dc2626';
  return C.steel600;
};

const verifyStyle = (s) => {
  if (!s || s === 'draft')     return { color: C.steel600, bg: C.steel100 };
  if (s === 'admin_approved')  return { color: '#15803d',  bg: '#dcfce7' };
  if (s === 'coop_approved')   return { color: '#1d4ed8',  bg: '#dbeafe' };
  if (s === 'pending')         return { color: '#b45309',  bg: '#fef3c7' };
  if (s === 'rejected')        return { color: '#dc2626',  bg: '#fee2e2' };
  return { color: C.steel600, bg: C.steel100 };
};

const cap  = (s) => s ? String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
const fmtN = (n, d = 2) => n != null ? Number(n).toFixed(d) : null;
const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return null; }
};

// ── build Leaflet HTML for parcel boundaries ──────────────────────────────────
function buildMapHtml(parcels) {
  const features = [];
  for (const p of parcels) {
    if (!p.boundary_geojson) continue;
    try {
      const raw = typeof p.boundary_geojson === 'string' ? JSON.parse(p.boundary_geojson) : p.boundary_geojson;
      const geom = raw.type === 'Feature' ? raw.geometry : raw;
      if (geom) features.push({ type: 'Feature', properties: { name: p.parcel_name || 'Parcel' }, geometry: geom });
    } catch (_) {}
  }
  if (!features.length) return null;
  const fc = JSON.stringify({ type: 'FeatureCollection', features });
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{margin:0;padding:0;height:100%;background:#1a1a1a;}</style>
</head><body><div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20}).addTo(map);
var fc=${fc};
var layer=L.geoJSON(fc,{style:{color:'#4ade80',weight:2.5,fillColor:'#4ade80',fillOpacity:0.18}}).addTo(map);
map.fitBounds(layer.getBounds(),{padding:[16,16]});
</script></body></html>`;
}

// ── reusable sub-components ───────────────────────────────────────────────────
const SectionCard = ({ title, icon, color, children }) => (
  <View style={s.sectionCard}>
    <View style={s.sectionCardHeader}>
      <Ionicons name={icon} size={15} color={color || C.c600} />
      <Text style={[s.sectionCardTitle, color && { color }]}>{title}</Text>
    </View>
    {children}
  </View>
);

const Row = ({ label, value, mono, badge, bColor, bBg, last }) => {
  if (value == null || value === '') return null;
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      {badge ? (
        <View style={[s.rowBadge, { backgroundColor: bBg || C.steel100 }]}>
          <Text style={[s.rowBadgeText, { color: bColor || C.steel600 }]}>{value}</Text>
        </View>
      ) : (
        <Text style={[s.rowValue, mono && s.rowMono]} numberOfLines={2}>{value}</Text>
      )}
    </View>
  );
};

const ScoreBar = ({ label, value, max = 1, color }) => {
  const pct = max > 0 ? Math.min(Number(value) / max, 1) : 0;
  return (
    <View style={s.scoreRow}>
      <Text style={s.scoreLabel}>{label}</Text>
      <View style={s.scoreTrack}>
        <View style={[s.scoreFill, { width: `${pct * 100}%`, backgroundColor: color || C.c600 }]} />
      </View>
      <Text style={[s.scoreVal, { color: color || C.c600 }]}>{Number(value).toFixed(3)}</Text>
    </View>
  );
};

// ── main screen ───────────────────────────────────────────────────────────────
export default function FarmDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { farm: initialFarm, openTab } = route.params || {};

  const [farm,           setFarm]           = useState(initialFarm || null);
  const [parcels,        setParcels]        = useState(initialFarm?.parcels || []);
  const [eudrData,       setEudrData]       = useState(null);
  const [satHistory,     setSatHistory]     = useState([]);
  const [farmingAnalysis,setFarmingAnalysis]= useState(null);
  const [loading,        setLoading]        = useState(!initialFarm);
  const [refreshing,     setRefreshing]     = useState(false);
  const [activeTab,      setActiveTab]      = useState(openTab || 'info');
  const [expandedParcel, setExpandedParcel] = useState(null);

  const farmId = farm?.id;

  const load = useCallback(async (isRefresh = false) => {
    if (!farmId) return;
    if (!isRefresh) setLoading(true);
    try {
      const [farmRes, parcelsRes, eudrRes, satRes] = await Promise.allSettled([
        (!initialFarm || isRefresh) ? farmerAPI.getFarm(farmId) : Promise.resolve({ data: initialFarm }),
        farmerAPI.getParcels(farmId),
        eudrAPI.getFarmCompliance(farmId),
        farmerAPI.getSatelliteHistory(farmId),
      ]);
      if (farmRes.status === 'fulfilled') setFarm(farmRes.value.data);
      if (parcelsRes.status === 'fulfilled') {
        const d = parcelsRes.value.data;
        const ps = Array.isArray(d) ? d : (d?.parcels || []);
        setParcels(ps);
        if (ps.length > 0 && ps[0].id) {
          eudrAPI.getFarmingAnalysis(ps[0].id)
            .then(r => setFarmingAnalysis(r.data))
            .catch(() => {});
        }
      }
      if (eudrRes.status === 'fulfilled') setEudrData(eudrRes.value.data);
      if (satRes.status === 'fulfilled') {
        const d = satRes.value.data;
        setSatHistory(Array.isArray(d) ? d.slice(0, 12) : (d?.observations?.slice(0, 12) || []));
      }
    } catch (e) {
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

  const vc       = verifyStyle(farm?.verification_status);
  const rc       = riskColor(farm?.compliance_status || eudrData?.risk_level);
  const mapHtml  = buildMapHtml(parcels);
  const areaHa   = farm?.total_area_hectares;

  const TABS = [
    { key: 'info',     label: 'Farm Info',          icon: 'information-circle-outline' },
    { key: 'parcels',  label: `Parcels (${parcels.length})`, icon: 'map-outline' },
    { key: 'analysis', label: 'EUDR',               icon: 'shield-checkmark-outline' },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroNav}>
            <TouchableOpacity style={s.heroBack} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color={C.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.heroCapBtn}
              onPress={() => navigation.navigate('CaptureMode', { farmId: farm?.farm_code || farmId, farm })}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={15} color={C.white} />
              <Text style={s.heroCapBtnText}>Capture Boundary</Text>
            </TouchableOpacity>
          </View>

          <View style={s.heroTitleRow}>
            <Text style={s.heroTitle} numberOfLines={2}>{farm?.farm_name || 'Farm Details'}</Text>
            <View style={[s.heroBadge, { backgroundColor: vc.bg + 'dd' }]}>
              <Text style={[s.heroBadgeText, { color: vc.color }]}>{cap(farm?.verification_status) || 'Draft'}</Text>
            </View>
          </View>

          {!!farm?.farm_code && (
            <View style={s.farmCodeRow}>
              <Ionicons name="barcode-outline" size={13} color="rgba(255,255,255,0.6)" />
              <Text style={s.farmCodeText}>{farm.farm_code}</Text>
            </View>
          )}

          <View style={s.heroStats}>
            {[
              { val: areaHa ? `${Number(areaHa).toFixed(2)} ha` : '—', lbl: 'Total Area' },
              { val: farm?.coffee_area_hectares ? `${Number(farm.coffee_area_hectares).toFixed(2)} ha` : '—', lbl: 'Coffee Area' },
              { val: String(parcels.length), lbl: 'Parcels' },
              { val: cap(farm?.compliance_status || eudrData?.risk_level) || '—', lbl: 'EUDR Risk', color: rc },
            ].map((st, i, arr) => (
              <React.Fragment key={st.lbl}>
                <View style={s.heroStat}>
                  <Text style={[s.heroStatVal, st.color && { color: st.color, fontSize: 12 }]} numberOfLines={1}>{st.val}</Text>
                  <Text style={s.heroStatLbl}>{st.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={s.heroSep} />}
              </React.Fragment>
            ))}
          </View>
        </SafeAreaView>
      </View>

      {/* ── Boundary Map ─────────────────────────────────────── */}
      {!!mapHtml && (
        <View style={s.mapWrap}>
          <WebView source={{ html: mapHtml }} style={s.map} scrollEnabled={false} javaScriptEnabled />
          <View style={s.mapLabel}>
            <Ionicons name="earth-outline" size={11} color={C.white} />
            <Text style={s.mapLabelText}>Farm Boundary · Satellite</Text>
          </View>
        </View>
      )}

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <View style={s.tabs}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, activeTab === t.key && s.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Ionicons name={t.icon} size={14} color={activeTab === t.key ? C.c700 : C.subtle} />
            <Text style={[s.tabText, activeTab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >

        {/* ══════════════ FARM INFO TAB ══════════════ */}
        {activeTab === 'info' && (
          <>
            {/* Verification status banner */}
            <View style={[s.statusBanner, { backgroundColor: vc.bg, borderColor: vc.color + '40' }]}>
              <Ionicons name={
                farm?.verification_status === 'admin_approved' ? 'checkmark-circle' :
                farm?.verification_status === 'rejected' ? 'close-circle' : 'time-outline'
              } size={20} color={vc.color} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.statusBannerTitle, { color: vc.color }]}>{cap(farm?.verification_status) || 'Draft'}</Text>
                <Text style={s.statusBannerSub}>Verification status for this farm</Text>
              </View>
            </View>

            {/* Farmer Identity */}
            <SectionCard title="Farmer Identity" icon="person-circle-outline">
              <Row label="Full Name"     value={farm?.farmer_name} />
              <Row label="Phone"         value={farm?.farmer_phone} />
              <Row label="National ID"   value={farm?.farmer_national_id} mono />
              <Row label="Gender"        value={cap(farm?.farmer_gender)} />
              <Row label="Location"      value={farm?.farmer_location} />
              <Row label="Coop Member No." value={farm?.coop_member_no} mono />
              <Row label="Registered"    value={fmtDate(farm?.created_at)} last />
            </SectionCard>

            {/* Farm Details */}
            <SectionCard title="Farm Details" icon="leaf-outline">
              <Row label="Farm Name"     value={farm?.farm_name} />
              <Row label="Farm Code"     value={farm?.farm_code} mono />
              <Row label="County"        value={farm?.county || farm?.farmer_location} />
              <Row label="Total Area"    value={areaHa ? `${Number(areaHa).toFixed(4)} ha` : null} />
              <Row label="Coffee Area"   value={farm?.coffee_area_hectares ? `${Number(farm.coffee_area_hectares).toFixed(4)} ha` : null} />
              <Row label="Land Use"      value={cap(farm?.land_use_type)} />
              <Row label="GPS Centroid"
                value={farm?.centroid_lat ? `${Number(farm.centroid_lat).toFixed(6)}, ${Number(farm.centroid_lon).toFixed(6)}` : null}
                mono />
              <Row label="Verification"  value={cap(farm?.verification_status) || 'Draft'} badge bColor={vc.color} bBg={vc.bg} last />
            </SectionCard>

            {/* Coffee & Production */}
            <SectionCard title="Coffee & Production" icon="cafe-outline">
              <Row label="Coffee Varieties"  value={farm?.coffee_varieties?.length ? farm.coffee_varieties.join(', ') : null} />
              <Row label="Farming Method"    value={cap(farm?.land_use_type)} />
              <Row label="Years Farming"     value={farm?.years_farming ? `${farm.years_farming} years` : null} />
              <Row label="Annual Yield"      value={farm?.average_annual_production_kg ? `${Number(farm.average_annual_production_kg).toLocaleString()} kg` : null} last />
            </SectionCard>

            {/* EUDR & Compliance */}
            <SectionCard title="EUDR & Compliance" icon="shield-checkmark-outline" color={rc}>
              <Row label="Compliance Status"
                value={cap(farm?.compliance_status || 'Under Review')}
                badge bColor={rc} bBg={rc + '18'} />
              {farm?.deforestation_risk_score != null && (
                <>
                  <Row label="Deforestation Risk Score" value={`${(Number(farm.deforestation_risk_score) * 100).toFixed(1)}%`} />
                  <View style={s.riskBarWrap}>
                    <View style={[s.riskBarFill, { width: `${Math.min(Number(farm.deforestation_risk_score) * 100, 100)}%`, backgroundColor: rc }]} />
                  </View>
                </>
              )}
              <Row label="Parcels Captured" value={parcels.length > 0 ? `${parcels.filter(p => p.boundary_geojson).length} of ${parcels.length}` : null} last />
            </SectionCard>
          </>
        )}

        {/* ══════════════ PARCELS TAB ══════════════ */}
        {activeTab === 'parcels' && (
          <>
            {parcels.length === 0 ? (
              <View style={s.emptyWrap}>
                <Ionicons name="map-outline" size={52} color={C.steel300} />
                <Text style={s.emptyTitle}>No parcels yet</Text>
                <Text style={s.emptyMsg}>Capture a boundary to create the first parcel.</Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => navigation.navigate('CaptureMode', { farmId: farm?.farm_code || farmId, farm })}
                  activeOpacity={0.8}
                >
                  <Text style={s.emptyBtnText}>Capture Boundary</Text>
                </TouchableOpacity>
              </View>
            ) : (
              parcels.map((p, idx) => {
                const open  = expandedParcel === p.id;
                const pvc   = verifyStyle(p.verification_status);
                const hasGeo = !!p.boundary_geojson;
                return (
                  <View key={p.id || idx} style={s.parcelCard}>
                    {/* Parcel header — tap to expand */}
                    <TouchableOpacity
                      style={s.parcelHeader}
                      onPress={() => setExpandedParcel(open ? null : p.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.parcelIdx, { backgroundColor: hasGeo ? C.c100 : C.steel100 }]}>
                        <Text style={[s.parcelIdxText, { color: hasGeo ? C.c700 : C.steel500 }]}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.parcelName} numberOfLines={1}>
                          {p.parcel_name || p.parcel_number || `Parcel ${idx + 1}`}
                        </Text>
                        <Text style={s.parcelMeta}>
                          {p.area_hectares ? `${Number(p.area_hectares).toFixed(3)} ha` : '—'}
                          {p.land_use_type ? `  ·  ${cap(p.land_use_type)}` : ''}
                          {hasGeo ? '  ·  Boundary captured' : '  ·  No boundary'}
                        </Text>
                      </View>
                      <View style={s.parcelHeaderRight}>
                        <View style={[s.miniBadge, { backgroundColor: pvc.bg }]}>
                          <Text style={[s.miniBadgeText, { color: pvc.color }]}>{cap(p.verification_status) || 'Draft'}</Text>
                        </View>
                        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={C.subtle} style={{ marginTop: 4 }} />
                      </View>
                    </TouchableOpacity>

                    {/* Expanded parcel details */}
                    {open && (
                      <View style={s.parcelBody}>
                        {/* Land & Boundary */}
                        <Text style={s.parcelSectionTitle}>Land & Boundary</Text>
                        <View style={s.parcelSection}>
                          <Row label="Area"             value={fmtN(p.area_hectares, 4) ? `${fmtN(p.area_hectares, 4)} ha` : null} />
                          <Row label="Coffee Area"      value={fmtN(p.coffee_area_hectares, 4) ? `${fmtN(p.coffee_area_hectares, 4)} ha` : null} />
                          <Row label="Land Use"         value={cap(p.land_use_type)} />
                          <Row label="Ownership"        value={cap(p.ownership_type)} />
                          <Row label="Soil Type"        value={cap(p.soil_type)} />
                          <Row label="GPS Accuracy"     value={p.gps_accuracy_meters ? `${Number(p.gps_accuracy_meters).toFixed(1)} m` : null} />
                          <Row label="Mapping Date"     value={fmtDate(p.mapping_date)} last />
                        </View>

                        {/* Terrain */}
                        <Text style={s.parcelSectionTitle}>Terrain & Vegetation</Text>
                        <View style={s.parcelSection}>
                          <Row label="Altitude"         value={p.altitude_meters ? `${p.altitude_meters} m asl` : null} />
                          <Row label="Slope"            value={p.slope_degrees ? `${p.slope_degrees}°` : null} />
                          <Row label="Canopy Cover"     value={p.canopy_cover ? `${p.canopy_cover}%` : null} />
                          <Row label="NDVI Baseline"    value={p.ndvi_baseline != null ? Number(p.ndvi_baseline).toFixed(4) : null} mono last />
                        </View>

                        {/* Coffee */}
                        <Text style={s.parcelSectionTitle}>Coffee Cultivation</Text>
                        <View style={s.parcelSection}>
                          <Row label="Est. Coffee Plants" value={p.estimated_coffee_plants != null ? Number(p.estimated_coffee_plants).toLocaleString() : null} />
                          <Row label="Irrigation"       value={cap(p.irrigation_type)} />
                          <Row label="Planting Method"  value={cap(p.planting_method)} />
                          <Row label="Mixed Farming"    value={p.practice_mixed_farming === 1 ? 'Yes' : p.practice_mixed_farming === 0 ? 'No' : null} />
                          <Row label="Other Crops"      value={Array.isArray(p.other_crops) ? p.other_crops.join(', ') : p.other_crops || null} last />
                        </View>

                        {/* Advanced */}
                        <Text style={s.parcelSectionTitle}>Advanced</Text>
                        <View style={s.parcelSection}>
                          <Row label="Agroforestry Start" value={p.agroforestry_start_year ? String(p.agroforestry_start_year) : null} />
                          <Row label="Previous Land Use" value={cap(p.previous_land_use)} />
                          <Row label="Programme Support" value={p.programme_support ? String(p.programme_support) : null} />
                          <Row label="Parcel No."       value={p.parcel_number} mono last />
                        </View>

                        <TouchableOpacity
                          style={s.parcelDetailBtn}
                          onPress={() => navigation.navigate('ParcelDetail', { parcel: p, farmId })}
                          activeOpacity={0.8}
                        >
                          <Text style={s.parcelDetailBtnText}>View Full Parcel Analysis</Text>
                          <Ionicons name="arrow-forward" size={14} color={C.c700} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ══════════════ ANALYSIS / EUDR TAB ══════════════ */}
        {activeTab === 'analysis' && (
          <>
            {/* Overall EUDR verdict banner */}
            <View style={[s.eudrBanner, { borderColor: rc, backgroundColor: rc + '12' }]}>
              <View style={[s.eudrBannerIcon, { backgroundColor: rc + '22' }]}>
                <Ionicons name="shield-checkmark-outline" size={28} color={rc} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={s.eudrBannerLabel}>EUDR Compliance Status</Text>
                <Text style={[s.eudrBannerValue, { color: rc }]}>
                  {cap(farm?.compliance_status || eudrData?.risk_level || 'Under Review')}
                </Text>
                {!!eudrData?.summary && (
                  <Text style={s.eudrBannerSummary}>{eudrData.summary}</Text>
                )}
              </View>
            </View>

            {/* Two-question EUDR verdict cards */}
            <View style={s.twoCardRow}>
              {/* Q1: Farming before Dec 2020 */}
              <View style={s.verdictCard}>
                <Ionicons name="calendar-outline" size={22} color={C.c700} />
                <Text style={s.verdictCardQ}>Farming before{'\n'}Dec 2020?</Text>
                {(() => {
                  const val = farmingAnalysis?.farming_pre_2020 ?? farmingAnalysis?.farming_detected;
                  const col = val === true ? '#15803d' : val === false ? '#dc2626' : '#b45309';
                  const lbl = val === true ? 'YES' : val === false ? 'NO' : 'UNKNOWN';
                  return (
                    <>
                      <Text style={[s.verdictCardAns, { color: col }]}>{lbl}</Text>
                      {!!farmingAnalysis?.farming_start_date && (
                        <Text style={s.verdictCardSub}>Detected: {farmingAnalysis.farming_start_date}</Text>
                      )}
                      {!!farmingAnalysis?.farming_confidence && (
                        <View style={[s.confBadge, { backgroundColor: col + '18' }]}>
                          <Text style={[s.confBadgeText, { color: col }]}>
                            {String(farmingAnalysis.farming_confidence).toUpperCase()} confidence
                          </Text>
                        </View>
                      )}
                      {!farmingAnalysis && (
                        <Text style={s.verdictCardSub}>No analysis data</Text>
                      )}
                    </>
                  );
                })()}
                {!!farmingAnalysis?.data_source && (
                  <Text style={s.verdictCardSource}>{farmingAnalysis.data_source}</Text>
                )}
              </View>

              {/* Q2: Forest cleared */}
              <View style={s.verdictCard}>
                <Ionicons name="warning-outline" size={22} color="#dc2626" />
                <Text style={s.verdictCardQ}>Forest cleared{'\n'}for this farm?</Text>
                {(() => {
                  const val = farmingAnalysis?.forest_cleared ?? farmingAnalysis?.deforestation_detected;
                  const col = val === true ? '#dc2626' : val === false ? '#15803d' : '#b45309';
                  const lbl = val === true ? 'YES' : val === false ? 'NO' : 'UNKNOWN';
                  return (
                    <>
                      <Text style={[s.verdictCardAns, { color: col }]}>{lbl}</Text>
                      {farmingAnalysis?.forest_loss_year ? (
                        <Text style={s.verdictCardSub}>Hansen loss: {farmingAnalysis.forest_loss_year}</Text>
                      ) : farmingAnalysis?.treecover_2000 != null ? (
                        <Text style={s.verdictCardSub}>Treecover 2000: {farmingAnalysis.treecover_2000}%</Text>
                      ) : null}
                      {!farmingAnalysis && (
                        <Text style={s.verdictCardSub}>No analysis data</Text>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>

            {/* Risk flags */}
            {eudrData?.risk_flags?.length > 0 && (
              <SectionCard title="Risk Flags" icon="warning-outline" color="#dc2626">
                {eudrData.risk_flags.map((flag, i) => (
                  <View key={i} style={[s.flagRow, i < eudrData.risk_flags.length - 1 && s.rowBorder]}>
                    <Ionicons name="warning-outline" size={14} color="#dc2626" />
                    <Text style={s.flagText}>{flag}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {/* Evidence breakdown */}
            {farmingAnalysis?.evidence && Object.keys(farmingAnalysis.evidence).length > 0 && (
              <SectionCard title="Evidence Breakdown" icon="analytics-outline">
                <View style={s.evidenceTableHeader}>
                  <Text style={[s.evidenceTh, { flex: 2 }]}>Source / Signal</Text>
                  <Text style={[s.evidenceTh, { flex: 1, textAlign: 'center' }]}>Confidence</Text>
                  <Text style={[s.evidenceTh, { flex: 0.6, textAlign: 'right' }]}>Result</Text>
                </View>
                {Object.entries(farmingAnalysis.evidence).map(([key, val], i, arr) => {
                  const obj = typeof val === 'object' && val !== null ? val : {};
                  const conf = obj.confidence || obj.level || '—';
                  const result = obj.verdict ?? obj.result ?? (typeof val === 'boolean' ? (val ? '✓' : '✗') : '—');
                  const resultColor = result === '✓' || result === true || String(result).toLowerCase() === 'pass' ? '#15803d' : result === '✗' || result === false || String(result).toLowerCase() === 'fail' ? '#dc2626' : C.steel600;
                  return (
                    <View key={i} style={[s.evidenceRow, i < arr.length - 1 && s.rowBorder]}>
                      <View style={{ flex: 2 }}>
                        <Text style={s.evidenceKey}>{cap(key)}</Text>
                        {!!obj.detail && <Text style={s.evidenceDetail} numberOfLines={2}>{obj.detail}</Text>}
                      </View>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        {conf !== '—' && (
                          <View style={[s.confBadge, { backgroundColor: C.steel100 }]}>
                            <Text style={[s.confBadgeText, { color: C.steel600 }]}>{String(conf).toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.evidenceResult, { flex: 0.6, textAlign: 'right', color: resultColor }]}>
                        {String(result)}
                      </Text>
                    </View>
                  );
                })}
              </SectionCard>
            )}

            {/* Spectral index scores */}
            {farmingAnalysis?.index_scores && (
              <SectionCard title="Spectral Index Scores" icon="bar-chart-outline">
                {farmingAnalysis.index_scores.ndvi  != null && <ScoreBar label="NDVI"  value={farmingAnalysis.index_scores.ndvi}  color="#16a34a" />}
                {farmingAnalysis.index_scores.evi   != null && <ScoreBar label="EVI"   value={farmingAnalysis.index_scores.evi}   color="#0891b2" />}
                {farmingAnalysis.index_scores.savi  != null && <ScoreBar label="SAVI"  value={farmingAnalysis.index_scores.savi}  color="#ea580c" />}
                {farmingAnalysis.index_scores.bsi   != null && <ScoreBar label="BSI"   value={farmingAnalysis.index_scores.bsi}   color="#dc2626" max={0.5} />}
                {farmingAnalysis.index_scores.nbr   != null && <ScoreBar label="NBR"   value={farmingAnalysis.index_scores.nbr}   color="#7c3aed" />}
                {farmingAnalysis.index_scores.ndmi  != null && <ScoreBar label="NDMI"  value={farmingAnalysis.index_scores.ndmi}  color="#0e7490" />}
              </SectionCard>
            )}

            {/* Land use derived scores */}
            {farmingAnalysis?.land_scores && (
              <SectionCard title="Land Use Scores (EUDR Basis)" icon="layers-outline">
                {farmingAnalysis.land_scores.crop_score     != null && <ScoreBar label="Crop Score"    value={farmingAnalysis.land_scores.crop_score}    color="#16a34a" />}
                {farmingAnalysis.land_scores.forest_score   != null && <ScoreBar label="Forest Score"  value={farmingAnalysis.land_scores.forest_score}  color="#166534" />}
                {farmingAnalysis.land_scores.bare_score     != null && <ScoreBar label="Bare Score"    value={farmingAnalysis.land_scores.bare_score}    color="#d97706" />}
                {farmingAnalysis.land_scores.disturbance    != null && <ScoreBar label="Disturbance"   value={farmingAnalysis.land_scores.disturbance}   color="#dc2626" />}
              </SectionCard>
            )}

            {/* Satellite observation history */}
            {satHistory.length > 0 && (
              <SectionCard title={`Satellite Observations (${satHistory.length})`} icon="telescope-outline">
                <View style={s.satHeader}>
                  <Text style={[s.satTh, { flex: 2 }]}>Date / Source</Text>
                  <Text style={[s.satTh, { flex: 1, textAlign: 'center' }]}>NDVI</Text>
                  <Text style={[s.satTh, { flex: 1, textAlign: 'center' }]}>Canopy</Text>
                  <Text style={[s.satTh, { flex: 1, textAlign: 'right' }]}>Risk</Text>
                </View>
                {satHistory.map((obs, i) => {
                  const obsRisk = riskColor(obs.risk_level || (obs.risk_score > 0.6 ? 'high' : obs.risk_score > 0.3 ? 'medium' : 'low'));
                  return (
                    <View key={i} style={[s.satRow, i < satHistory.length - 1 && s.rowBorder]}>
                      <View style={{ flex: 2 }}>
                        <Text style={s.satDate}>{fmtDate(obs.acquisition_date)}</Text>
                        <Text style={s.satSource}>{obs.satellite_source || 'Sentinel-2'}</Text>
                      </View>
                      <Text style={[s.satVal, { flex: 1, textAlign: 'center' }]}>
                        {obs.ndvi_mean != null ? Number(obs.ndvi_mean).toFixed(3) : '—'}
                      </Text>
                      <Text style={[s.satVal, { flex: 1, textAlign: 'center' }]}>
                        {obs.canopy_cover_percentage != null ? `${Number(obs.canopy_cover_percentage).toFixed(1)}%` : '—'}
                      </Text>
                      <Text style={[s.satVal, { flex: 1, textAlign: 'right', color: obsRisk, fontWeight: '700' }]}>
                        {obs.risk_score != null ? `${(Number(obs.risk_score) * 100).toFixed(0)}%` : '—'}
                      </Text>
                    </View>
                  );
                })}
              </SectionCard>
            )}

            {/* Per-parcel EUDR status */}
            {parcels.length > 0 && (
              <SectionCard title="Parcel EUDR Status" icon="map-outline">
                {parcels.map((p, i) => {
                  const prc = riskColor(p.eudr_risk_level || p.compliance_status);
                  return (
                    <TouchableOpacity
                      key={p.id || i}
                      style={[s.eudrParcelRow, i < parcels.length - 1 && s.rowBorder]}
                      onPress={() => navigation.navigate('ParcelDetail', { parcel: p, farmId })}
                      activeOpacity={0.8}
                    >
                      <View style={[s.parcelIdx, { backgroundColor: C.steel100, width: 28, height: 28, borderRadius: 8 }]}>
                        <Text style={[s.parcelIdxText, { color: C.steel600, fontSize: 11 }]}>{i + 1}</Text>
                      </View>
                      <Text style={s.eudrParcelName} numberOfLines={1}>
                        {p.parcel_name || p.parcel_number || `Parcel ${i + 1}`}
                      </Text>
                      {p.area_hectares && (
                        <Text style={s.eudrParcelArea}>{Number(p.area_hectares).toFixed(2)} ha</Text>
                      )}
                      <Text style={[s.eudrParcelRisk, { color: prc }]}>
                        {cap(p.eudr_risk_level || p.compliance_status) || 'Pending'}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={C.subtle} />
                    </TouchableOpacity>
                  );
                })}
              </SectionCard>
            )}

            {/* Empty state */}
            {!eudrData && !farmingAnalysis && satHistory.length === 0 && (
              <View style={s.emptyWrap}>
                <Ionicons name="analytics-outline" size={52} color={C.steel300} />
                <Text style={s.emptyTitle}>No satellite analysis yet</Text>
                <Text style={s.emptyMsg}>Capture the farm boundary first. Satellite analysis runs automatically via the Plotra platform.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },

  // Hero
  hero:           { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 24 },
  heroNav:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  heroBack:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroCapBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  heroCapBtnText: { color: C.white, fontSize: 13, fontWeight: '700' },
  heroTitleRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  heroTitle:      { flex: 1, fontSize: 22, fontWeight: '800', color: C.white },
  heroBadge:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 4 },
  heroBadgeText:  { fontSize: 11, fontWeight: '800' },
  farmCodeRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  farmCodeText:   { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '700', fontFamily: 'monospace' },
  heroStats:      { flexDirection: 'row', alignItems: 'center' },
  heroStat:       { flex: 1, alignItems: 'center' },
  heroStatVal:    { fontSize: 17, fontWeight: '800', color: C.white },
  heroStatLbl:    { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },
  heroSep:        { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },

  // Map
  mapWrap:      { height: 180, backgroundColor: '#111' },
  map:          { flex: 1 },
  mapLabel:     { position: 'absolute', bottom: 8, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  mapLabelText: { fontSize: 10, color: C.white, fontWeight: '600' },

  // Tabs
  tabs:         { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 13, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: C.c700 },
  tabText:      { fontSize: 11, fontWeight: '700', color: C.subtle },
  tabTextActive:{ color: C.c700 },

  scroll:   { flex: 1 },
  content:  { padding: 16, paddingTop: 16 },

  // Status banner
  statusBanner:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 14 },
  statusBannerTitle: { fontSize: 14, fontWeight: '800' },
  statusBannerSub:   { fontSize: 12, color: C.muted, marginTop: 2 },

  // Section card
  sectionCard:       { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionCardTitle:  { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.6 },

  // Row
  row:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  rowLabel:     { fontSize: 13, color: C.muted, fontWeight: '600', flex: 1 },
  rowValue:     { fontSize: 13, color: C.ink, fontWeight: '700', textAlign: 'right', flex: 1 },
  rowMono:      { fontFamily: 'monospace', fontSize: 12 },
  rowBadge:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  rowBadgeText: { fontSize: 11, fontWeight: '800' },
  rowIcon:      { marginRight: 8 },

  // Risk bar
  riskBarWrap: { height: 6, backgroundColor: C.steel100, borderRadius: 4, marginTop: 6, marginBottom: 6, overflow: 'hidden' },
  riskBarFill: { height: '100%', borderRadius: 4 },

  // Score bar
  scoreRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  scoreLabel: { fontSize: 12, color: C.ink, fontWeight: '600', width: 48 },
  scoreTrack: { flex: 1, height: 8, backgroundColor: C.steel100, borderRadius: 6, overflow: 'hidden' },
  scoreFill:  { height: '100%', borderRadius: 6 },
  scoreVal:   { fontSize: 12, fontWeight: '800', width: 52, textAlign: 'right' },

  // Parcels
  parcelCard:        { backgroundColor: C.white, borderRadius: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  parcelHeader:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  parcelIdx:         { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  parcelIdxText:     { fontSize: 13, fontWeight: '900' },
  parcelName:        { fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 3 },
  parcelMeta:        { fontSize: 11, color: C.muted, fontWeight: '500' },
  parcelHeaderRight: { alignItems: 'flex-end', gap: 4 },
  miniBadge:         { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  miniBadgeText:     { fontSize: 9, fontWeight: '800' },
  parcelBody:        { borderTopWidth: 1, borderTopColor: C.steel100, paddingHorizontal: 16, paddingBottom: 14 },
  parcelSectionTitle:{ fontSize: 10, fontWeight: '800', color: C.steel500, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  parcelSection:     { backgroundColor: C.steel100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  parcelDetailBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.c700 },
  parcelDetailBtnText:{ fontSize: 13, fontWeight: '800', color: C.c700 },

  // EUDR banner
  eudrBanner:      { flexDirection: 'row', alignItems: 'flex-start', borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  eudrBannerIcon:  { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  eudrBannerLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  eudrBannerValue: { fontSize: 18, fontWeight: '800' },
  eudrBannerSummary:{ fontSize: 12, color: C.steel600, marginTop: 8, lineHeight: 18 },

  // Two-question verdict
  twoCardRow:      { flexDirection: 'row', gap: 10, marginBottom: 14 },
  verdictCard:     { flex: 1, backgroundColor: C.white, borderRadius: 16, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  verdictCardQ:    { fontSize: 12, fontWeight: '700', color: C.steel700, marginTop: 8, marginBottom: 6, lineHeight: 16 },
  verdictCardAns:  { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  verdictCardSub:  { fontSize: 10, color: C.muted, lineHeight: 14, marginBottom: 4 },
  verdictCardSource:{ fontSize: 9, color: C.subtle, marginTop: 4 },

  confBadge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  confBadgeText: { fontSize: 9, fontWeight: '800' },

  // Risk flags
  flagRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  flagText: { flex: 1, fontSize: 13, color: C.steel700, lineHeight: 18 },

  // Evidence table
  evidenceTableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.steel200, marginBottom: 4 },
  evidenceTh:   { fontSize: 10, fontWeight: '800', color: C.steel500, textTransform: 'uppercase', letterSpacing: 0.4 },
  evidenceRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  evidenceKey:  { fontSize: 12, fontWeight: '700', color: C.ink, marginBottom: 2 },
  evidenceDetail:{ fontSize: 11, color: C.muted, lineHeight: 15 },
  evidenceResult:{ fontSize: 13, fontWeight: '800' },

  // Satellite table
  satHeader:  { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.steel200, marginBottom: 4 },
  satTh:      { fontSize: 10, fontWeight: '800', color: C.steel500, textTransform: 'uppercase', letterSpacing: 0.4 },
  satRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  satDate:    { fontSize: 13, fontWeight: '700', color: C.ink },
  satSource:  { fontSize: 10, color: C.muted, marginTop: 1 },
  satVal:     { fontSize: 13, color: C.ink, fontWeight: '600' },

  // Parcel EUDR row
  eudrParcelRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  eudrParcelName: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },
  eudrParcelArea: { fontSize: 11, color: C.muted, fontWeight: '600' },
  eudrParcelRisk: { fontSize: 12, fontWeight: '800', marginLeft: 4 },

  // Empty
  emptyWrap:  { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg:   { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 20 },
  emptyBtn:   { marginTop: 20, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText:{ color: C.white, fontWeight: '800', fontSize: 14 },
});
