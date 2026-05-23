import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const verifyColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'verified') return { bg: C.eudrLowBg, fg: C.eudrLow };
  if (s === 'pending' || s === 'update_requested') return { bg: C.pendingBg, fg: C.pendingText };
  if (s === 'rejected') return { bg: C.eudrHighBg, fg: C.eudrHigh };
  return { bg: C.steel200, fg: C.steel700 };
};

const FarmerCard = ({ farmer, onPress }) => {
  const vc = verifyColor(farmer.verification_status);
  const pending = ['pending', 'update_requested'].includes((farmer.verification_status || '').toLowerCase());
  return (
    <TouchableOpacity style={[s.card, pending && s.cardPending]} onPress={onPress} activeOpacity={0.8}>
      <View style={s.avatarWrap}>
        <Text style={s.avatarText}>
          {((farmer.first_name?.[0] || '') + (farmer.last_name?.[0] || '')).toUpperCase() || '?'}
        </Text>
      </View>
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.farmerName} numberOfLines={1}>
            {[farmer.first_name, farmer.last_name].filter(Boolean).join(' ') || 'Unknown'}
          </Text>
          <View style={[s.chip, { backgroundColor: vc.bg }]}>
            <Text style={[s.chipText, { color: vc.fg }]}>
              {(farmer.verification_status || 'UNVERIFIED').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={s.farmerMeta} numberOfLines={1}>
          {[farmer.phone, farmer.county].filter(Boolean).join(' · ')}
        </Text>
        <Text style={s.farmerFarms}>
          {farmer.farm_count ?? 0} farm{farmer.farm_count !== 1 ? 's' : ''}
          {farmer.gender ? `  ·  ${farmer.gender}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
    </TouchableOpacity>
  );
};

export default function CoopFarmersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialTab = route.params?.tab || 'all';

  const [tab, setTab] = useState(initialTab);
  const [allFarmers, setAllFarmers] = useState([]);
  const [pendingFarmers, setPendingFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [allRes, pendRes] = await Promise.allSettled([
        coopAPI.getFarmers(),
        coopAPI.getPendingFarmers(),
      ]);
      if (allRes.status === 'fulfilled') {
        const d = allRes.value.data;
        setAllFarmers(Array.isArray(d) ? d : d?.farmers || []);
      }
      if (pendRes.status === 'fulfilled') {
        const d = pendRes.value.data;
        setPendingFarmers(Array.isArray(d) ? d : d?.farmers || []);
      }
    } catch (e) {
      console.warn('CoopFarmers load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const source = tab === 'pending' ? pendingFarmers : allFarmers;
  const filtered = source.filter((f) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      `${f.first_name} ${f.last_name}`.toLowerCase().includes(q) ||
      (f.phone || '').includes(q) ||
      (f.national_id || '').includes(q) ||
      (f.county || '').toLowerCase().includes(q)
    );
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Farmers</Text>
        <Text style={s.headerSub}>
          {allFarmers.length} total · {pendingFarmers.length} pending
        </Text>
      </SafeAreaView>

      {/* Tabs */}
      <View style={s.tabs}>
        {[
          { key: 'all', label: `All (${allFarmers.length})` },
          { key: 'pending', label: `Pending (${pendingFarmers.length})`, alert: pendingFarmers.length > 0 },
        ].map(({ key, label, alert }) => (
          <TouchableOpacity
            key={key}
            style={[s.tabBtn, tab === key && s.tabBtnActive]}
            onPress={() => setTab(key)}
          >
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{label}</Text>
            {alert && <View style={s.tabDot} />}
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
          placeholder="Search name, phone, county..."
          placeholderTextColor={C.subtle}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={17} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <FarmerCard
              farmer={item}
              onPress={() => navigation.navigate('FarmerDetail', { farmer: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>
                {tab === 'pending' ? 'No pending verifications' : 'No farmers found'}
              </Text>
              <Text style={s.emptyMsg}>
                {query ? 'Try a different search.' : tab === 'pending' ? 'All farmers are verified.' : 'Farmers linked to your cooperative will appear here.'}
              </Text>
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

  tabs: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.subtle },
  tabTextActive: { color: C.c700 },
  tabDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.eudrMedium },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, margin: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '500' },

  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardPending: { borderLeftWidth: 3, borderLeftColor: C.eudrMedium },
  avatarWrap: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.white },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  farmerName: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  chipText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
  farmerMeta: { fontSize: 12, color: C.muted, fontWeight: '500' },
  farmerFarms: { fontSize: 11, color: C.c600, fontWeight: '600', marginTop: 3 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
