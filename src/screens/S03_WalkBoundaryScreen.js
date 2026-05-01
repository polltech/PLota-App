import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
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
<style>*{margin:0;padding:0;box-sizing:border-box}#map{width:100vw;height:100vh}</style>
</head>
<body>
<div id="map"></div>
<script>
var map = L.map('map',{zoomControl:true});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM',maxZoom:20}).addTo(map);
map.setView([-0.5,37],6);
var locMarker=null, pts=[], polyline=null, polygon=null;

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
        locMarker=L.circleMarker(ll,{radius:9,color:'#2563eb',fillColor:'#3b82f6',fillOpacity:0.9,weight:2}).addTo(map);
        map.setView(ll,17);
      } else { locMarker.setLatLng(ll); }
    } else if(d.type==='add'){
      var m=L.circleMarker([d.lat,d.lng],{radius:7,color:'#5c2d0e',fillColor:'#6f4e37',fillOpacity:1,weight:2}).addTo(map);
      m.bindTooltip('P'+(pts.length+1),{permanent:true,direction:'top',offset:[0,-6]});
      pts.push(m); redraw();
    } else if(d.type==='undo'){
      if(pts.length>0){map.removeLayer(pts[pts.length-1]);pts.pop();redraw();}
    } else if(d.type==='clear'){
      pts.forEach(function(m){map.removeLayer(m);}); pts=[];
      if(polyline){map.removeLayer(polyline);polyline=null;}
      if(polygon){map.removeLayer(polygon);polygon=null;}
    }
  }catch(err){}
});

var pressTimer;
map.on('contextmenu',function(e){
  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'lp',lat:e.latlng.lat,lng:e.latlng.lng}));
});
map.getContainer().addEventListener('touchstart',function(e){
  var touch=e.touches[0];
  pressTimer=setTimeout(function(){
    var ll=map.containerPointToLatLng(L.point(touch.clientX,touch.clientY));
    window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'lp',lat:ll.lat,lng:ll.lng}));
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
  const [mapReady, setMapReady] = useState(false);

  const webViewRef = useRef(null);
  const locationSub = useRef(null);
  const pendingLocation = useRef(null);

  useEffect(() => {
    startLocation();
    return () => locationSub.current?.remove();
  }, []);

  useEffect(() => {
    if (markers.length >= 4) validatePolygon(markers);
    else setTopologyError(null);
  }, [markers]);

  const send = (obj) => {
    const js = `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(JSON.stringify(obj))}}));true;`;
    webViewRef.current?.injectJavaScript(js);
  };

  const startLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Location permission is needed for boundary capture');
      return;
    }
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 },
      (loc) => {
        setCurrentLocation(loc);
        setAccuracy(loc.coords.accuracy);
        const msg = { type: 'loc', lat: loc.coords.latitude, lng: loc.coords.longitude };
        if (mapReady) send(msg);
        else pendingLocation.current = msg;
      }
    );
  };

  const onMapReady = () => {
    setMapReady(true);
    if (pendingLocation.current) {
      send(pendingLocation.current);
      pendingLocation.current = null;
    }
  };

  const validatePolygon = (pts) => {
    try {
      const ring = [...pts.map((p) => [p.longitude, p.latitude]), [pts[0].longitude, pts[0].latitude]];
      const poly = turf.polygon([ring]);
      if (turf.kinks(poly).features.length > 0) {
        setTopologyError('Boundary lines cross. Walk in one direction without backtracking.');
        return;
      }
      if (turf.area(poly) / 10000 < 0.01) {
        setTopologyError('Area too small — add more points.');
        return;
      }
      setTopologyError(null);
    } catch (_) { setTopologyError(null); }
  };

  const handleMarkPoint = () => {
    if (!currentLocation) {
      Alert.alert('No GPS signal', 'Wait for GPS lock before marking a point.');
      return;
    }
    const { latitude, longitude } = currentLocation.coords;
    if (markers.length > 0) {
      const last = markers[markers.length - 1];
      const distM = turf.distance(turf.point([last.longitude, last.latitude]), turf.point([longitude, latitude]), { units: 'kilometers' }) * 1000;
      if (distM < 5) {
        Alert.alert('Too close', 'Move at least 5 m before marking the next point.');
        return;
      }
    }
    const pt = { id: Date.now().toString(), latitude, longitude };
    setMarkers((prev) => [...prev, pt]);
    send({ type: 'add', lat: latitude, lng: longitude });
  };

  const handleLongPressOnMap = (lat, lng) => {
    const pt = { id: Date.now().toString(), latitude: lat, longitude: lng };
    setMarkers((prev) => [...prev, pt]);
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

  const handleSave = () => {
    if (markers.length < 4) { Alert.alert('Not enough points', 'Mark at least 4 boundary points.'); return; }
    if (topologyError) { Alert.alert('Boundary error', 'Fix the boundary error before continuing.'); return; }
    const ring = [...markers.map((p) => [p.longitude, p.latitude]), [markers[0].longitude, markers[0].latitude]];
    const poly = turf.polygon([ring]);
    navigation.navigate('ReviewPolygon', {
      farmId, farm,
      polygonCoords: markers.map((m) => ({ latitude: m.latitude, longitude: m.longitude })),
      areaHectares: turf.area(poly) / 10000,
      perimeterMeters: turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000,
      pointsCount: markers.length,
    });
  };

  const onWebViewMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'lp') handleLongPressOnMap(msg.lat, msg.lng);
    } catch (_) {}
  };

  const accuracyColor = accuracy == null ? C.subtle : accuracy <= 5 ? C.c600 : accuracy <= 10 ? C.c400 : accuracy <= 30 ? C.pendingText : C.failedText;
  const canSave = markers.length >= 4 && !topologyError;

  return (
    <View style={s.container}>
      <WebView
        ref={webViewRef}
        source={{ html: MAP_HTML }}
        style={s.map}
        onLoad={onMapReady}
        onMessage={onWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        mixedContentMode="always"
        allowsInlineMediaPlayback
      />

      <View style={[s.topBar, { top: insets.top + 4 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={s.topTitle} numberOfLines={1}>Walk boundary{farmId ? ` · ${farmId}` : ''}</Text>
          <StepBar current={2} />
        </View>
        <View style={{ width: 56 }} />
      </View>

      {accuracy != null && (
        <View style={[s.accuracyPill, { top: insets.top + 70 }]}>
          <View style={[s.accuracyDot, { backgroundColor: accuracyColor }]} />
          <Text style={s.accuracyText}>GPS: {accuracy.toFixed(1)} m</Text>
          {accuracy > 10 && <Text style={s.accuracyWarn}> — poor signal</Text>}
        </View>
      )}

      {topologyError && (
        <View style={[s.errorBanner, { top: insets.top + 112 }]}>
          <Text style={s.errorTitle}>Boundary lines cross</Text>
          <Text style={s.errorMsg}>{topologyError}</Text>
        </View>
      )}

      <View style={[s.controls, { paddingBottom: insets.bottom + 12 }]}>
        <View style={s.statsRow}>
          <Text style={s.statsText}>Points marked: <Text style={s.statsCount}>{markers.length}</Text></Text>
          {markers.length >= 4
            ? <Text style={s.statsGood}>min. 4 required ✓</Text>
            : <Text style={s.statsNeed}>{4 - markers.length} more needed</Text>}
        </View>

        <TouchableOpacity
          style={[s.markBtn, !currentLocation && s.markBtnDisabled]}
          onPress={handleMarkPoint}
          activeOpacity={0.85}
        >
          <Text style={s.markBtnText}>{currentLocation ? '+ Mark point here' : 'Waiting for GPS…'}</Text>
        </TouchableOpacity>

        <View style={s.btnRow}>
          <TouchableOpacity style={[s.undoBtn, markers.length === 0 && s.btnOff]} onPress={handleUndo} disabled={markers.length === 0} activeOpacity={0.8}>
            <Text style={[s.undoBtnText, markers.length === 0 && s.textOff]}>Undo last</Text>
          </TouchableOpacity>
          {topologyError ? (
            <TouchableOpacity style={[s.saveBtn, s.saveBtnDanger]} onPress={handleClear} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>Clear and restart</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.saveBtn, !canSave && s.saveBtnOff]} onPress={handleSave} disabled={!canSave} activeOpacity={0.8}>
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
  topBar: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1, borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 56 },
  topCenter: { flex: 1, alignItems: 'center', gap: 6 },
  topTitle: { fontSize: 13, fontWeight: '600', color: C.ink2 },
  accuracyPill: {
    position: 'absolute', left: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
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
