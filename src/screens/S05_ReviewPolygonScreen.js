import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { API_BASE_URL, API_KEY } from '../config';
import { dbService } from '../services/database';
import { C } from '../theme';

const StepBar = ({ current }) => (
  <View style={sb.row}>
    {[1, 2, 3].map((s) => (
      <View key={s} style={[sb.seg, s < current && sb.done, s === current && sb.active, s > current && sb.idle]} />
    ))}
  </View>
);
const sb = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  done: { backgroundColor: C.c400 },
  active: { backgroundColor: C.c700 },
  idle: { backgroundColor: C.rule },
});

const REVIEW_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:20}).addTo(map);
map.setView([0,37],5);
window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='polygon'){
      var coords=d.coords.map(function(c){return[c.latitude,c.longitude];});
      coords.forEach(function(c,i){
        L.circleMarker(c,{radius:5,color:'#5c2d0e',fillColor:'#6f4e37',fillOpacity:1,weight:2}).addTo(map);
      });
      var poly=L.polygon(coords,{color:'#6f4e37',fillColor:'#6f4e37',fillOpacity:0.22,weight:2}).addTo(map);
      map.fitBounds(poly.getBounds().pad(0.2));
    }
  }catch(err){}
});
</script>
</body>
</html>`;

const ReviewPolygonScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, farm, polygonCoords, areaHectares, perimeterMeters, pointsCount } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const webViewRef = useRef(null);

  const onMapLoad = () => {
    const js = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type: 'polygon', coords: polygonCoords }))}}));true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = `android-${Date.now()}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }

      const capturePayload = {
        farmId,
        parcelName: farm?.farm_name || farm?.name || null,
        polygonCoords,
        areaHectares,
        perimeterMeters,
        pointsCount,
        capturedAt: new Date().toISOString(),
        deviceInfo: { device_id: deviceId, model: 'Android', app_version: '1.0.0' },
        notes: null,
        topologyValidated: true,
        validationWarnings: [],
      };

      const localId = await dbService.savePolygonCapture(capturePayload);
      const farmInternalId = farm?.id ?? parseInt(farmId, 10);

      const apiPayload = {
        farm_id: farmInternalId,
        parcel_name: capturePayload.parcelName,
        polygon_coordinates: polygonCoords.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        area_ha: parseFloat(areaHectares.toFixed(4)),
        perimeter_meters: perimeterMeters ? parseFloat(perimeterMeters.toFixed(1)) : null,
        points_count: pointsCount,
        captured_at: capturePayload.capturedAt,
        device_id: deviceId,
        agent_id: null,
        accuracy_m: null,
      };

      const res = await fetch(`${API_BASE_URL}/parcels/polygon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify(apiPayload),
      });

      if (res.ok) {
        const result = await res.json();
        await dbService.updateSyncStatus(localId, 'synced');
        navigation.replace('Submitted', {
          captureId: result.record_id || result.id || localId,
          farmId, areaHectares, pointsCount,
        });
      } else {
        throw new Error(`Server error ${res.status}`);
      }
    } catch (error) {
      navigation.replace('OfflineSaved', { farmId, areaHectares, pointsCount, error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Review polygon</Text>
          <StepBar current={3} />
        </View>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.mapWrap}>
          <WebView
            ref={webViewRef}
            source={{ html: REVIEW_MAP_HTML }}
            style={s.map}
            onLoad={onMapLoad}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            scrollEnabled={false}
          />
        </View>

        <View style={s.areaCard}>
          <Text style={s.areaVal}>{areaHectares.toFixed(4)}</Text>
          <Text style={s.areaUnit}>hectares — calculated area</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Points</Text>
            <Text style={s.statVal}>{pointsCount} coords</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statLabel}>Perimeter</Text>
            <Text style={s.statVal}>{perimeterMeters ? `${(perimeterMeters / 1000).toFixed(2)} km` : '—'}</Text>
          </View>
        </View>

        <View style={s.infoRow}>
          <Text style={s.infoText} numberOfLines={1}>
            {farmId}{farm?.farm_name ? ` — ${farm.farm_name}` : ''}
          </Text>
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, isSubmitting && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? <ActivityIndicator color={C.white} /> : <Text style={s.primaryBtnText}>Submit to Plotra →</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={s.secondaryBtnText}>Re-walk boundary</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 56 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  mapWrap: { height: 200, borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.rule },
  map: { flex: 1 },
  areaCard: {
    backgroundColor: C.white, borderRadius: 12, padding: 20, alignItems: 'center',
    marginBottom: 12, elevation: 3,
  },
  areaVal: { fontSize: 38, fontWeight: '700', color: C.c700 },
  areaUnit: { fontSize: 13, color: C.muted, marginTop: 4 },
  statsRow: {
    flexDirection: 'row', backgroundColor: C.white, borderRadius: 12,
    marginBottom: 12, elevation: 3, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: 14 },
  statDivider: { width: 1, backgroundColor: C.rule },
  statLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  statVal: { fontSize: 15, fontWeight: '600', color: C.ink2 },
  infoRow: { backgroundColor: C.white, borderRadius: 10, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.rule },
  infoText: { fontSize: 13, color: C.muted },
  primaryBtn: { backgroundColor: C.c600, paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  btnDisabled: { backgroundColor: C.c200 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },
  secondaryBtn: { paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: C.c600 },
  secondaryBtnText: { color: C.c600, fontSize: 15, fontWeight: '600' },
});

export default ReviewPolygonScreen;
