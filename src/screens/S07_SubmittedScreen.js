import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { C } from '../theme';

const SubmittedScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { captureId, farmId, areaHectares = 0, pointsCount = 0 } =
    route.params || {};

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Status block */}
        <View style={s.statusBlock}>
          <View style={s.iconCircle}>
            <Text style={s.iconText}>✓</Text>
          </View>
          <Text style={s.statusTitle}>Polygon received</Text>
          <Text style={s.statusSub}>
            {farmId} is ready for satellite review
          </Text>
        </View>

        {/* Record card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardFarmId}>{farmId}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Synced</Text>
            </View>
          </View>
          <Text style={s.cardMeta}>
            {areaHectares.toFixed(4)} ha · {pointsCount} pts · synced{' '}
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {captureId && (
            <Text style={s.captureIdText}>Record ID: {captureId}</Text>
          )}
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => navigation.navigate('FarmIDEntry')}
            activeOpacity={0.8}
          >
            <Text style={s.primaryBtnText}>Capture another farm →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={() => navigation.navigate('QueueList')}
            activeOpacity={0.8}
          >
            <Text style={s.secondaryBtnText}>View all records</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },

  statusBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.syncedBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 36, color: C.c700 },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.c700,
    marginBottom: 8,
  },
  statusSub: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 21,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: C.rule,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardFarmId: { fontSize: 15, fontWeight: '700', color: C.ink2 },
  badge: {
    backgroundColor: C.syncedBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600', color: C.syncedText },
  cardMeta: { fontSize: 12, color: C.muted },
  captureIdText: {
    marginTop: 6,
    fontSize: 11,
    color: C.subtle,
  },

  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: C.c600,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
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

export default SubmittedScreen;
