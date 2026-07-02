import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mobileAPI, polygonAPI, farmerAPI } from '../services/api';
import { dbService } from '../services/database';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh;background:#f1f5f9}.leaflet-control-attribution{display:none}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='polygon'){
      var coords=d.coords.map(function(c){return[c.latitude,c.longitude];});
      var poly=L.polygon(coords,{color:'#fff',fillColor:'#16a34a',fillOpacity:0.5,weight:3}).addTo(map);
      map.fitBounds(poly.getBounds().pad(0.25));
    }
  }catch(err){}
});
</script>
</body>
</html>`;

function Row({ label, value }) {
  if (!value && value !== 0) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{display}</Text>
    </View>
  );
}

function Section({ icon, title, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionIcon}>{icon}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export default function ReviewFarmScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { formData = {}, polygonData = {} } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdFarm, setCreatedFarm] = useState(null);
  const webViewRef = useRef(null);

  const onMapLoad = () => {
    if (polygonData?.polygonCoords?.length) {
      webViewRef.current?.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type: 'polygon', coords: polygonData.polygonCoords }))}}));true;`
      );
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const farmPayload = {
        // Farmer
        farmer_first_name:    formData.firstName?.trim() || null,
        farmer_last_name:     formData.lastName?.trim()  || null,
        farmer_phone:         formData.phone?.trim()     || null,
        national_id:          formData.nationalId?.trim()|| null,
        gender:               formData.gender            || null,
        county:               formData.county?.trim()    || null,
        sub_county:           formData.subCounty?.trim() || null,
        cooperative_name:     formData.cooperativeName   || user?.cooperative_name || null,
        cooperative_member_no:formData.cooperativeMemberNo || user?.cooperative_member_no || null,
        data_consent:         formData.dataConsent       || false,
        satellite_consent:    formData.dataConsent       || false,
        historical_imagery_consent: formData.dataConsent || false,
        // Farm
        farm_name:          formData.farmName?.trim()    || null,
        farm_code:          formData.farmCode?.trim()    || null,
        farm_type:          formData.farmType            || null,
        land_reg_number:    formData.landRegNumber?.trim()|| null,
        total_area_hectares:formData.totalArea ? parseFloat(formData.totalArea) : null,
        land_use_type:      formData.landUse             || null,
        // Coffee
        coffee_varieties:   formData.varieties?.length > 0 ? formData.varieties : null,
        year_coffee_planted:formData.yearPlanted ? parseInt(formData.yearPlanted) : null,
        coffee_trees:       formData.coffeeTrees ? parseInt(formData.coffeeTrees) : null,
        farm_status:        formData.farmStatus          || null,
        planting_method:    formData.plantingMethod      || null,
        irrigation_used:    formData.irrigationUsed,
        irrigation_type:    formData.irrigationUsed ? formData.irrigationType || null : null,
        average_annual_production_kg: formData.annualYield ? parseFloat(formData.annualYield) : null,
        // Advanced
        intercropped_species:  formData.intercroppedSpecies?.length ? formData.intercroppedSpecies : null,
        shade_trees:           formData.shadeTrees,
        shade_canopy_percent:  formData.shadeCanopy || null,
        agroforestry_start_year: formData.agroforestryYear || null,
        last_pruning_date:     formData.lastPruning   || null,
        last_harvesting_date:  formData.lastHarvesting|| null,
        recent_planting:       formData.recentPlanting|| null,
        farm_established_year: formData.farmEstYear   || null,
        previous_land_use:     formData.previousLandUse|| null,
        ngo_support:           formData.ngoSupport    || null,
        // Polygon (if captured)
        ...(polygonData?.polygonCoords?.length ? {
          boundary_geojson: {
            type: 'Polygon',
            coordinates: [[
              ...polygonData.polygonCoords.map(p => [p.longitude, p.latitude]),
              [polygonData.polygonCoords[0].longitude, polygonData.polygonCoords[0].latitude],
            ]],
          },
          area_hectares:    polygonData.areaHectares    || null,
          perimeter_meters: polygonData.perimeterMeters || null,
          points_count:     polygonData.pointsCount     || null,
          gps_accuracy_m:   polygonData.accuracyM       || null,
        } : {}),
      };

      const res = formData.targetFarmerId
        ? await farmerAPI.captureFarmForFarmer(formData.targetFarmerId, farmPayload)
        : await mobileAPI.createFarm(farmPayload);

      // If we also have polygon data, save it locally and submit to polygon API
      if (polygonData?.polygonCoords?.length) {
        try {
          const createdFarm = res.data;
          const farmInternalId = createdFarm?.farm_id || createdFarm?.id;
          let deviceId = await AsyncStorage.getItem('device_id');
          if (!deviceId) { deviceId = `android-${Date.now()}`; await AsyncStorage.setItem('device_id', deviceId); }

          const capturePayload = {
            farmId: farmInternalId,
            parcelName: formData.farmName || null,
            polygonCoords: polygonData.polygonCoords,
            areaHectares: polygonData.areaHectares,
            perimeterMeters: polygonData.perimeterMeters,
            pointsCount: polygonData.pointsCount,
            capturedAt: new Date().toISOString(),
            deviceInfo: { device_id: deviceId, model: 'Android', app_version: '1.0.1' },
            accuracyM: polygonData.accuracyM,
          };
          const localId = await dbService.savePolygonCapture(capturePayload);

          const apiPayload = {
            farm_id: farmInternalId,
            parcel_name: capturePayload.parcelName,
            polygon_coordinates: polygonData.polygonCoords.map(p => ({ lat: p.latitude, lng: p.longitude })),
            area_ha: parseFloat((polygonData.areaHectares || 0).toFixed(4)),
            perimeter_meters: polygonData.perimeterMeters ? parseFloat(polygonData.perimeterMeters.toFixed(1)) : null,
            points_count: polygonData.pointsCount,
            captured_at: capturePayload.capturedAt,
            device_id: deviceId,
            accuracy_m: polygonData.accuracyM ? parseFloat(polygonData.accuracyM.toFixed(2)) : null,
          };
          try {
            await polygonAPI.submit(apiPayload);
            await dbService.updateSyncStatus(localId, 'synced');
          } catch (_) {}
        } catch (_) {}
      }

      setCreatedFarm(res.data || {});
      setSubmitted(true);

    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to register farm.';
      Alert.alert('Registration Failed', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const hasPoly = polygonData?.polygonCoords?.length >= 3;
  const isCoopCapture = !!formData.targetFarmerId;

  // ── Success screen (shown after successful submit — prevents double-tap) ──────
  if (submitted) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={[s.safe, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
          <Ionicons name="checkmark-circle" size={80} color={C.c700} />
          <Text style={{ fontSize: 22, fontWeight: '900', color: C.ink, marginTop: 20, textAlign: 'center' }}>
            Farm Registered!
          </Text>
          <Text style={{ fontSize: 14, color: C.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            {isCoopCapture
              ? `Farm captured successfully for the farmer.`
              : 'Your farm has been registered and is awaiting verification.'}
          </Text>
          {!!createdFarm?.farm_code && (
            <View style={{ marginTop: 24, backgroundColor: C.c050, borderRadius: 14, padding: 18, alignItems: 'center', width: '100%' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>Farm Code</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: C.c700, marginTop: 4 }}>{createdFarm.farm_code}</Text>
            </View>
          )}
          <TouchableOpacity
            style={{ marginTop: 32, width: '100%', height: 52, backgroundColor: C.c700, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => isCoopCapture ? navigation.navigate('CoopFarmsList') : navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}
            activeOpacity={0.85}
          >
            <Text style={{ color: C.white, fontSize: 16, fontWeight: '800' }}>
              {isCoopCapture ? 'Back to Farm List' : 'Done'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
<View style={s.header}>
           <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
             <Ionicons name="arrow-back" size={22} color={C.ink} />
           </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Review Farm</Text>
            <Text style={s.subtitle}>Confirm all details before registering</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Polygon map */}
          {hasPoly ? (
            <View style={s.mapCard}>
              <WebView
                ref={webViewRef}
                source={{ html: MAP_HTML }}
                onLoad={onMapLoad}
                style={s.map}
                scrollEnabled={false}
              />
              <View style={s.mapBadge}>
                <Text style={s.mapBadgeText}>
                  {(polygonData.areaHectares || 0).toFixed(2)} ha · {polygonData.pointsCount} pts
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.noMapCard}>
              <Ionicons name="map-outline" size={32} color={C.steel300} />
              <Text style={s.noMapText}>No boundary captured</Text>
              <Text style={s.noMapSub}>You can capture it later from My Farms</Text>
            </View>
          )}

          {/* Farmer */}
          <Section icon="👤" title="Farmer">
            <Row label="Name"           value={[formData.firstName, formData.lastName].filter(Boolean).join(' ')} />
            <Row label="Phone"          value={formData.phone} />
            <Row label="National ID"    value={formData.nationalId} />
            <Row label="Gender"         value={formData.gender} />
            <Row label="County"         value={formData.county} />
            <Row label="Sub-County"     value={formData.subCounty} />
            <Row label="Cooperative"    value={formData.cooperativeName || user?.cooperative_name} />
            <Row label="Member No."     value={formData.cooperativeMemberNo || user?.cooperative_member_no} />
          </Section>

          {/* Farm */}
          <Section icon="🌱" title="Land & Farm">
            <Row label="Farm Name"      value={formData.farmName} />
            <Row label="Farm Code"      value={formData.farmCode} />
            <Row label="Type"           value={formData.farmType} />
            <Row label="Total Area"     value={formData.totalArea ? `${formData.totalArea} ha` : null} />
            <Row label="Land Use"       value={formData.landUse} />
            <Row label="Reg. Number"    value={formData.landRegNumber} />
          </Section>

          {/* Coffee */}
          <Section icon="☕" title="Coffee">
            <Row label="Varieties"      value={formData.varieties} />
            <Row label="Year Planted"   value={formData.yearPlanted} />
            <Row label="Coffee Trees"   value={formData.coffeeTrees} />
            <Row label="Farm Status"    value={formData.farmStatus} />
            <Row label="Planting"       value={formData.plantingMethod} />
            <Row label="Irrigation"     value={formData.irrigationUsed ? (formData.irrigationType || 'Yes') : 'No'} />
            <Row label="Avg Yield"      value={formData.annualYield ? `${formData.annualYield} kg/yr` : null} />
          </Section>

          {/* Advanced (only show if filled) */}
          {(formData.intercroppedSpecies?.length || formData.farmEstYear || formData.previousLandUse || formData.lastPruning) && (
            <Section icon="🌿" title="Advanced Details">
              <Row label="Intercropped"   value={formData.intercroppedSpecies} />
              <Row label="Shade Trees"    value={formData.shadeTrees != null ? (formData.shadeTrees ? 'Yes' : 'No') : null} />
              <Row label="Shade Canopy"   value={formData.shadeCanopy ? `${formData.shadeCanopy}%` : null} />
              <Row label="Agro. Year"     value={formData.agroforestryYear} />
              <Row label="Last Pruning"   value={formData.lastPruning} />
              <Row label="Last Harvest"   value={formData.lastHarvesting} />
              <Row label="Est. Year"      value={formData.farmEstYear} />
              <Row label="Previous Use"   value={formData.previousLandUse} />
              <Row label="NGO Support"    value={formData.ngoSupport} />
            </Section>
          )}

          {/* Boundary stats */}
          {hasPoly && (
            <Section icon="📍" title="Boundary">
              <Row label="Area"           value={`${(polygonData.areaHectares || 0).toFixed(4)} ha`} />
              <Row label="Perimeter"      value={polygonData.perimeterMeters ? `${(polygonData.perimeterMeters / 1000).toFixed(2)} km` : null} />
              <Row label="Points"         value={polygonData.pointsCount} />
              <Row label="GPS Accuracy"   value={polygonData.accuracyM ? `±${polygonData.accuracyM.toFixed(1)} m` : null} />
            </Section>
          )}

          {/* Consent confirmation */}
          <View style={s.consentBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#15803d" />
            <Text style={s.consentText}>Data consent granted — satellite monitoring authorized</Text>
          </View>

          {/* Nav buttons */}
          <View style={s.navRow}>
            <TouchableOpacity style={s.navBack} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Text style={s.navBackText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.registerBtn, (loading || submitted) && s.registerBtnDisabled]}
              onPress={handleRegister}
              disabled={loading || submitted}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.registerBtnText}>{isCoopCapture ? 'Submit Farm' : 'Add Farm'}</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, paddingLeft: 56, paddingRight: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  backBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 18, fontWeight: '800', color: C.ink },
  subtitle:  { fontSize: 12, color: C.muted, marginTop: 1 },

  content: { padding: 20 },

  // Map
  mapCard:    { height: 220, borderRadius: 20, overflow: 'hidden', marginBottom: 16, backgroundColor: C.steel100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  map:        { flex: 1 },
  mapBadge:   { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  mapBadgeText: { fontSize: 11, fontWeight: '800', color: C.c700 },
  noMapCard:  { alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderRadius: 20, padding: 28, marginBottom: 16, borderWidth: 1.5, borderColor: C.steel200, borderStyle: 'dashed', gap: 6 },
  noMapText:  { fontSize: 14, fontWeight: '700', color: C.steel600 },
  noMapSub:   { fontSize: 12, color: C.muted },

  // Section
  section:       { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  sectionIcon:   { fontSize: 18 },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 0.5 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  rowLabel:  { fontSize: 12, color: C.muted, fontWeight: '600', flex: 1 },
  rowValue:  { fontSize: 13, color: C.ink, fontWeight: '700', flex: 2, textAlign: 'right' },

  consentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#bbf7d0' },
  consentText:  { flex: 1, fontSize: 12, color: '#15803d', fontWeight: '600' },

  navRow:         { flexDirection: 'row', gap: 12 },
  navBack:        { flex: 1, height: 56, borderRadius: 14, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  navBackText:    { fontSize: 15, fontWeight: '800', color: C.steel600 },
  registerBtn:    { flex: 2, height: 56, backgroundColor: C.c700, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  registerBtnDisabled: { opacity: 0.6 },
  registerBtnText:{ fontSize: 16, fontWeight: '900', color: C.white },
});
