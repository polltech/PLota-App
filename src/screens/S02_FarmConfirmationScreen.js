import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { C } from '../theme';

const FarmConfirmationScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, farm: initialFarm } = route.params || {};

  const [isOnline, setIsOnline] = useState(true);
  const [farmDetails, setFarmDetails] = useState(initialFarm || null);
  const [loading, setLoading] = useState(!initialFarm);

  useEffect(() => {
    checkConnectivity();
    if (!initialFarm) fetchFarmDetails();
  }, []);

  const checkConnectivity = async () => {
    const state = await Network.getNetworkStateAsync();
    setIsOnline(!!state.isConnected);
  };

  const fetchFarmDetails = async () => {
    try {
      const res = await fetch(
        `http://192.168.100.5:8000/api/v1/farms/${encodeURIComponent(farmId)}`,
        { headers: { 'X-API-Key': 'plotra-prototype-key-2026' } }
      );
      setFarmDetails(res.ok ? await res.json() : { farm_id: farmId });
    } catch (_) {
      setFarmDetails({ farm_id: farmId });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.c600} />
        <Text style={s.loadingText}>Loading farm details…</Text>
      </View>
    );
  }

  const farmName = farmDetails?.farm_name || farmDetails?.name || null;
  const cooperative = farmDetails?.cooperative_name || null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confirm farm</Text>
        <View style={{ width: 56 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Farm info card */}
        <View style={s.card}>
          <View style={s.cardTopRow}>
            <View>
              <Text style={s.fieldLabel}>Farm ID</Text>
              <Text style={s.farmIdText}>{farmId}</Text>
            </View>
            <View style={s.noBadge}>
              <Text style={s.noBadgeText}>No polygon yet</Text>
            </View>
          </View>

          <View style={s.divider} />

          {farmName ? (
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Farm name</Text>
              <Text style={s.fieldValue}>{farmName}</Text>
            </View>
          ) : null}

          {cooperative ? (
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Cooperative</Text>
              <Text style={s.fieldValue}>{cooperative}</Text>
            </View>
          ) : null}

          <View style={s.noteBox}>
            <Text style={s.noteText}>
              Check details match the farmer before proceeding
            </Text>
          </View>

          {!isOnline && (
            <View style={s.offlineBanner}>
              <Text style={s.offlineText}>
                Offline — details may be outdated
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={s.primaryBtn}
          onPress={() => navigation.navigate('WalkBoundary', { farmId, farm: farmDetails })}
          activeOpacity={0.8}
        >
          <Text style={s.primaryBtnText}>Start polygon walk →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryBtnText}>Wrong farm — go back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.c050 },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  backText: { fontSize: 17, color: C.c600, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink2 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  farmIdText: { fontSize: 18, fontWeight: '700', color: C.ink },
  noBadge: {
    backgroundColor: C.pendingBg,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  noBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.pendingText,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  divider: { height: 1, backgroundColor: C.rule, marginBottom: 14 },

  fieldGroup: { marginBottom: 12 },
  fieldValue: { fontSize: 15, fontWeight: '500', color: C.ink2 },

  noteBox: {
    backgroundColor: C.c050,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.c400,
  },
  noteText: { fontSize: 13, color: C.muted, lineHeight: 19 },

  offlineBanner: {
    marginTop: 12,
    backgroundColor: C.failedBg,
    borderRadius: 6,
    padding: 10,
  },
  offlineText: { fontSize: 12, color: C.failedText, textAlign: 'center' },

  primaryBtn: {
    backgroundColor: C.c600,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
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

export default FarmConfirmationScreen;
