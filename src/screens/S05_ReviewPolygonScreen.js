import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polygon } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, API_KEY } from '../config';
import { dbService } from '../services/database';
import { C } from '../theme';

// Step progress bar
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

const getMapRegion = (coords) => {
  const lats = coords.map((c) => c.latitude);
  const lngs = coords.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.35;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * (1 + pad), 0.001),
    longitudeDelta: Math.max((maxLng - minLng) * (1 + pad), 0.001),
  };
};

const ReviewPolygonScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, farm, polygonCoords, areaHectares, perimeterMeters, pointsCount } =
    route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Persist or retrieve a stable device ID
      let deviceId = await SecureStore.getItemAsync('device_id');
      if (!deviceId) {
        deviceId = `android-${Date.now()}`;
        await SecureStore.setItemAsync('device_id', deviceId);
      }

      const capturePayload = {
        farmId,
        parcelName: farm?.farm_name || farm?.name || null,
        polygonCoords,
        areaHectares,
        perimeterMeters,
        pointsCount,
        capturedAt: new Date().toISOString(),
        deviceInfo: {
          device_id: deviceId,
          model: 'Android',
          app_version: '1.0.0',
        },
        notes: null,
        topologyValidated: true,
        validationWarnings: [],
      };

      // Save locally first (offline-first)
      const localId = await dbService.savePolygonCapture(capturePayload);

      // Build API payload
      const apiPayload = {
        farm_id: farmId,
        parcel_name: capturePayload.parcelName,
        polygon_coordinates: polygonCoords.map((p) => ({
          lat: p.latitude,
          lng: p.longitude,
        })),
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
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(apiPayload),
      });

      if (res.ok) {
        const result = await res.json();
        await dbService.updateSyncStatus(localId, 'synced');
        navigation.replace('Submitted', {
          captureId: result.record_id || result.id || localId,
          farmId,
          areaHectares,
          pointsCount,
        });
      } else {
        throw new Error(`Server error ${res.status}`);
      }
    } catch (error) {
      // Already saved locally — navigate to offline screen
      navigation.replace('OfflineSaved', {
        farmId,
        areaHectares,
        pointsCount,
        error: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const mapRegion = getMapRegion(polygonCoords);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
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
        {/* Map preview with actual polygon */}
        <MapView
          style={s.mapPreview}
          region={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          pointerEvents="none"
        >
          <Polygon
            coordinates={[...polygonCoords, polygonCoords[0]]}
            strokeColor={C.c600}
            fillColor="rgba(111,78,55,0.22)"
            strokeWidth={2}
          />
        </MapView>

        {/* Area card */}
        <View style={s.areaCard}>
          <Text style={s.areaVal}>{areaHectares.toFixed(4)}</Text>
          <Text style={s.areaUnit}>hectares — calculated area</Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statLabel}>Points</Text>
            <Text style={s.statVal}>{pointsCount} coords</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statLabel}>GPS accuracy</Text>
            <Text style={s.statVal}>3–5 m</Text>
          </View>
        </View>

        {/* Farm info */}
        <View style={s.infoRow}>
          <Text style={s.infoText} numberOfLines={1}>
            {farmId}
            {farm?.farm_name ? ` — ${farm.farm_name}` : ''}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[s.primaryBtn, isSubmitting && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.primaryBtnText}>Submit to Plotra →</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryBtnText}>Re-walk boundary</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 56 },
  headerCenter: { flex: 1, alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink2 },

  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  mapPreview: {
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.rule,
  },

  areaCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  areaVal: { fontSize: 38, fontWeight: '700', color: C.c700 },
  areaUnit: { fontSize: 13, color: C.muted, marginTop: 4 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: 14 },
  statDivider: { width: 1, backgroundColor: C.rule },
  statLabel: {
    fontSize: 11,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  statVal: { fontSize: 15, fontWeight: '600', color: C.ink2 },

  infoRow: {
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.rule,
  },
  infoText: { fontSize: 13, color: C.muted },

  primaryBtn: {
    backgroundColor: C.c600,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnDisabled: { backgroundColor: C.c200 },
  primaryBtnText: { color: C.white, fontSize: 16, fontWeight: '600' },

  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.c600,
  },
  secondaryBtnText: { color: C.c600, fontSize: 15, fontWeight: '600' },
});

export default ReviewPolygonScreen;
