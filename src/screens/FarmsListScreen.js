import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const eudrChip = (status) => {
  if (!status) return null;
  const s = status.toUpperCase();
  let bg = C.steel200;
  let fg = C.steel700;
  if (s.includes('LOW') || s.includes('COMPLIANT')) { bg = C.eudrLowBg; fg = C.eudrLow; }
  else if (s.includes('MEDIUM') || s.includes('PENDING')) { bg = C.eudrMedBg; fg = C.eudrMedium; }
  else if (s.includes('HIGH') || s.includes('RISK')) { bg = C.eudrHighBg; fg = C.eudrHigh; }
  return { bg, fg };
};

const verifyBadge = (vs) => {
  if (!vs || vs === 'draft') return { label: 'Draft',    color: C.steel600,  bg: C.steel100 };
  if (vs === 'admin_approved') return { label: 'Approved', color: '#15803d',   bg: '#dcfce7' };
  if (vs === 'coop_approved')  return { label: 'Coop ✓',  color: '#1d4ed8',   bg: '#dbeafe' };
  if (vs === 'pending')        return { label: 'Pending',  color: '#b45309',   bg: '#fef3c7' };
  if (vs === 'rejected')       return { label: 'Rejected', color: '#dc2626',   bg: '#fee2e2' };
  return { label: vs, color: C.steel600, bg: C.steel100 };
};

const FarmCard = ({ farm, onPress }) => {
  const chip = eudrChip(farm.eudr_risk_level || farm.compliance_status);
  const vb   = verifyBadge(farm.verification_status);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardLeft}>
        <View style={s.farmIcon}>
          <Ionicons name="leaf" size={22} color={C.c600} />
        </View>
      </View>
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.farmName} numberOfLines={1}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
          <View style={[s.chip, { backgroundColor: vb.bg }]}>
            <Text style={[s.chipText, { color: vb.color }]}>{vb.label}</Text>
          </View>
        </View>
        <Text style={s.farmMeta} numberOfLines={1}>
          {[
            farm.total_area_ha != null ? `${Number(farm.total_area_ha).toFixed(2)} ha` : null,
            farm.parcels_count != null ? `${farm.parcels_count} parcels` : null,
            farm.county || farm.district || farm.subcounty,
          ].filter(Boolean).join(' • ')}
        </Text>
        <View style={s.chipRow}>
          {chip && (
            <View style={[s.chip, { backgroundColor: chip.bg }]}>
              <Text style={[s.chipText, { color: chip.fg }]}>EUDR: {farm.eudr_risk_level || farm.compliance_status}</Text>
            </View>
          )}
          {farm.crop_types && (
            <Text style={s.crops} numberOfLines={1}>
              {Array.isArray(farm.crop_types) ? farm.crop_types.join(', ') : farm.crop_types}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.subtle} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
};

export default function FarmsListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await farmerAPI.getFarms();
      const data = res.data;
      setFarms(Array.isArray(data) ? data : data?.farms || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load farms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = farms.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (f.farm_name || f.name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q) ||
      (f.district || '').toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item }) => (
    <FarmCard
      farm={item}
      onPress={() => navigation.navigate('FarmDetail', { farm: item })}
    />
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>My Farms</Text>
        <Text style={s.headerSub}>{farms.length} farm{farms.length !== 1 ? 's' : ''} registered</Text>
      </SafeAreaView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={C.subtle} style={s.searchIcon} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or location..."
          placeholderTextColor={C.subtle}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
          <Text style={s.loadText}>Loading farms...</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.subtle} />
          <Text style={s.errText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="leaf-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No farms found</Text>
              <Text style={s.emptyMsg}>
                {query ? 'Try a different search term.' : 'Farms linked to your account will appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB — capture new boundary */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CaptureLanding')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 20, marginTop: 16, marginBottom: 8, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.steel200 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, fontWeight: '500' },

  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLeft: { marginRight: 14 },
  farmIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  farmName: { fontSize: 16, fontWeight: '700', color: C.ink, flex: 1 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  farmMeta: { fontSize: 12, color: C.muted, fontWeight: '500' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  crops: { fontSize: 11, color: C.c600, fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  loadText: { marginTop: 12, color: C.muted, fontSize: 14 },
  errText: { marginTop: 12, color: C.muted, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: C.white, fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
});
