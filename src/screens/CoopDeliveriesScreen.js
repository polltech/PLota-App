import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { coopAPI } from '../services/api';
import { C } from '../theme';
import { ROLES } from '../utils/roles';

// Steps owned by each processing role (mirrors ProcessingStepsScreen)
const ROLE_STEPS = {
  [ROLES.DELIVERY_AGENT]:  ['sorting'],
  [ROLES.WASHING_STATION]: ['washing'],
  [ROLES.POST_HARVEST]:    ['drying', 'milling', 'grading', 'packing'],
};

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const statusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'received')            return { color: '#0369a1', bg: '#e0f2fe' };
  if (u === 'in_processing')       return { color: '#6d28d9', bg: '#ede9fe' };
  if (u === 'quality_checked')     return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'ready_for_batching')  return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'batched')             return { color: '#7c3aed', bg: '#ede9fe' };
  if (u === 'processed')           return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'rejected')            return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const FILTERS = [
  { key: 'all',               label: 'All',        icon: 'layers-outline'           },
  { key: 'received',          label: 'Received',   icon: 'archive-outline'          },
  { key: 'in_processing',     label: 'Processing', icon: 'cog-outline'              },
  { key: 'ready_for_batching',label: 'Ready',      icon: 'checkmark-circle-outline' },
  { key: 'batched',           label: 'Batched',    icon: 'cube-outline'             },
  { key: 'rejected',          label: 'Rejected',   icon: 'close-circle-outline'     },
];

const DeliveryRow = ({ item, onPress }) => {
  const ss = statusStyle(item.status);
  const lastStep = item.processing_log?.slice(-1)?.[0]?.step_type;
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={s.rowMain}>
        <View style={s.rowTop}>
          <Text style={s.delivNo} numberOfLines={1}>{item.delivery_number || `D-${item.id}`}</Text>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.status || 'Pending')}</Text>
          </View>
        </View>
        <View style={s.rowMeta}>
          {item.farmer_name && (
            <Text style={s.rowMetaText} numberOfLines={1}>
              <Text style={s.rowMetaLabel}>Farmer: </Text>{item.farmer_name}
            </Text>
          )}
          {item.farm_name && (
            <Text style={s.rowMetaText} numberOfLines={1}>
              <Text style={s.rowMetaLabel}>Farm: </Text>{item.farm_name || `Farm #${item.farm_id}`}
            </Text>
          )}
        </View>
        <View style={s.rowCols}>
          <View style={s.rowCol}>
            <Ionicons name="scale-outline" size={12} color={C.muted} />
            <Text style={s.rowColText}>{fmtKg(item.net_weight_kg)}</Text>
          </View>
          {item.quality_grade && (
            <View style={s.rowCol}>
              <Ionicons name="ribbon-outline" size={12} color={C.muted} />
              <Text style={s.rowColText}>{item.quality_grade}</Text>
            </View>
          )}
          {item.moisture_content != null && (
            <View style={s.rowCol}>
              <Ionicons name="water-outline" size={12} color={C.muted} />
              <Text style={s.rowColText}>{item.moisture_content}%</Text>
            </View>
          )}
          {lastStep && (
            <View style={[s.rowCol, { backgroundColor: '#e0f2fe', borderRadius: 6, paddingHorizontal: 6 }]}>
              <Text style={[s.rowColText, { color: '#0369a1' }]}>{cap(lastStep)}</Text>
            </View>
          )}
          <View style={s.rowCol}>
            <Ionicons name="calendar-outline" size={12} color={C.muted} />
            <Text style={s.rowColText}>{fmtDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

export default function CoopDeliveriesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const role = user?.role;
  const mySteps = ROLE_STEPS[role] || [];
  const isProcessingRole = mySteps.length > 0;
  const canRecord = role !== ROLES.WASHING_STATION && role !== 'station_clerk';

  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getDeliveries();
      const d = res.data;
      setDeliveries(Array.isArray(d) ? d : (d?.deliveries || []));
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  // For processing roles: show ONLY deliveries where the user still has a step to record.
  // Once every step this user owns is in processing_log the delivery disappears from their list.
  // Statuses that mean "fully closed" are excluded regardless of log state.
  // Coop officers / admins see all deliveries.
  const CLOSED = new Set(['batched', 'rejected', 'ready_for_batching', 'processed']);
  const roleFiltered = isProcessingRole
    ? deliveries.filter(d => {
        if (CLOSED.has((d.status || '').toLowerCase())) return false;
        const done = new Set((d.processing_log || []).map(l => l.step_type));
        return mySteps.some(step => !done.has(step));
      })
    : deliveries;

  const totalKg = roleFiltered.reduce((s, d) => s + (d.net_weight_kg || 0), 0);

  const filtered = filter === 'all'
    ? roleFiltered
    : roleFiltered.filter(d => (d.status || 'received').toLowerCase() === filter);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <View style={s.decor1} />
        <View style={s.decor2} />
        <SafeAreaView>
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Deliveries</Text>
              <Text style={s.heroSub}>
                {isProcessingRole
                  ? `${roleFiltered.length} need${roleFiltered.length === 1 ? 's' : ''} your attention · ${fmtKg(totalKg)}`
                  : `${deliveries.length} total · ${fmtKg(totalKg)}`}
              </Text>
            </View>
            {canRecord && (
              <TouchableOpacity style={s.heroBtn} onPress={() => navigation.navigate('CreateDelivery')} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={s.heroBtnText}>Record</Text>
              </TouchableOpacity>
            )}
          </View>
          {!loading && (
            <View style={s.heroStats}>
              <View style={s.heroStat}><Text style={s.heroStatVal}>{roleFiltered.length}</Text><Text style={s.heroStatLabel}>Total</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{roleFiltered.filter(d => (d.status||'').toLowerCase() === 'received').length}</Text><Text style={s.heroStatLabel}>Received</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{roleFiltered.filter(d => (d.status||'').toLowerCase() === 'in_processing').length}</Text><Text style={s.heroStatLabel}>Processing</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{roleFiltered.filter(d => (d.status||'').toLowerCase() === 'ready_for_batching').length}</Text><Text style={s.heroStatLabel}>Ready</Text></View>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* Square filter cards — horizontal scroll, fixed height */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => {
          const cnt = f.key === 'all'
            ? roleFiltered.length
            : roleFiltered.filter(d => (d.status || 'received').toLowerCase() === f.key).length;
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                s.filterCard,
                {
                  borderColor: active ? C.c700 : 'transparent',
                  backgroundColor: active ? '#f0fdf4' : C.steel100,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.75}
            >
              <Ionicons name={f.icon} size={20} color={active ? C.c700 : C.steel500} />
              <Text style={[s.filterCount, { color: active ? C.c700 : C.ink }]}>{cnt}</Text>
              <Text style={[s.filterLabel, { color: active ? C.c700 : C.muted }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <DeliveryRow
              item={item}
              onPress={() => navigation.navigate('DeliveryDetail', { deliveryId: item.id, delivery: item })}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cube-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>No deliveries</Text>
              <Text style={s.emptyMsg}>
                {filter !== 'all'
              ? `No ${filter} deliveries.`
              : isProcessingRole
                ? 'All your steps are done — no deliveries need attention.'
                : 'Record the first delivery.'}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 20, overflow: 'hidden' },
  decor1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  decor2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, right: 80 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  heroBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 12, marginBottom: 4 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 16, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.12)' },

  // Square filter cards
  filterScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200, maxHeight: 110 },
  filterRow:    { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterCard:   { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, gap: 3 },
  filterCount:  { fontSize: 18, fontWeight: '900' },
  filterLabel:  { fontSize: 8,  fontWeight: '700', textAlign: 'center' },

  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  row: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  delivNo: { fontSize: 14, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  rowMeta: { marginBottom: 6, gap: 2 },
  rowMetaText: { fontSize: 12, color: C.muted },
  rowMetaLabel: { fontWeight: '700', color: C.steel700 },
  rowCols: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  rowCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowColText: { fontSize: 12, color: C.muted, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
});
