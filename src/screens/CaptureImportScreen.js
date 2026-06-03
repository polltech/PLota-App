import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as turf from '@turf/turf';
import { C } from '../theme';

const EXAMPLE_COORDS = `-1.2345, 36.7890
-1.2350, 36.7900
-1.2360, 36.7895
-1.2355, 36.7880`;

const EXAMPLE_GEOJSON = `{
  "type": "Polygon",
  "coordinates": [[
    [36.7890, -1.2345],
    [36.7900, -1.2350],
    [36.7895, -1.2360],
    [36.7880, -1.2355]
  ]]
}`;

function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('No data entered.');

  // Try JSON first (GeoJSON)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const obj = JSON.parse(trimmed);
    let coords = null;

    if (obj.type === 'FeatureCollection' && obj.features?.length > 0) {
      const f = obj.features.find(f => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon');
      if (f) coords = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
    } else if (obj.type === 'Feature' && obj.geometry) {
      coords = obj.geometry.type === 'Polygon' ? obj.geometry.coordinates[0] : null;
    } else if (obj.type === 'Polygon') {
      coords = obj.coordinates[0];
    } else if (obj.type === 'MultiPolygon') {
      coords = obj.coordinates[0][0];
    } else if (Array.isArray(obj) && Array.isArray(obj[0])) {
      coords = obj;
    }

    if (!coords || coords.length < 3) throw new Error('GeoJSON must contain at least 3 coordinate pairs.');

    // GeoJSON is [lon, lat] — convert to {latitude, longitude}
    return coords
      .filter(c => Array.isArray(c) && c.length >= 2)
      .map(c => ({ longitude: Number(c[0]), latitude: Number(c[1]) }));
  }

  // Plain text: lat,lon one per line
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const points = lines.map((line, i) => {
    const parts = line.split(/[\s,;]+/).filter(Boolean);
    if (parts.length < 2) throw new Error(`Line ${i + 1}: expected "lat, lon" but got "${line}"`);
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (isNaN(lat) || isNaN(lon)) throw new Error(`Line ${i + 1}: invalid numbers.`);
    if (lat < -90 || lat > 90)   throw new Error(`Line ${i + 1}: latitude must be between -90 and 90.`);
    if (lon < -180 || lon > 180) throw new Error(`Line ${i + 1}: longitude must be between -180 and 180.`);
    return { latitude: lat, longitude: lon };
  });

  if (points.length < 3) throw new Error('Need at least 3 coordinate pairs to form a boundary.');
  return points;
}

export default function CaptureImportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farmId, farm, formData } = route.params || {};

  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [showExample, setShowExample] = useState(null); // 'coords' | 'geojson'

  const handleImport = () => {
    setError('');
    try {
      const points = parseInput(text);

      // Close the ring for turf
      const ring = [...points.map(p => [p.longitude, p.latitude]), [points[0].longitude, points[0].latitude]];
      const poly = turf.polygon([ring]);

      const polygonData = {
        polygonCoords:   points,
        areaHectares:    turf.area(poly) / 10000,
        perimeterMeters: turf.length(turf.lineString(ring), { units: 'kilometers' }) * 1000,
        pointsCount:     points.length,
        accuracyM:       0,
      };

      if (formData) {
        navigation.navigate('AdvancedCapture', { formData, polygonData });
      } else {
        navigation.navigate('ReviewPolygon', { farmId, farm, ...polygonData });
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Import Coordinates</Text>
            <Text style={s.subtitle} numberOfLines={1}>{farm?.farm_name || farmId || ''}</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Format info */}
            <View style={s.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#1d4ed8" />
              <Text style={s.infoText}>
                Paste latitude/longitude pairs <Text style={s.bold}>(one per line)</Text> or a <Text style={s.bold}>GeoJSON</Text> Polygon / FeatureCollection.
              </Text>
            </View>

            {/* Input */}
            <Text style={s.label}>Coordinates or GeoJSON</Text>
            <TextInput
              style={[s.input, !!error && s.inputError]}
              value={text}
              onChangeText={(v) => { setText(v); setError(''); }}
              placeholder={`-1.2345, 36.7890\n-1.2350, 36.7900\n-1.2360, 36.7895\n...`}
              placeholderTextColor={C.subtle}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!error && (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Examples */}
            <View style={s.exampleRow}>
              <Text style={s.exampleHeading}>Examples:</Text>
              <TouchableOpacity onPress={() => setShowExample(showExample === 'coords' ? null : 'coords')}>
                <Text style={s.exampleToggle}>Lat/Lon pairs {showExample === 'coords' ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowExample(showExample === 'geojson' ? null : 'geojson')}>
                <Text style={s.exampleToggle}>GeoJSON {showExample === 'geojson' ? '▲' : '▼'}</Text>
              </TouchableOpacity>
            </View>

            {showExample === 'coords' && (
              <View style={s.exampleBlock}>
                <Text style={s.exampleCode}>{EXAMPLE_COORDS}</Text>
                <TouchableOpacity style={s.useExampleBtn} onPress={() => { setText(EXAMPLE_COORDS); setShowExample(null); }}>
                  <Text style={s.useExampleText}>Use this example</Text>
                </TouchableOpacity>
              </View>
            )}

            {showExample === 'geojson' && (
              <View style={s.exampleBlock}>
                <Text style={s.exampleCode}>{EXAMPLE_GEOJSON}</Text>
                <TouchableOpacity style={s.useExampleBtn} onPress={() => { setText(EXAMPLE_GEOJSON); setShowExample(null); }}>
                  <Text style={s.useExampleText}>Use this example</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={s.navRow}>
              <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Text style={s.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.nextBtn, !text.trim() && s.nextBtnDisabled]}
                onPress={handleImport}
                disabled={!text.trim()}
                activeOpacity={0.85}
              >
                <Text style={s.nextBtnText}>Next</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  safe:      { flex: 1 },

  header:   { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  backBtn:  { width: 36, height: 36, borderRadius: 10, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 18, fontWeight: '800', color: C.ink },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 1 },

  content: { padding: 20 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#dbeafe', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18 },
  bold:     { fontWeight: '800' },

  label:      { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input:      { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.steel200, padding: 14, fontSize: 13, color: C.ink, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', minHeight: 180, marginBottom: 8 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fff5f5' },

  errorRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 12 },
  errorText: { flex: 1, fontSize: 12, color: '#dc2626', fontWeight: '600' },

  exampleRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' },
  exampleHeading: { fontSize: 12, fontWeight: '700', color: C.muted },
  exampleToggle:  { fontSize: 12, fontWeight: '700', color: C.c700 },

  exampleBlock:   { backgroundColor: C.white, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: C.steel200 },
  exampleCode:    { fontSize: 12, color: C.ink, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 20 },
  useExampleBtn:  { marginTop: 10, alignSelf: 'flex-end' },
  useExampleText: { fontSize: 12, fontWeight: '700', color: C.c700 },

  navRow:        { flexDirection: 'row', gap: 12, marginTop: 8 },
  backBtn:       { flex: 1, height: 54, borderRadius: 14, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  backBtnText:   { fontSize: 15, fontWeight: '800', color: C.steel600 },
  nextBtn:       { flex: 2, height: 54, backgroundColor: C.c700, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnDisabled: { backgroundColor: C.steel300 },
  nextBtnText:   { fontSize: 15, fontWeight: '800', color: C.white },
});
