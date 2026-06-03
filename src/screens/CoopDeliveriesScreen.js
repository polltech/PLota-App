import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const STATUS_STYLE = {
  pending: { bg: C.pendingBg, fg: C.pendingText },
  received: { bg: '#e0f2fe', fg: '#0369a1' },
  weighed: { bg: '#ede9fe', fg: '#6d28d9' },
  quality_checked: { bg: '#dcfce7', fg: '#15803d' },
  processed: { bg: C.eudrLowBg, fg: C.eudrLow },
  rejected: { bg: C.eudrHighBg, fg: C.eudrHigh },
};

const statusStyle = (s) => STATUS_STYLE[(s || 'pending').toLowerCase()] || { bg: C.steel200, fg: C.steel700 };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const DeliveryCard = ({ item, onPress }) => {
  const ss = statusStyle(item.status);
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardLeft}>
        <Ionicons name="cube-outline" size={20} color={C.c600} />
      </View>
      <View style={s.cardContent}>
        <View style={s.cardTop}>
          <Text style={s.delivNo} numberOfLines={1}>{item.delivery_number || `#${item.id}`}</Text>
          <View style={[s.chip, { backgroundColor: ss.bg }]}>
            <Text style={[s.chipText, { color: ss.fg }]}>{(item.status || 'PENDING').replace(/_/g,' ').toUpperCase()}</Text>
          </View>
        </View>
        <Text style={s.farmName} numberOfLines={1}>{item.farm?.farm_name || item.farm_name || `Farm ${item.farm_id}`}</Text>
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="scale-outline" size={12} color={C.muted} />
            <Text style={s.metaText}>{fmtKg(item.net_weight_kg)}</Text>
          </View>
          {item.quality_grade && (
            <View style={s.metaItem}>
              <Ionicons name="ribbon-outline" size={12} color={C.muted} />
              <Text style={s.metaText}>{item.quality_grade}</Text>
            </View>
          )}
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={C.muted} />
            <Text style={s.metaText}>{fmtDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} />
    </TouchableOpacity>
  );
};

const FILTERS = ['ALL', 'PENDING', 'RECEIVED', 'PROCESSED'];

export default function CoopDeliveriesScreen() {
  const navigation = useNavigation();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await coopAPI.getDeliveries();
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
    : deliveries.filter((d) => (d.status || 'pending').toUpperCase() === filter);

  const totalKg = deliveries.reduce((sum, d) => sum + (d.net_weight_kg || 0), 0);
  const pendingCount = deliveries.filter((d) => (d.status || 'pending') === 'pending').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Deliveries</Text>
            <Text style={s.headerSub}>
              {deliveries.length} total · {fmtKg(totalKg)}
            </Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.batchBtn}
              onPress={() => navigation.navigate('Batches')}
            >
              <Ionicons name="layers-outline" size={18} color={C.c700} />
              <Text style={s.batchBtnText}>Batches</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Filter row */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const cnt = f === 'ALL' ? deliveries.length : deliveries.filter((d) => (d.status || 'pending').toUpperCase() === f).length;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterBtn, filter === f && s.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({cnt})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.c700} size="large" />
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
          renderItem={({ item }) => (
            <DeliveryCard
              item={item}
              onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item.id, delivery: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No deliveries</Text>
              <Text style={s.emptyMsg}>Record the first delivery using the button below.</Text>
            </View>
          }
        />
      )}

      {/* FAB — create delivery */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreateDelivery')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  batchBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: C.c700, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  batchBtnText: { fontSize: 13, fontWeight: '700', color: C.c700 },

  filterRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  filterBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10, backgroundColor: C.steel100 },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardLeft: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  delivNo: { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  chip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  chipText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  farmName: { fontSize: 12, color: C.muted, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted, fontWeight: '500' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  errText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 12 },
  retryBtn: { marginTop: 14, backgroundColor: C.c700, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 12 },
  retryText: { color: C.white, fontWeight: '700', fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  fab: { position: 'absolute', bottom: 28, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
});
