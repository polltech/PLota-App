import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Image,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as turf from '@turf/turf';
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
    polygon=L.polygon(coords,{color:'#5c2d0e',fillColor:'#6f4e37',fillOpacity:0.35,weight:4}).addTo(map);
  } else if(coords.length>=2){
    polyline=L.polyline(coords,{color:'#5c2d0e',weight:4,dashArray:'8, 12'}).addTo(map);
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
      var m=L.circleMarker([d.lat,d.lng],{radius:8,color:'#fff',fillColor:'#5c2d0e',fillOpacity:1,weight:3}).addTo(map);
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
  const { farmId, farm } = route.params || {};

  const [currentLocation, setCurrentLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [pointAccuracies, setPointAccuracies] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('Initializing GPS...');

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
    startLocation();
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
        Alert.alert('GPS Disabled', 'Please enable location services (GPS) in your device settings to continue.');
        return;
      }

      setGpsStatus('Requesting permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('Permission denied');
        Alert.alert('Permission Denied', 'Location access is required to capture farm boundaries.');
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
        console.warn('Initial position failed:', posErr.message);
      }

      setGpsStatus('Waiting for high accuracy lock...');

      // Auto-dismiss loading after 12 seconds if we have at least SOME location
      const timeoutTimer = setTimeout(() => {
        if (currentLocationRef.current) {
          console.log('GPS calibration timeout - proceeding with current accuracy');
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
        console.warn('Watcher failed, falling back to lower accuracy:', watchErr.message);
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
      console.error('GPS Start Error:', err);
      Alert.alert('Location Error', 'Could not initialize GPS. Please check your settings and try again.');
    }
  };

  const handleMarkPoint = () => {
    if (isManualMode) {
      Alert.alert('Manual Override', 'Tap the map at the boundary location to add points.');
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

    navigation.navigate('ReviewPolygon', {
      farmId, farm,
      polygonCoords: markers.map(m => ({ latitude: m.latitude, longitude: m.longitude })),
      areaHectares: turf.area(poly) / 10000,
      perimeterMeters: turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000,
      pointsCount: markers.length,
      accuracyM: avgAccuracy,
    });
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
          if (msg.type === 'click' && isManualMode) {
            setMarkers(prev => [...prev, { id: Date.now(), latitude: msg.lat, longitude: msg.lng }]);
            send({ type: 'add', lat: msg.lat, lng: msg.lng });
          }
        }}
        style={s.map}
      />

      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.roundBtn}>
          <Text style={s.roundBtnText}>✕</Text>
        </TouchableOpacity>

        <View style={s.logoMiniWrap}>
          <Image source={require('../../assets/logo.jpeg')} style={s.logoMini} />
        </View>

        <View style={s.headerInfo}>
          <Text style={s.headerTitle} numberOfLines={1}>{farm?.farm_name || 'Boundary Capture'}</Text>
          <Text style={s.headerSubtitle}>#{farmId}</Text>
        </View>

        <TouchableOpacity onPress={() => send({ type: 'center' })} style={s.roundBtn}>
          <Text style={s.roundBtnText}>📍</Text>
        </TouchableOpacity>
      </View>

      {topologyError && (
        <View style={[s.errorBanner, { top: insets.top + 80 }]}>
          <Text style={s.errorTitle}>⚠ Boundary Error</Text>
          <Text style={s.errorMsg}>{topologyError}</Text>
        </View>
      )}

      <View style={[s.accuracyBox, { top: insets.top + (topologyError ? 150 : 85) }]}>
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

          <TouchableOpacity
            style={[s.modeToggle, isManualMode && s.modeActive]}
            onPress={() => setIsManualMode(!isManualMode)}
          >
            <View style={[s.modeIcon, isManualMode && s.modeIconActive]}>
              <Text style={s.modeIconText}>{isManualMode ? '📍' : '🚶'}</Text>
            </View>
            <Text style={[s.modeText, isManualMode && s.modeTextActive]}>
              {isManualMode ? 'Manual' : 'Walk'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.markBtn, (!currentLocation && !isManualMode) && s.btnDisabled]}
          onPress={handleMarkPoint}
          activeOpacity={0.8}
        >
          <Text style={s.markBtnText}>{isManualMode ? 'Tap Map to Add Point' : 'Capture Current Point'}</Text>
        </TouchableOpacity>

        <View style={s.actionRow}>
          <TouchableOpacity style={s.undoBtn} onPress={() => { setMarkers(m => m.slice(0, -1)); send({ type: 'undo' }); }}>
            <Text style={s.undoBtnText}>Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, markers.length < 4 && s.btnDisabled]}
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={s.saveBtnText}>Review & Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {gpsLoading && !isManualMode && (
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
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: C.steel200, zIndex: 100 },
  roundBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  roundBtnText: { fontSize: 18, fontWeight: 'bold', color: C.steel700 },

  logoMiniWrap: { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', marginHorizontal: 12, borderWidth: 1.5, borderColor: C.steel200 },
  logoMini: { width: '100%', height: '100%' },

  headerInfo: { flex: 1, alignItems: 'flex-start' },
  headerTitle: { fontSize: 14, fontWeight: '800', color: C.ink, textTransform: 'uppercase', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, color: C.muted, fontWeight: '700' },

  errorBanner: { position: 'absolute', left: 20, right: 20, backgroundColor: C.failedBg, borderRadius: 16, padding: 15, borderWidth: 1.5, borderColor: C.failedText, zIndex: 100 },
  errorTitle: { fontSize: 13, fontWeight: '900', color: C.failedText, textTransform: 'uppercase', marginBottom: 2 },
  errorMsg: { fontSize: 12, color: C.ink, fontWeight: '600', lineHeight: 16 },

  accuracyBox: { position: 'absolute', left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowOpacity: 0.1, elevation: 5, zIndex: 100 },
  accDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  accText: { fontSize: 12, fontWeight: '800', color: C.steel700 },
  accWarn: { fontSize: 11, fontWeight: '700', color: '#dc2626' },

  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28, paddingBottom: 45, shadowColor: '#000', shadowOffset: { width: 0, height: -12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 25 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  statLabel: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: 32, fontWeight: '900', color: C.ink },
  statUnit: { fontSize: 14, color: C.muted, fontWeight: '600', marginLeft: 6 },

  modeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.steel100, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: C.steel200 },
  modeActive: { backgroundColor: C.c700, borderColor: C.c800 },
  modeIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  modeIconActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  modeIconText: { fontSize: 16 },
  modeText: { fontSize: 14, fontWeight: '800', color: C.steel700 },
  modeTextActive: { color: C.white },

  markBtn: { backgroundColor: C.ink, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 },
  markBtnText: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.3, elevation: 0 },

  actionRow: { flexDirection: 'row', gap: 15 },
  undoBtn: { flex: 1, height: 58, borderRadius: 20, borderWidth: 2, borderColor: C.steel200, alignItems: 'center', justifyContent: 'center' },
  undoBtnText: { fontSize: 16, fontWeight: '800', color: C.steel600 },
  saveBtn: { flex: 2, backgroundColor: C.c700, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  saveBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },

  gpsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  gpsLoadingCard: { width: '85%', backgroundColor: C.white, borderRadius: 28, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 15 },
  gpsLoadingTitle: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 20, marginBottom: 8 },
  gpsLoadingMsg: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  gpsSkipBtn: { backgroundColor: C.steel100, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginBottom: 15 },
  gpsSkipText: { fontSize: 14, fontWeight: '700', color: C.steel600 },
  gpsHint: { fontSize: 12, color: C.subtle, textAlign: 'center', fontStyle: 'italic' },
});

export default WalkBoundaryScreen;
