import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as turf from '@turf/turf';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
#map{width:100vw;height:100vh;background:#f1f5f9}
.leaflet-control-attribution{display:none}
</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:false});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20}).addTo(map);
map.setView([0,37],6);

var locMarker=null, accCircle=null, pts=[], polyline=null, polygon=null;
var followUser=true;

map.on('dragstart',function(){ followUser=false; });

function reCenter(){
  followUser=true;
  if(locMarker) map.setView(locMarker.getLatLng(),19);
}

function redraw(){
  if(polyline){map.removeLayer(polyline);polyline=null;}
  if(polygon){map.removeLayer(polygon);polygon=null;}
  var coords=pts.map(function(m){return m.getLatLng();});
  if(coords.length>=3){
    polygon=L.polygon(coords,{color:'#15803d',fillColor:'#16a34a',fillOpacity:0.35,weight:4}).addTo(map);
  } else if(coords.length>=2){
    polyline=L.polyline(coords,{color:'#15803d',weight:4,dashArray:'8, 12'}).addTo(map);
  }
}

window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='loc'){
      var ll=[d.lat,d.lng];
      if(!locMarker){
        locMarker=L.circleMarker(ll,{radius:12,color:'#fff',fillColor:'#3b82f6',fillOpacity:1,weight:3}).addTo(map);
        map.setView(ll,19);
      } else {
        locMarker.setLatLng(ll);
        if(followUser) map.panTo(ll,{animate:true,duration:0.5});
      }
      if(d.acc && d.acc < 200){
        if(!accCircle){
          accCircle=L.circle(ll,{radius:d.acc,color:'#3b82f6',fillColor:'#3b82f6',fillOpacity:0.1,weight:1}).addTo(map);
        } else {
          accCircle.setLatLng(ll); accCircle.setRadius(d.acc);
        }
      }
    } else if(d.type==='add'){
      var m=L.circleMarker([d.lat,d.lng],{radius:8,color:'#fff',fillColor:'#15803d',fillOpacity:1,weight:3}).addTo(map);
      pts.push(m); redraw();
    } else if(d.type==='undo'){
      if(pts.length>0){map.removeLayer(pts[pts.length-1]);pts.pop();redraw();}
    } else if(d.type==='clear'){
      pts.forEach(function(m){map.removeLayer(m);}); pts=[];
      if(polyline){map.removeLayer(polyline);polyline=null;}
      if(polygon){map.removeLayer(polygon);polygon=null;}
    } else if(d.type==='center'){ reCenter(); }
  }catch(err){}
});

map.on('click', function(e) {
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'click',lat:e.latlng.lat,lng:e.latlng.lng}));
});
</script>
</body>
</html>`;

const WalkBoundaryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { farmId, farm, captureMode = 'walk', formData } = route.params || {};

  // captureMode: 'walk' | 'click' | 'draw'
  // click = GPS tracking + tap map; draw = no GPS, tap map; walk = GPS + press button
  const isMapTapMode  = captureMode === 'click' || captureMode === 'draw';
  const needsGPS      = captureMode !== 'draw';

  const [currentLocation, setCurrentLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [pointAccuracies, setPointAccuracies] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(!needsGPS); // draw mode skips GPS loading
  const [gpsStatus, setGpsStatus] = useState(needsGPS ? 'Initializing GPS...' : 'Ready');

  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  const mapReadyRef = useRef(false);
  const currentLocationRef = useRef(null);
  const [topologyError, setTopologyError] = useState(null);

  const send = useCallback((obj) => {
    try {
      if (!webViewRef.current || !mapReadyRef.current) return;
      webViewRef.current.injectJavaScript(`(function(){window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}}));})();true;`);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (needsGPS) startLocation();
    return () => locationSub.current?.remove();
  }, []);

  useEffect(() => {
    if (markers.length >= 4) validatePolygon(markers);
    else setTopologyError(null);
  }, [markers]);

  const validatePolygon = (pts) => {
    try {
      const ring = [...pts.map(p => [p.longitude, p.latitude]), [pts[0].longitude, pts[0].latitude]];
      const poly = turf.polygon([ring]);
      if (turf.kinks(poly).features.length > 0) {
        setTopologyError('Boundary lines cross — please undo or clear and restart.');
      } else {
        setTopologyError(null);
      }
    } catch (_) { setTopologyError(null); }
  };

  const startLocation = async () => {
    try {
      setGpsStatus('Checking GPS services...');
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setGpsStatus('GPS is disabled');
        Alert.alert(
          'GPS / Location is Off',
          'Please turn on Location Services in your device settings to capture the farm boundary.',
          [
            { text: 'Open Settings', onPress: () => { const { Linking } = require('react-native'); Linking.openSettings(); } },
            { text: 'Go Back', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      setGpsStatus('Requesting permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('Permission denied');
        Alert.alert(
          'Location Permission Required',
          'Plotra needs location access to capture farm boundaries. Please allow it in Settings.',
          [
            { text: 'Open Settings', onPress: () => { const { Linking } = require('react-native'); Linking.openSettings(); } },
            { text: 'Go Back', style: 'cancel', onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      setGpsStatus('Acquiring initial location...');
      try {
        // 1. Try last known position first (very fast fallback)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          setCurrentLocation(lastKnown);
          setAccuracy(lastKnown.coords.accuracy);
          currentLocationRef.current = lastKnown;
          send({ type: 'loc', lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude, acc: lastKnown.coords.accuracy });
        }

        // 2. Try current position with a balanced accuracy if high fails
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);

        if (initial) {
          setCurrentLocation(initial);
          setAccuracy(initial.coords.accuracy);
          currentLocationRef.current = initial;
          send({ type: 'loc', lat: initial.coords.latitude, lng: initial.coords.longitude, acc: initial.coords.accuracy });
        }
      } catch (posErr) {
      }

      setGpsStatus('Waiting for high accuracy lock...');

      // Auto-dismiss loading after 12 seconds if we have at least SOME location
      const timeoutTimer = setTimeout(() => {
        if (currentLocationRef.current) {
          setGpsLoading(false);
        }
      }, 12000);

      try {
        locationSub.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 1
          },
          (loc) => {
            setCurrentLocation(loc);
            setAccuracy(loc.coords.accuracy);
            currentLocationRef.current = loc;
            send({ type: 'loc', lat: loc.coords.latitude, lng: loc.coords.longitude, acc: loc.coords.accuracy });

            // Relaxed to 25m for budget devices to allow proceeding
            if (loc.coords.accuracy <= 25) {
              clearTimeout(timeoutTimer);
              setGpsLoading(false);
            } else {
              setGpsStatus(`Improving accuracy (±${loc.coords.accuracy.toFixed(1)}m)...`);
            }
          }
        );
      } catch (watchErr) {
        clearTimeout(timeoutTimer);
        // Final fallback: use Balanced accuracy watcher if BestForNavigation fails
        locationSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 2 },
          (loc) => {
            setCurrentLocation(loc);
            setAccuracy(loc.coords.accuracy);
            currentLocationRef.current = loc;
            send({ type: 'loc', lat: loc.coords.latitude, lng: loc.coords.longitude, acc: loc.coords.accuracy });
            setGpsLoading(false);
          }
        );
      }
    } catch (err) {
      setGpsStatus('GPS Error');
      Alert.alert('Location Error', 'Could not initialize GPS. Please check your settings and try again.');
    }
  };

  const handleMarkPoint = () => {
    if (isMapTapMode) {
      Alert.alert('Tap Mode', 'Tap the map at each boundary corner to add points.');
      return;
    }
    const loc = currentLocationRef.current;
    if (!loc) return;
    const { latitude, longitude, accuracy: acc } = loc.coords;

    if (markers.length > 0) {
      const last = markers[markers.length - 1];
      const dist = turf.distance(
        turf.point([last.longitude, last.latitude]),
        turf.point([longitude, latitude]),
        { units: 'kilometers' }
      ) * 1000;
      if (dist < 3) {
        Alert.alert('Too Close', 'Move at least 3m before marking the next point.');
        return;
      }
    }

    setMarkers(prev => [...prev, { id: Date.now(), latitude, longitude }]);
    setPointAccuracies(prev => [...prev, acc || 0]);
    send({ type: 'add', lat: latitude, lng: longitude });
  };

  const onMapReady = () => {
    mapReadyRef.current = true;
    setMapLoading(false);
    if (currentLocationRef.current) {
      const { latitude, longitude, accuracy } = currentLocationRef.current.coords;
      send({ type: 'loc', lat: latitude, lng: longitude, acc: accuracy });
    }
  };

  const handleSave = () => {
    if (markers.length < 4) { Alert.alert('Requirement', 'A valid polygon requires at least 4 boundary points.'); return; }
    if (topologyError) { Alert.alert('Boundary Error', topologyError); return; }
    const ring = [...markers.map(p => [p.longitude, p.latitude]), [markers[0].longitude, markers[0].latitude]];
    const poly = turf.polygon([ring]);

    const avgAccuracy = pointAccuracies.length > 0
      ? pointAccuracies.reduce((a, b) => a + b, 0) / pointAccuracies.length
      : (accuracy || 0);

    const polygonData = {
      polygonCoords: markers.map(m => ({ latitude: m.latitude, longitude: m.longitude })),
      areaHectares:    turf.area(poly) / 10000,
      perimeterMeters: turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000,
      pointsCount:     markers.length,
      accuracyM:       avgAccuracy,
    };

    if (formData) {
      // New farm flow: go to Advanced → Review → Register
      navigation.navigate('AdvancedCapture', { formData, polygonData });
    } else {
      // Existing farm boundary capture: go to ReviewPolygon (saves boundary only)
      navigation.navigate('ReviewPolygon', { farmId, farm, ...polygonData });
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        onLoad={onMapReady}
        onMessage={(e) => {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'click' && isMapTapMode) {
            setMarkers(prev => [...prev, { id: Date.now(), latitude: msg.lat, longitude: msg.lng }]);
            send({ type: 'add', lat: msg.lat, lng: msg.lng });
          }
        }}
        style={s.map}
      />

<View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBack} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={18} color={C.steel700} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {farm?.farm_name || 'Boundary Capture'}
        </Text>
      </View>

      {topologyError && (
        <View style={[s.errorBanner, { top: insets.top + 60 }]}>
          <Text style={s.errorTitle}>⚠ Boundary Error</Text>
          <Text style={s.errorMsg}>{topologyError}</Text>
        </View>
      )}

      <View style={[s.accuracyBox, { top: insets.top + (topologyError ? 120 : 64) }]}>
        <View style={[s.accDot, { backgroundColor: accuracy < 8 ? '#22c55e' : '#f59e0b' }]} />
        <Text style={s.accText}>GPS Accuracy: ±{accuracy?.toFixed(1) || '—'}m</Text>
        {accuracy > 10 && <Text style={s.accWarn}> (Move to clear sky)</Text>}
      </View>

      <View style={s.controls}>
        <View style={s.statsRow}>
          <View>
            <Text style={s.statLabel}>Captured Path</Text>
            <View style={s.statValueRow}>
              <Text style={s.statValue}>{markers.length}</Text>
              <Text style={s.statUnit}>Points</Text>
            </View>
          </View>

          <View style={s.modeLabel}>
            <Text style={s.modeLabelIcon}>
              {captureMode === 'walk' ? '🚶' : captureMode === 'click' ? '📍' : '✏️'}
            </Text>
            <Text style={s.modeLabelText}>
              {captureMode === 'walk' ? 'Walk' : captureMode === 'click' ? 'GPS Click' : 'Draw'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.markBtn, (!currentLocation && !isMapTapMode) && s.btnDisabled]}
          onPress={handleMarkPoint}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color={C.white} />
          <Text style={s.markBtnText}>
            {isMapTapMode ? 'Tap Map to Add' : 'Capture Point'}
          </Text>
        </TouchableOpacity>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={13} color={C.steel600} />
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.undoBtn} onPress={() => { setMarkers(m => m.slice(0, -1)); send({ type: 'undo' }); }}>
            <Ionicons name="arrow-undo" size={13} color={C.steel600} />
            <Text style={s.undoBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, markers.length < 4 && s.btnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={s.saveBtnText}>Save</Text>
            <Ionicons name="chevron-forward" size={13} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      {gpsLoading && !isMapTapMode && (
        <View style={s.gpsOverlay}>
          <View style={s.gpsLoadingCard}>
            <ActivityIndicator size="large" color={C.c700} />
            <Text style={s.gpsLoadingTitle}>Calibrating GPS</Text>
            <Text style={s.gpsLoadingMsg}>{gpsStatus}</Text>
            <TouchableOpacity
              style={s.gpsSkipBtn}
              onPress={() => setGpsLoading(false)}
            >
              <Text style={s.gpsSkipText}>Continue Anyway</Text>
            </TouchableOpacity>
            <Text style={s.gpsHint}>Go outside and move to a clear area for best results.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  map: { flex: 1 },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 12, paddingRight: 12, paddingBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1, borderBottomColor: C.steel200,
    zIndex: 100,
  },
  headerBack: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: C.steel100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: C.ink, letterSpacing: 0.3 },

  errorBanner: { position: 'absolute', left: 16, right: 16, backgroundColor: C.failedBg, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: C.failedText, zIndex: 100 },
  errorTitle: { fontSize: 12, fontWeight: '900', color: C.failedText, textTransform: 'uppercase', marginBottom: 2 },
  errorMsg: { fontSize: 11, color: C.ink, fontWeight: '600', lineHeight: 15 },

  accuracyBox: { position: 'absolute', left: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, elevation: 4, zIndex: 100 },
  accDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 7 },
  accText: { fontSize: 11, fontWeight: '800', color: C.steel700 },
  accWarn: { fontSize: 10, fontWeight: '700', color: '#dc2626' },

  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    padding: 14, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.07, shadowRadius: 16, elevation: 18,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 22, fontWeight: '900', color: C.ink },
  statUnit: { fontSize: 11, color: C.muted, fontWeight: '600', marginLeft: 4 },

  modeLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.steel100, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: C.steel200 },
  modeLabelIcon: { fontSize: 13 },
  modeLabelText: { fontSize: 11, fontWeight: '800', color: C.steel700 },

  markBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.c800, height: 48, borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  markBtnText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.3, elevation: 0 },

  actionRow:   { flexDirection: 'row', gap: 8 },
  backBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: C.steel300 },
  backBtnText: { fontSize: 12, fontWeight: '700', color: C.steel600 },
  undoBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: C.steel200 },
  undoBtnText: { fontSize: 12, fontWeight: '700', color: C.steel600 },
  saveBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: C.c700, height: 42, borderRadius: 10, shadowColor: C.c700, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
  saveBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

  gpsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  gpsLoadingCard: { width: '82%', backgroundColor: C.white, borderRadius: 22, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 12 },
  gpsLoadingTitle: { fontSize: 17, fontWeight: '800', color: C.ink, marginTop: 16, marginBottom: 6 },
  gpsLoadingMsg: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  gpsSkipBtn: { backgroundColor: C.steel100, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, marginBottom: 12 },
  gpsSkipText: { fontSize: 13, fontWeight: '700', color: C.steel600 },
  gpsHint: { fontSize: 11, color: C.subtle, textAlign: 'center', fontStyle: 'italic' },
});

export default WalkBoundaryScreen;
