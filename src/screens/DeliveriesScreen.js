import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

const STATUS_COLORS = {
  PENDING: { bg: C.pendingBg, fg: C.pendingText },
  RECEIVED: { bg: '#e0f2fe', fg: '#0369a1' },
  VERIFIED: { bg: C.eudrLowBg, fg: C.eudrLow },
  REJECTED: { bg: C.eudrHighBg, fg: C.eudrHigh },
};

const statusColor = (s) => STATUS_COLORS[(s || '').toUpperCase()] || { bg: C.steel200, fg: C.steel700 };

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const DeliveryCard = ({ item }) => {
  const sc = statusColor(item.status);
  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <View style={s.iconWrap}>
          <Ionicons name="cube-outline" size={22} color={C.c600} />
        </View>
      </View>

      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.batchNo} numberOfLines={1}>
            {item.batch_number || item.batch?.batch_number || `DEL-${String(item.id).slice(-6)}`}
          </Text>
          <View style={[s.chip, { backgroundColor: sc.bg }]}>
            <Text style={[s.chipText, { color: sc.fg }]}>{item.status || 'PENDING'}</Text>
          </View>
        </View>

        <Text style={s.farmName} numberOfLines={1}>
          {item.farm_name || item.farm?.farm_name || '—'}
        </Text>

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="scale-outline" size={13} color={C.muted} />
            <Text style={s.metaText}>{item.weight_kg != null ? `${Number(item.weight_kg).toFixed(1)} kg` : '—'}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={C.muted} />
            <Text style={s.metaText}>{fmtDate(item.delivered_at || item.created_at)}</Text>
          </View>
        </View>

        {item.notes && (
          <Text style={s.notes} numberOfLines={1}>{item.notes}</Text>
        )}
      </View>
    </View>
  );
};

export default function DeliveriesScreen() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');

  const FILTERS = ['ALL', 'PENDING', 'RECEIVED', 'VERIFIED'];

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await farmerAPI.getDeliveries();
      const d = res.data;
      setDeliveries(Array.isArray(d) ? d : d?.deliveries || []);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = filter === 'ALL'
    ? deliveries
    : deliveries.filter((d) => (d.status || 'PENDING').toUpperCase() === filter);

  const totalKg = deliveries.reduce((sum, d) => sum + (d.weight_kg || 0), 0);

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Deliveries</Text>
        <View style={s.headerStats}>
          <Text style={s.headerSub}>{deliveries.length} total</Text>
          {totalKg > 0 && (
            <Text style={s.headerSub}> · {totalKg.toFixed(1)} kg</Text>
          )}
        </View>
      </SafeAreaView>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
          <Text style={s.loadText}>Loading deliveries...</Text>
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
          renderItem={({ item }) => <DeliveryCard item={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="cube-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No deliveries found</Text>
              <Text style={s.emptyMsg}>
                {filter !== 'ALL' ? `No ${filter.toLowerCase()} deliveries.` : 'Deliveries logged by your cooperative will appear here.'}
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
  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerStats: { flexDirection: 'row' },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  filterRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  list: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLeft: { marginRight: 14 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  batchNo: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  farmName: { fontSize: 13, color: C.muted, fontWeight: '500', marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  notes: { fontSize: 12, color: C.subtle, marginTop: 6, fontStyle: 'italic' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  loadText: { marginTop: 12, color: C.muted, fontSize: 14 },
  errText: { marginTop: 12, color: C.muted, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 16, backgroundColor: C.c700, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: C.white, fontWeight: '700', fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
