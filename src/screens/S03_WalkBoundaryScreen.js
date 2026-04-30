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
import MapView, { Polygon, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as turf from '@turf/turf';
import { C } from '../theme';

// Step progress bar (step 1=farm ID done, step 2=walk active, step 3=review idle)
const StepBar = ({ current }) => (
  <View style={sb.row}>
    {[1, 2, 3].map((s) => (
      <View
        key={s}
        style={[
          sb.seg,
          s < current && sb.done,
          s === current && sb.active,
          s > current && sb.idle,
        ]}
      />
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

const WalkBoundaryScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { farmId, farm } = route.params || {};

  const [currentLocation, setCurrentLocation] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [accuracy, setAccuracy] = useState(null);
  const [topologyError, setTopologyError] = useState(null);
  const mapRef = useRef(null);
  const locationSub = useRef(null);

  useEffect(() => {
    startLocation();
    return () => locationSub.current?.remove();
  }, []);

  // Re-validate whenever markers change
  useEffect(() => {
    if (markers.length >= 4) {
      validatePolygon(markers);
    } else {
      setTopologyError(null);
    }
  }, [markers]);

  const startLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Location permission is needed for boundary capture'
      );
      return;
    }
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        distanceInterval: 1,
      },
      (loc) => {
        setCurrentLocation(loc);
        setAccuracy(loc.coords.accuracy);
      }
    );
  };

  const validatePolygon = (pts) => {
    try {
      const ring = [
        ...pts.map((p) => [p.longitude, p.latitude]),
        [pts[0].longitude, pts[0].latitude],
      ];
      const poly = turf.polygon([ring]);
      const kinks = turf.kinks(poly);
      if (kinks.features.length > 0) {
        setTopologyError(
          'Boundary lines cross. Walk in one direction without backtracking.'
        );
        return;
      }
      const areaSqM = turf.area(poly);
      if (areaSqM / 10000 < 0.01) {
        setTopologyError('Area too small — add more points.');
        return;
      }
      setTopologyError(null);
    } catch (_) {
      setTopologyError(null);
    }
  };

  // Primary action: mark current GPS position
  const handleMarkPoint = () => {
    if (!currentLocation) {
      Alert.alert('No GPS signal', 'Wait for GPS lock before marking a point.');
      return;
    }
    const { latitude, longitude } = currentLocation.coords;

    // Enforce minimum 5 m between consecutive points
    if (markers.length > 0) {
      const last = markers[markers.length - 1];
      const from = turf.point([last.longitude, last.latitude]);
      const to = turf.point([longitude, latitude]);
      const distM = turf.distance(from, to, { units: 'kilometers' }) * 1000;
      if (distM < 5) {
        Alert.alert(
          'Too close',
          'Move at least 5 m before marking the next point.'
        );
        return;
      }
    }

    setMarkers((prev) => [
      ...prev,
      { id: Date.now().toString(), latitude, longitude },
    ]);
  };

  // Long-press on map also marks a point (useful for demo / testing)
  const handleMapLongPress = ({ nativeEvent: { coordinate } }) => {
    setMarkers((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      },
    ]);
  };

  const handleUndo = () =>
    setMarkers((prev) => prev.slice(0, -1));

  const handleClear = () => {
    setMarkers([]);
    setTopologyError(null);
  };

  const handleSave = () => {
    if (markers.length < 4) {
      Alert.alert('Not enough points', 'Mark at least 4 boundary points.');
      return;
    }
    if (topologyError) {
      Alert.alert('Boundary error', 'Fix the boundary error before continuing.');
      return;
    }

    const ring = [
      ...markers.map((p) => [p.longitude, p.latitude]),
      [markers[0].longitude, markers[0].latitude],
    ];
    const poly = turf.polygon([ring]);
    const areaHectares = turf.area(poly) / 10000;
    const perimeterMeters =
      turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000;

    navigation.navigate('ReviewPolygon', {
      farmId,
      farm,
      polygonCoords: markers.map((m) => ({
        latitude: m.latitude,
        longitude: m.longitude,
      })),
      areaHectares,
      perimeterMeters,
      pointsCount: markers.length,
    });
  };

  const polygonCoords = markers.map((m) => ({
    latitude: m.latitude,
    longitude: m.longitude,
  }));

  const accuracyColor =
    accuracy == null
      ? C.subtle
      : accuracy <= 5
      ? C.c600
      : accuracy <= 10
      ? C.c400
      : accuracy <= 30
      ? C.pendingText
      : C.failedText;

  const canSave = markers.length >= 4 && !topologyError;

  return (
    <View style={s.container}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        style={s.map}
        showsUserLocation
        followsUserLocation
        onLongPress={handleMapLongPress}
        initialRegion={
          currentLocation
            ? {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }
            : undefined
        }
      >
        {polygonCoords.length >= 3 && (
          <Polygon
            coordinates={[...polygonCoords, polygonCoords[0]]}
            strokeColor={topologyError ? C.failedText : C.c600}
            fillColor={
              topologyError
                ? 'rgba(198,40,40,0.15)'
                : 'rgba(111,78,55,0.2)'
            }
            strokeWidth={2}
          />
        )}
        {polygonCoords.length >= 2 && polygonCoords.length < 3 && (
          <Polyline
            coordinates={polygonCoords}
            strokeColor={C.c600}
            strokeWidth={2}
          />
        )}
        {markers.map((m, i) => (
          <Marker
            key={m.id}
            coordinate={{ latitude: m.latitude, longitude: m.longitude }}
            pinColor={C.c700}
            title={`Point ${i + 1}`}
          />
        ))}
      </MapView>

      {/* Top overlay */}
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
        <View style={{ width: 56 }} />
      </View>

      {/* GPS accuracy pill */}
      {accuracy != null && (
        <View style={[s.accuracyPill, { top: insets.top + 70 }]}>
          <View style={[s.accuracyDot, { backgroundColor: accuracyColor }]} />
          <Text style={s.accuracyText}>GPS: {accuracy.toFixed(1)} m</Text>
          {accuracy > 10 && (
            <Text style={s.accuracyWarn}> — poor signal</Text>
          )}
        </View>
      )}

      {/* Topology error banner */}
      {topologyError && (
        <View style={[s.errorBanner, { top: insets.top + 112 }]}>
          <View style={s.errorContent}>
            <Text style={s.errorTitle}>Boundary lines cross</Text>
            <Text style={s.errorMsg}>{topologyError}</Text>
          </View>
        </View>
      )}

      {/* Bottom controls */}
      <View style={[s.controls, { paddingBottom: insets.bottom + 12 }]}>
        {/* Points count */}
        <View style={s.statsRow}>
          <Text style={s.statsText}>
            Points marked:{' '}
            <Text style={s.statsCount}>{markers.length}</Text>
          </Text>
          {markers.length >= 4 ? (
            <Text style={s.statsGood}>min. 4 required ✓</Text>
          ) : (
            <Text style={s.statsNeed}>
              {4 - markers.length} more needed
            </Text>
          )}
        </View>

        {/* Mark Point button — primary action */}
        <TouchableOpacity
          style={[s.markBtn, !currentLocation && s.markBtnDisabled]}
          onPress={handleMarkPoint}
          activeOpacity={0.85}
        >
          <Text style={s.markBtnText}>
            {currentLocation ? '+ Mark point here' : 'Waiting for GPS…'}
          </Text>
        </TouchableOpacity>

        {/* Undo / Save row */}
        <View style={s.btnRow}>
          <TouchableOpacity
            style={[s.undoBtn, markers.length === 0 && s.btnOff]}
            onPress={handleUndo}
            disabled={markers.length === 0}
            activeOpacity={0.8}
          >
            <Text style={[s.undoBtnText, markers.length === 0 && s.textOff]}>
              Undo last
            </Text>
          </TouchableOpacity>

          {topologyError ? (
            <TouchableOpacity
              style={[s.saveBtn, s.saveBtnDanger]}
              onPress={handleClear}
              activeOpacity={0.8}
            >
              <Text style={s.saveBtnText}>Clear and restart</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.saveBtn, !canSave && s.saveBtnOff]}
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
            >
              <Text style={[s.saveBtnText, !canSave && s.textOff]}>
                Save polygon ›
              </Text>
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
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 56 },
  topCenter: { flex: 1, alignItems: 'center', gap: 6 },
  topTitle: { fontSize: 13, fontWeight: '600', color: C.ink2 },

  accuracyPill: {
    position: 'absolute',
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accuracyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  accuracyText: { fontSize: 12, color: C.ink2, fontWeight: '500' },
  accuracyWarn: { fontSize: 11, color: C.pendingText },

  errorBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: C.failedBg,
    borderLeftWidth: 4,
    borderLeftColor: C.failedText,
    borderRadius: 8,
    padding: 12,
  },
  errorContent: { flex: 1 },
  errorTitle: { fontSize: 13, fontWeight: '700', color: C.failedText, marginBottom: 2 },
  errorMsg: { fontSize: 12, color: C.muted, lineHeight: 17 },

  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsText: { fontSize: 13, color: C.muted },
  statsCount: { color: C.ink2, fontWeight: '700' },
  statsGood: { fontSize: 12, color: C.c600, fontWeight: '600' },
  statsNeed: { fontSize: 12, color: C.pendingText, fontWeight: '500' },

  markBtn: {
    backgroundColor: C.c800,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  markBtnDisabled: { backgroundColor: C.c200 },
  markBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  btnRow: { flexDirection: 'row', gap: 10 },
  undoBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.c600,
  },
  undoBtnText: { color: C.c600, fontWeight: '600', fontSize: 14 },
  btnOff: { borderColor: C.rule },
  textOff: { color: C.subtle },

  saveBtn: {
    flex: 2,
    backgroundColor: C.c600,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnOff: { backgroundColor: C.c100 },
  saveBtnDanger: { backgroundColor: C.failedText },
  saveBtnText: { color: C.white, fontWeight: '600', fontSize: 14 },
});

export default WalkBoundaryScreen;
