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

const OfflineSavedScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId = '', areaHectares = 0, pointsCount = 0, error } =
    route.params || {};

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        {/* Status block */}
        <View style={s.statusBlock}>
          <View style={s.iconCircle}>
            <Text style={s.iconText}>⌛</Text>
          </View>
          <Text style={s.statusTitle}>No connection</Text>
          <Text style={s.statusSub}>
            Saved locally. Will sync automatically{'\n'}when connectivity is restored.
          </Text>
        </View>

        {/* Record card */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardFarmId}>{farmId || '—'}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>Pending</Text>
            </View>
          </View>
          <Text style={s.cardMeta}>
            {areaHectares.toFixed(4)} ha · {pointsCount} pts · saved{' '}
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {error && (
            <Text style={s.errorText} numberOfLines={2}>
              {error}
            </Text>
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
            <Text style={s.secondaryBtnText}>View all queued</Text>
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
    backgroundColor: C.pendingBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: { fontSize: 36 },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: C.pendingText,
    marginBottom: 10,
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
    backgroundColor: C.pendingBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.pendingText,
  },
  cardMeta: { fontSize: 12, color: C.muted },
  errorText: {
    marginTop: 8,
    fontSize: 11,
    color: C.failedText,
    lineHeight: 16,
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

export default OfflineSavedScreen;
