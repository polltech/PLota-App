import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const eudrChip = (status) => {
  if (!status) return null;
  const s = (status || '').toUpperCase();
  let bg = C.steel200, fg = C.steel700;
  if (s.includes('LOW') || s.includes('COMPLIANT')) { bg = C.eudrLowBg; fg = C.eudrLow; }
  else if (s.includes('MEDIUM') || s.includes('PENDING')) { bg = C.eudrMedBg; fg = C.eudrMedium; }
  else if (s.includes('HIGH') || s.includes('RISK')) { bg = C.eudrHighBg; fg = C.eudrHigh; }
  return { bg, fg };
};

const verifyColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'verified') return C.eudrLow;
  if (s === 'pending') return C.eudrMedium;
  if (s === 'rejected') return C.eudrHigh;
  return C.subtle;
};

const FarmCard = ({ farm, onPress }) => {
  const chip = eudrChip(farm.eudr_risk_level || farm.compliance_status);
  const vc = verifyColor(farm.verification_status);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.farmIcon}>
        <Ionicons name="leaf" size={20} color={C.c600} />
      </View>
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.farmName} numberOfLines={1}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
          {chip && (
            <View style={[s.chip, { backgroundColor: chip.bg }]}>
              <Text style={[s.chipText, { color: chip.fg }]}>{farm.eudr_risk_level || farm.compliance_status}</Text>
            </View>
          )}
        </View>
        <Text style={s.farmerName} numberOfLines={1}>
          {farm.farmer_name || [farm.owner?.first_name, farm.owner?.last_name].filter(Boolean).join(' ') || '—'}
        </Text>
        <View style={s.metaRow}>
          {farm.total_area_ha != null && (
            <Text style={s.meta}>{Number(farm.total_area_ha).toFixed(2)} ha</Text>
          )}
          {farm.county && <Text style={s.meta}> · {farm.county}</Text>}
          <View style={[s.verifyDot, { backgroundColor: vc }]} />
          <Text style={[s.verifyLabel, { color: vc }]}>{farm.verification_status || 'draft'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
    </TouchableOpacity>
  );
};

const FILTERS = ['all', 'verified', 'pending', 'draft'];

export default function CoopFarmsScreen() {
  const navigation = useNavigation();
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getFarms();
      const d = res.data;
      setFarms(Array.isArray(d) ? d : d?.farms || []);
    } catch (e) {
      console.warn('CoopFarms load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = farms.filter((f) => {
    const matchFilter = filter === 'all' || (f.verification_status || 'draft').toLowerCase() === filter;
    if (!matchFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (f.farm_name || f.name || '').toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q)
    );
  });

  const counts = FILTERS.reduce((acc, flt) => {
    acc[flt] = flt === 'all' ? farms.length : farms.filter((f) => (f.verification_status || 'draft').toLowerCase() === flt).length;
    return acc;
  }, {});

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Cooperative Farms</Text>
        <Text style={s.headerSub}>{farms.length} farms registered</Text>
      </SafeAreaView>

      {/* Filter pills */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={17} color={C.subtle} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search farm or farmer..."
          placeholderTextColor={C.subtle}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <FarmCard
              farm={item}
              onPress={() => navigation.navigate('FarmDetail', { farm: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No farms found</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Farms in your cooperative will appear here.'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  filterRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 10, gap: 6, flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: C.steel200 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, margin: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },

  list: { paddingHorizontal: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  farmIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  farmName: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  chipText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  farmerName: { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: 11, color: C.subtle },
  verifyDot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 6 },
  verifyLabel: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
