import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';
import { dbService } from '../services/database';
import { polygonAPI } from '../services/api';
import { C } from '../theme';

const REVIEW_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}#map{width:100vw;height:100vh;background:#f8f9fa}</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,dragging:false,scrollWheelZoom:false,touchZoom:false,doubleClickZoom:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20}).addTo(map);
window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='polygon'){
      var coords=d.coords.map(function(c){return[c.latitude,c.longitude];});
      var poly=L.polygon(coords,{color:'#6f4e37',fillColor:'#6f4e37',fillOpacity:0.3,weight:3}).addTo(map);
      map.fitBounds(poly.getBounds().pad(0.3));
    }
  }catch(err){}
});
</script>
</body>
</html>`;

const ReviewPolygonScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    farmId = '',
    farm = null,
    polygonCoords = [],
    areaHectares = 0,
    perimeterMeters = null,
    pointsCount = 0,
    accuracyM = null,
  } = route.params || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const webViewRef = useRef(null);

  const onMapLoad = () => {
    webViewRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify({ type: 'polygon', coords: polygonCoords }))}}));true;`);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) { deviceId = `android-${Date.now()}`; await AsyncStorage.setItem('device_id', deviceId); }

      const farmInternalId = farm?.id ?? farmId;
      const capturedAt = new Date().toISOString();

      const capturePayload = {
        farmId: farmInternalId,
        parcelName: farm?.farm_name || farm?.name || null,
        polygonCoords, areaHectares, perimeterMeters, pointsCount, capturedAt,
        deviceInfo: { device_id: deviceId, model: 'Android', app_version: '1.0.1' },
        notes: null, topologyValidated: true, validationWarnings: [],
        accuracyM,
      };

      const localId = await dbService.savePolygonCapture(capturePayload);

      const apiPayload = {
        farm_id: farmInternalId,
        parcel_name: capturePayload.parcelName,
        polygon_coordinates: polygonCoords.map((p) => ({ lat: p.latitude, lng: p.longitude })),
        area_ha: parseFloat((areaHectares || 0).toFixed(4)),
        perimeter_meters: perimeterMeters ? parseFloat(perimeterMeters.toFixed(1)) : null,
        points_count: pointsCount,
        captured_at: capturedAt,
        device_id: deviceId,
        agent_id: null,
        accuracy_m: accuracyM ? parseFloat(accuracyM.toFixed(2)) : null,
      };

      const response = await polygonAPI.submit(apiPayload);

      if (response.status === 200 || response.status === 201) {
        await dbService.updateSyncStatus(localId, 'synced');
        navigation.replace('Submitted', { farmId, areaHectares, pointsCount });
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (error) {
      console.log('Submission failed:', error.message);
      navigation.replace('OfflineSaved', {
        farmId,
        areaHectares,
        pointsCount,
        error: error.message
      });
    } finally { setIsSubmitting(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.white} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>✕</Text>
        </TouchableOpacity>
        <View style={s.headerLogoWrap}>
          <Image source={require('../../assets/logo.jpeg')} style={s.headerLogo} />
        </View>
        <Text style={s.headerTitle}>Review</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.mapCard}>
          <WebView
            ref={webViewRef}
            source={{ html: REVIEW_MAP_HTML }}
            onLoad={onMapLoad}
            style={s.map}
            scrollEnabled={false}
          />
          <View style={s.mapBadge}>
            <Text style={s.mapBadgeText}>Polygon Preview</Text>
          </View>
        </View>

        <View style={s.mainInfo}>
          <Text style={s.farmName}>{farm?.farm_name || 'Individual Parcel'}</Text>
          <Text style={s.farmId}>Farm ID: {farmId}</Text>
        </View>

        <View style={s.statsGrid}>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Calculated Area</Text>
            <Text style={s.statValue}>{areaHectares.toFixed(4)} <Text style={s.statUnit}>ha</Text></Text>
          </View>
          <View style={s.statItem}>
            <Text style={s.statLabel}>Boundary Points</Text>
            <Text style={s.statValue}>{pointsCount}</Text>
          </View>
        </View>

        <View style={s.detailCard}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Perimeter</Text>
            <Text style={s.detailVal}>{perimeterMeters ? `${(perimeterMeters / 1000).toFixed(2)} km` : '—'}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Accuracy</Text>
            <Text style={s.detailVal}>High (Native GPS)</Text>
          </View>
        </View>

        <View style={s.alertBox}>
          <Text style={s.alertText}>
            Submitting this data will link it to the farmer's profile for EUDR compliance verification.
          </Text>
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.submitBtn, isSubmitting && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color={C.white} /> : <Text style={s.submitBtnText}>Finalize & Submit</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={s.cancelBtnText}>Discard & Restart</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, fontWeight: '700', color: C.steel700 },
  headerLogoWrap: { width: 32, height: 32, borderRadius: 8, overflow: 'hidden', marginHorizontal: 12, borderWidth: 1, borderColor: C.steel200 },
  headerLogo: { width: '100%', height: '100%' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.ink },

  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 160 },

  mapCard: { height: 220, borderRadius: 24, overflow: 'hidden', backgroundColor: C.steel100, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
  map: { flex: 1 },
  mapBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  mapBadgeText: { fontSize: 10, fontWeight: '800', color: C.c700, textTransform: 'uppercase' },

  mainInfo: { marginBottom: 30 },
  farmName: { fontSize: 28, fontWeight: '800', color: C.ink, marginBottom: 4 },
  farmId: { fontSize: 14, color: C.muted, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: C.steel100, padding: 20, borderRadius: 20 },
  statLabel: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.c700 },
  statUnit: { fontSize: 14, color: C.muted, fontWeight: '500' },

  detailCard: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1.5, borderColor: C.steel100, padding: 20, marginBottom: 24 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14, color: C.muted, fontWeight: '600' },
  detailVal: { fontSize: 14, color: C.ink, fontWeight: '700' },
  divider: { height: 1.5, backgroundColor: C.steel100, marginVertical: 15 },

  alertBox: { backgroundColor: C.syncedBg, padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: C.syncedText },
  alertText: { fontSize: 13, color: C.syncedText, lineHeight: 20, fontWeight: '500' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: C.steel200 },
  submitBtn: { backgroundColor: C.c700, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  submitBtnText: { color: C.white, fontSize: 17, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
  cancelBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: C.muted, fontSize: 14, fontWeight: '700' },
});

export default ReviewPolygonScreen;
