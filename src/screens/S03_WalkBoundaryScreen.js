import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as turf from '@turf/turf';
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

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
#map{width:100vw;height:100vh}
#centerBtn{
  position:absolute;bottom:16px;right:16px;z-index:1000;
  background:#fff;border:2px solid #6f4e37;border-radius:50%;
  width:44px;height:44px;display:flex;align-items:center;justify-content:center;
  font-size:22px;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.25);
}
</style>
</head>
<body>
<div id="map"></div>
<div id="centerBtn" onclick="reCenter()">📍</div>
<script>
var map = L.map('map',{zoomControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:20}).addTo(map);
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
    polygon=L.polygon(coords,{color:'#6f4e37',fillColor:'#6f4e37',fillOpacity:0.2,weight:2}).addTo(map);
  } else if(coords.length>=2){
    polyline=L.polyline(coords,{color:'#6f4e37',weight:2}).addTo(map);
  }
}

window.addEventListener('message',function(e){
  try{
    var d=JSON.parse(e.data);
    if(d.type==='loc'){
      var ll=[d.lat,d.lng];
      if(!locMarker){
        locMarker=L.circleMarker(ll,{
          radius:10,color:'#1d4ed8',fillColor:'#3b82f6',
          fillOpacity:0.95,weight:3
        }).addTo(map);
        map.setView(ll,19);
      } else {
        locMarker.setLatLng(ll);
        if(followUser) map.panTo(ll,{animate:true,duration:0.5});
      }
      if(d.acc && d.acc < 200){
        if(!accCircle){
          accCircle=L.circle(ll,{
            radius:d.acc,color:'#3b82f6',
            fillColor:'#93c5fd',fillOpacity:0.18,weight:1
          }).addTo(map);
        } else {
          accCircle.setLatLng(ll);
          accCircle.setRadius(d.acc);
        }
      }
    } else if(d.type==='add'){
      var n=pts.length+1;
      var m=L.circleMarker([d.lat,d.lng],{
        radius:7,color:'#5c2d0e',fillColor:'#6f4e37',fillOpacity:1,weight:2
      }).addTo(map);
      m.bindTooltip('P'+n,{permanent:true,direction:'top',offset:[0,-6]});
      pts.push(m); redraw();
    } else if(d.type==='undo'){
      if(pts.length>0){map.removeLayer(pts[pts.length-1]);pts.pop();redraw();}
    } else if(d.type==='clear'){
      pts.forEach(function(m){map.removeLayer(m);}); pts=[];
      if(polyline){map.removeLayer(polyline);polyline=null;}
      if(polygon){map.removeLayer(polygon);polygon=null;}
    } else if(d.type==='center'){
      reCenter();
    }
  }catch(err){}
});

var pressTimer;
map.getContainer().addEventListener('touchstart',function(e){
  var touch=e.touches[0];
  pressTimer=setTimeout(function(){
    var ll=map.containerPointToLatLng(L.point(touch.clientX,touch.clientY));
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(
      JSON.stringify({type:'lp',lat:ll.lat,lng:ll.lng})
    );
  },700);
},{passive:true});
map.getContainer().addEventListener('touchend',function(){clearTimeout(pressTimer);},{passive:true});
map.getContainer().addEventListener('touchmove',function(){clearTimeout(pressTimer);},{passive:true});
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
  const [accuracy, setAccuracy] = useState(null);
  const [topologyError, setTopologyError] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  // Use ref for mapReady to avoid stale closure in location watcher
  const mapReadyRef = useRef(false);
  const currentLocationRef = useRef(null);

  // Safe WebView message sender
  const send = useCallback((obj) => {
    try {
      if (!webViewRef.current || !mapReadyRef.current) return;
      const js = `(function(){try{window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}}));}catch(e){}})();true;`;
      webViewRef.current.injectJavaScript(js);
    } catch (_) {}
  }, []);

  useEffect(() => {
    startLocation();
    return () => {
      try { locationSub.current?.remove(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    if (markers.length >= 4) validatePolygon(markers);
    else setTopologyError(null);
  }, [markers]);

  const startLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is needed to capture the boundary.');
        return;
      }
      locationSub.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 0.5,
        },
        (loc) => {
          try {
            const { latitude, longitude, accuracy: acc } = loc.coords;
            setCurrentLocation(loc);
            setAccuracy(acc);
            currentLocationRef.current = loc;
            // Use ref — never stale, unlike state in closure
            send({ type: 'loc', lat: latitude, lng: longitude, acc: acc ?? 99 });
          } catch (_) {}
        }
      );
    } catch (e) {
      Alert.alert('GPS error', e.message || 'Could not start GPS tracking.');
    }
  };

  const onMapReady = useCallback(() => {
    mapReadyRef.current = true;
    setMapLoading(false);
    if (currentLocationRef.current) {
      const { latitude, longitude, accuracy: acc } = currentLocationRef.current.coords;
      send({ type: 'loc', lat: latitude, lng: longitude, acc: acc ?? 99 });
    }
  }, [send]);

  const validatePolygon = (pts) => {
    try {
      if (pts.length < 3) return;
      const ring = [...pts.map((p) => [p.longitude, p.latitude]), [pts[0].longitude, pts[0].latitude]];
      const poly = turf.polygon([ring]);
      if (turf.kinks(poly).features.length > 0) {
        setTopologyError('Boundary lines cross — walk in one direction without backtracking.');
        return;
      }
      if (turf.area(poly) / 10000 < 0.01) {
        setTopologyError('Area too small — add more points further apart.');
        return;
      }
      setTopologyError(null);
    } catch (_) { setTopologyError(null); }
  };

  const handleMarkPoint = () => {
    const loc = currentLocationRef.current;
    if (!loc) {
      Alert.alert('No GPS signal', 'Wait for GPS lock before marking a point.');
      return;
    }
    const { latitude, longitude } = loc.coords;
    if (markers.length > 0) {
      const last = markers[markers.length - 1];
      try {
        const distM = turf.distance(
          turf.point([last.longitude, last.latitude]),
          turf.point([longitude, latitude]),
          { units: 'kilometers' }
        ) * 1000;
        if (distM < 3) {
          Alert.alert('Too close', 'Move at least 3 m before marking the next point.');
          return;
        }
      } catch (_) {}
    }
    const pt = { id: Date.now().toString(), latitude, longitude };
    setMarkers((prev) => [...prev, pt]);
    send({ type: 'add', lat: latitude, lng: longitude });
  };

  const handleLongPressOnMap = (lat, lng) => {
    const pt = { id: Date.now().toString(), latitude: lat, longitude: lng };
    setMarkers((prev) => [...prev, pt]);
    send({ type: 'add', lat, lng });
  };

  const handleUndo = () => {
    setMarkers((prev) => prev.slice(0, -1));
    send({ type: 'undo' });
  };

  const handleClear = () => {
    setMarkers([]);
    setTopologyError(null);
    send({ type: 'clear' });
  };

  const handleCenter = () => send({ type: 'center' });

  const handleSave = () => {
    if (markers.length < 4) { Alert.alert('Not enough points', 'Mark at least 4 boundary points.'); return; }
    if (topologyError) { Alert.alert('Boundary error', topologyError); return; }
    try {
      const ring = [...markers.map((p) => [p.longitude, p.latitude]), [markers[0].longitude, markers[0].latitude]];
      const poly = turf.polygon([ring]);
      navigation.navigate('ReviewPolygon', {
        farmId, farm,
        polygonCoords: markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
        areaHectares: turf.area(poly) / 10000,
        perimeterMeters: turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000,
        pointsCount: markers.length,
      });
    } catch (e) {
      Alert.alert('Error', 'Could not calculate polygon area. Try adding more points.');
    }
  };

  const onWebViewMessage = useCallback((e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'lp') handleLongPressOnMap(msg.lat, msg.lng);
    } catch (_) {}
  }, []);

  const accuracyColor = accuracy == null ? C.subtle
    : accuracy <= 5 ? C.c600
    : accuracy <= 10 ? C.c400
    : accuracy <= 30 ? C.pendingText
    : C.failedText;

  const canSave = markers.length >= 4 && !topologyError;

  return (
    <View style={s.container}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={s.map}
        onLoad={onMapReady}
        onMessage={onWebViewMessage}
        onError={() => { setMapError(true); setMapLoading(false); }}
        onHttpError={() => { setMapError(true); setMapLoading(false); }}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        cacheEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
      />
      {mapLoading && (
        <View style={s.mapOverlay}>
          <ActivityIndicator size="large" color={C.c600} />
          <Text style={s.mapOverlayText}>Loading map…</Text>
        </View>
      )}
      {mapError && (
        <View style={s.mapOverlay}>
          <Text style={s.mapErrorText}>Map unavailable — you can still mark points using GPS</Text>
          <TouchableOpacity onPress={() => { setMapError(false); setMapLoading(true); webViewRef.current?.reload(); }} style={s.reloadBtn}>
            <Text style={s.reloadBtnText}>Retry map</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.topBar, { top: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topTitle} numberOfLines={1}>
            Walk boundary{farmId ? ` · ${farmId}` : ''}
          </Text>
          <StepBar current={2} />
        </View>
        <TouchableOpacity onPress={handleCenter} hitSlop={8} style={s.centerBtn}>
          <Text style={s.centerBtnText}>📍</Text>
        </TouchableOpacity>
      </View>

      {accuracy != null && (
        <View style={[s.accuracyPill, { top: insets.top + 66 }]}>
          <View style={[s.accuracyDot, { backgroundColor: accuracyColor }]} />
          <Text style={s.accuracyText}>GPS ±{accuracy.toFixed(1)} m</Text>
          {accuracy > 15 && <Text style={s.accuracyWarn}> — move to open sky</Text>}
        </View>
      )}

      {topologyError && (
        <View style={[s.errorBanner, { top: insets.top + 112 }]}>
          <Text style={s.errorTitle}>⚠ Boundary error</Text>
          <Text style={s.errorMsg}>{topologyError}</Text>
        </View>
      )}

      <View style={[s.controls, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.statsRow}>
          <Text style={s.statsText}>
            Points: <Text style={s.statsCount}>{markers.length}</Text>
          </Text>
          {markers.length >= 4
            ? <Text style={s.statsGood}>✓ enough points</Text>
            : <Text style={s.statsNeed}>{4 - markers.length} more needed</Text>}
        </View>

        <TouchableOpacity
          style={[s.markBtn, !currentLocation && s.markBtnDisabled]}
          onPress={handleMarkPoint}
          activeOpacity={0.85}
        >
          <Text style={s.markBtnText}>
            {currentLocation ? '＋ Mark point here' : 'Waiting for GPS…'}
          </Text>
        </TouchableOpacity>

        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.undoBtn, markers.length === 0 && s.btnOff]}
            onPress={handleUndo}
            disabled={markers.length === 0}
            activeOpacity={0.8}
          >
            <Text style={[s.undoBtnText, markers.length === 0 && s.textOff]}>Undo</Text>
          </TouchableOpacity>

          {topologyError ? (
            <TouchableOpacity style={[s.saveBtn, s.saveBtnDanger]} onPress={handleClear} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>Clear &amp; restart</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.saveBtn, !canSave && s.saveBtnOff]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={[s.saveBtnText, !canSave && s.textOff]}>Save polygon ›</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center',
    gap: 12,
  },
  mapOverlayText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 32 },
  mapErrorText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingHorizontal: 32, lineHeight: 22 },
  reloadBtn: { backgroundColor: C.c600, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  reloadBtnText: { color: C.white, fontWeight: '600' },
  topBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomWidth: 1, borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 50 },
  topCenter: { flex: 1, alignItems: 'center', gap: 6 },
  topTitle: { fontSize: 13, fontWeight: '600', color: C.ink2 },
  centerBtn: { width: 36, alignItems: 'center' },
  centerBtnText: { fontSize: 20 },
  accuracyPill: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.97)',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, elevation: 3,
  },
  accuracyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  accuracyText: { fontSize: 12, color: C.ink2, fontWeight: '500' },
  accuracyWarn: { fontSize: 11, color: C.pendingText },
  errorBanner: {
    position: 'absolute', left: 16, right: 16,
    backgroundColor: C.failedBg,
    borderLeftWidth: 4, borderLeftColor: C.failedText,
    borderRadius: 8, padding: 12,
  },
  errorTitle: { fontSize: 13, fontWeight: '700', color: C.failedText, marginBottom: 2 },
  errorMsg: { fontSize: 12, color: C.muted, lineHeight: 17 },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 18, borderTopRightRadius: 18,
    paddingHorizontal: 16, paddingTop: 14,
    elevation: 8,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statsText: { fontSize: 13, color: C.muted },
  statsCount: { color: C.ink2, fontWeight: '700' },
  statsGood: { fontSize: 12, color: C.c600, fontWeight: '600' },
  statsNeed: { fontSize: 12, color: C.pendingText, fontWeight: '500' },
  markBtn: { backgroundColor: C.c800, paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  markBtnDisabled: { backgroundColor: C.c200 },
  markBtnText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  btnRow: { flexDirection: 'row', gap: 10 },
  undoBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', borderWidth: 1.5, borderColor: C.c600 },
  undoBtnText: { color: C.c600, fontWeight: '600', fontSize: 14 },
  btnOff: { borderColor: C.rule },
  textOff: { color: C.subtle },
  saveBtn: { flex: 2, backgroundColor: C.c600, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  saveBtnOff: { backgroundColor: C.c100 },
  saveBtnDanger: { backgroundColor: C.failedText },
  saveBtnText: { color: C.white, fontWeight: '600', fontSize: 14 },
});

export default WalkBoundaryScreen;
