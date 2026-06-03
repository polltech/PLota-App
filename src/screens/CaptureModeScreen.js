import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const METHODS = [
  {
    mode:  'walk',
    icon:  'walk-outline',
    color: C.c700,
    bg:    C.c100,
    title: 'GPS Walk',
    desc:  'Walk the farm perimeter. Press "Capture Point" at each corner to mark your boundary. Best for farms you can walk around.',
    badge: 'Recommended',
    badgeColor: '#15803d',
    badgeBg:    '#dcfce7',
  },
  {
    mode:  'click',
    icon:  'locate-outline',
    color: '#3b82f6',
    bg:    '#dbeafe',
    title: 'GPS Click',
    desc:  'Your live GPS position is shown on the map. Tap anywhere on the map to mark boundary points. Good when you can see the whole farm.',
    badge: null,
  },
  {
    mode:  'draw',
    icon:  'pencil-outline',
    color: '#7c3aed',
    bg:    '#ede9fe',
    title: 'Manual Draw',
    desc:  'No GPS required. Tap directly on the map to place boundary corners. Use when offline or GPS is unavailable.',
    badge: 'Works Offline',
    badgeColor: '#1d4ed8',
    badgeBg:    '#dbeafe',
  },
  {
    mode:  'import',
    icon:  'code-download-outline',
    color: '#059669',
    bg:    '#d1fae5',
    title: 'Import Coordinates',
    desc:  'Paste latitude/longitude pairs (one per line) or a GeoJSON polygon. Ideal if you already have boundary data from another system.',
    badge: null,
  },
];

export default function CaptureModeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { farmId, farm } = route.params || {};

  const handleSelect = (mode) => {
    if (mode === 'import') {
      navigation.navigate('CaptureImport', { farmId, farm });
    } else {
      navigation.navigate('WalkBoundary', { farmId, farm, captureMode: mode });
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
            <Text style={s.title}>Capture Boundary</Text>
            <Text style={s.subtitle} numberOfLines={1}>
              {farm?.farm_name || farmId || 'Select a capture method'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>Choose how to capture the farm boundary</Text>

          {METHODS.map((m) => (
            <TouchableOpacity
              key={m.mode}
              style={s.card}
              onPress={() => handleSelect(m.mode)}
              activeOpacity={0.8}
            >
              <View style={[s.iconWrap, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={26} color={m.color} />
              </View>

              <View style={s.cardBody}>
                <View style={s.cardTitleRow}>
                  <Text style={s.cardTitle}>{m.title}</Text>
                  {m.badge && (
                    <View style={[s.badge, { backgroundColor: m.badgeBg }]}>
                      <Text style={[s.badgeText, { color: m.badgeColor }]}>{m.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={s.cardDesc}>{m.desc}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={C.subtle} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={s.backBtnText}>Back</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  safe:      { flex: 1 },

  header:    { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  backBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 18, fontWeight: '800', color: C.ink },
  subtitle:  { fontSize: 12, color: C.muted, marginTop: 1 },

  content:      { padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16 },
  backBtn:      { height: 54, borderRadius: 16, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backBtnText:  { fontSize: 15, fontWeight: '800', color: C.steel600 },

  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  iconWrap:     { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody:     { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  cardTitle:    { fontSize: 15, fontWeight: '800', color: C.ink },
  badge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeText:    { fontSize: 10, fontWeight: '800' },
  cardDesc:     { fontSize: 12, color: C.muted, lineHeight: 17 },
});
