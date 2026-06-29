import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { C } from '../theme';

/*
 * Disabled methods (pending UI — GPS Walk only for now):
 *
 * {
 *   mode:  'click',
 *   icon:  'locate-outline',
 *   color: '#3b82f6',
 *   bg:    '#dbeafe',
 *   title: 'GPS Click',
 *   desc:  'Tap the map to place boundary points.',
 * },
 * {
 *   mode:  'import',
 *   icon:  'code-download-outline',
 *   color: '#059669',
 *   bg:    '#d1fae5',
 *   title: 'Import Coordinates',
 *   desc:  'Paste lat/lng pairs or a GeoJSON polygon.',
 * },
 */

const PREVIEW_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body,html{height:100%}
#map{width:100%;height:100%;background:#e8f4fd}
.leaflet-control-zoom,.leaflet-control-attribution{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20}).addTo(map);
map.setView([0.5,37],6);
var marker=null;
document.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.lat&&d.lon){
      var ll=[d.lat,d.lon];
      map.setView(ll,17);
      if(marker) marker.setLatLng(ll);
      else{
        marker=L.circleMarker(ll,{radius:10,color:'#15803d',fillColor:'#22c55e',fillOpacity:0.9,weight:3}).addTo(map);
      }
    }
  }catch(e){}
});
</script>
</body>
</html>`;

export default function CaptureModeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farmId, farm, formData } = route.params || {};
  const webRef = useRef(null);
  const [locReady, setLocReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (webRef.current) {
        webRef.current.postMessage(JSON.stringify({
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
        }));
      }
      setLocReady(true);
    })();
  }, []);

  const handleStart = () => {
    navigation.navigate('WalkBoundary', { farmId, farm, captureMode: 'walk', formData });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={s.headerWrap}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={C.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Capture Boundary</Text>
            {(farm?.farm_name || farmId) ? (
              <Text style={s.subtitle} numberOfLines={1}>{farm?.farm_name || farmId}</Text>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Full-screen map */}
      <View style={s.mapWrap}>
        <WebView
          ref={webRef}
          source={{ html: PREVIEW_HTML }}
          style={s.map}
          scrollEnabled={false}
          javaScriptEnabled
          onMessage={() => {}}
        />
        {!locReady && (
          <View style={s.mapOverlay}>
            <Ionicons name="location-outline" size={22} color={C.muted} />
            <Text style={s.mapOverlayText}>Locating you…</Text>
          </View>
        )}
      </View>

      {/* Bottom action */}
      <SafeAreaView edges={['bottom']} style={s.bottomWrap}>
        <View style={s.bottomCard}>
          <View style={s.methodRow}>
            <View style={s.methodIcon}>
              <Ionicons name="walk-outline" size={20} color={C.c700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.methodTitle}>GPS Walk</Text>
              <Text style={s.methodDesc}>Walk the farm perimeter and tap to mark each corner</Text>
            </View>
            <View style={s.badge}>
              <Text style={s.badgeText}>Recommended</Text>
            </View>
          </View>

          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Ionicons name="play-circle-outline" size={18} color={C.white} />
            <Text style={s.startBtnText}>Start Capturing</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  headerWrap:    { backgroundColor: C.white, zIndex: 10 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  backBtn:       { width: 32, height: 32, borderRadius: 8, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 16, fontWeight: '800', color: C.ink },
  subtitle:      { fontSize: 11, color: C.muted, marginTop: 1 },

  mapWrap:       { flex: 1 },
  map:           { flex: 1 },
  mapOverlay:    { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(248,250,252,0.7)', gap: 6 },
  mapOverlayText:{ fontSize: 13, color: C.muted, fontWeight: '600' },

  bottomWrap:    { backgroundColor: C.white },
  bottomCard:    { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },

  methodRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c100, alignItems: 'center', justifyContent: 'center' },
  methodTitle:   { fontSize: 13, fontWeight: '800', color: C.ink },
  methodDesc:    { fontSize: 11, color: C.muted, lineHeight: 15, marginTop: 1 },
  badge:         { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText:     { fontSize: 9, fontWeight: '800', color: '#15803d' },

  startBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, backgroundColor: C.c700 },
  startBtnText:  { fontSize: 14, fontWeight: '800', color: C.white },
});
