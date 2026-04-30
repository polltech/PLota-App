import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { API_BASE_URL, API_KEY } from '../config';
import { dbService } from '../services/database';
import { C } from '../theme';

const FILTERS = ['all', 'pending', 'synced', 'failed'];

const statusStyle = (status) => {
  switch (status) {
    case 'synced':
      return { text: C.syncedText, bg: C.syncedBg };
    case 'pending':
      return { text: C.pendingText, bg: C.pendingBg };
    case 'failed':
      return { text: C.failedText, bg: C.failedBg };
    default:
      return { text: C.muted, bg: C.c100 };
  }
};

const statusLabel = (s) =>
  s === 'synced' ? 'Synced' : s === 'pending' ? 'Pending' : s === 'failed' ? 'Failed' : s;

const QueueListScreen = () => {
  const navigation = useNavigation();
  const [captures, setCaptures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [retrying, setRetrying] = useState(null);

  // Reload whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQueue();
    }, [])
  );

  const loadQueue = async () => {
    setLoading(true);
    try {
      const rows = await dbService.getQueue();
      setCaptures(rows);
    } catch (e) {
      console.error('Queue load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = captures.filter((c) => c.sync_status === 'pending').length;

  const filtered = captures.filter((c) => {
    if (filter === 'all') return true;
    return c.sync_status === filter;
  });

  const handleRetry = async (item) => {
    setRetrying(item.id);
    try {
      const payload = {
        farm_id: item.farm_id,
        polygon_coordinates: item.polygon_coordinates,
        area_ha: item.area_ha,
        perimeter_meters: item.perimeter_meters,
        points_count: item.points_count,
        captured_at: item.captured_at,
        device_id: item.device_id,
        agent_id: item.agent_id,
        accuracy_m: item.accuracy_m,
      };

      const res = await fetch(`${API_BASE_URL}/parcels/polygon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await dbService.updateSyncStatus(item.id, 'synced');
        loadQueue();
      } else {
        await dbService.updateSyncStatus(item.id, 'failed', `Server error ${res.status}`);
        loadQueue();
        Alert.alert('Retry failed', `Server returned ${res.status}`);
      }
    } catch (e) {
      await dbService.updateSyncStatus(item.id, 'failed', e.message);
      loadQueue();
      Alert.alert('Retry failed', 'Network error — will retry automatically.');
    } finally {
      setRetrying(null);
    }
  };

  const renderItem = ({ item }) => {
    const st = statusStyle(item.sync_status);
    const isRetrying = retrying === item.id;
    const time = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

    return (
      <View style={s.card}>
        <View style={s.cardRow}>
          <Text style={s.farmId}>{item.farm_id || 'Unknown'}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.text }]}>
              {statusLabel(item.sync_status)}
            </Text>
          </View>
        </View>
        <Text style={s.cardMeta}>
          {(item.area_ha || 0).toFixed(2)} ha · {item.points_count || 0} pts · {time}
        </Text>
        {item.sync_status === 'failed' && (
          <TouchableOpacity
            style={[s.retryBtn, isRetrying && s.retryBtnDisabled]}
            onPress={() => handleRetry(item)}
            disabled={isRetrying}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={C.white} />
            ) : (
              <Text style={s.retryBtnText}>Retry →</Text>
            )}
          </TouchableOpacity>
        )}
        {item.last_sync_error ? (
          <Text style={s.errorNote} numberOfLines={1}>
            {item.last_sync_error}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={s.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Queued records</Text>
        <View style={{ width: 56 }} />
      </View>

      {/* Count row */}
      <View style={s.countRow}>
        <Text style={s.countText}>{captures.length} records total</Text>
        {pendingCount > 0 && (
          <View style={s.pendingBadge}>
            <Text style={s.pendingBadgeText}>{pendingCount} pending</Text>
          </View>
        )}
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[s.tab, filter === f && s.tabActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.c600} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => `q-${item.id}`}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyText}>
                No {filter === 'all' ? '' : filter + ' '}records found
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('FarmIDEntry')}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.c050 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  backText: { fontSize: 17, color: C.c600, fontWeight: '600', width: 56 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: C.ink2 },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  countText: { fontSize: 13, color: C.muted },
  pendingBadge: {
    backgroundColor: C.pendingBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '600', color: C.pendingText },

  tabs: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 7,
  },
  tabActive: { backgroundColor: C.c600 },
  tabText: { fontSize: 12, color: C.muted, fontWeight: '500' },
  tabTextActive: { color: C.white, fontWeight: '600' },

  list: { padding: 16, paddingBottom: 90 },

  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.rule,
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  farmId: { fontSize: 15, fontWeight: '700', color: C.ink2 },
  badge: {
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardMeta: { fontSize: 12, color: C.muted },
  errorNote: { fontSize: 11, color: C.failedText, marginTop: 4 },

  retryBtn: {
    marginTop: 10,
    backgroundColor: C.c600,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  retryBtnDisabled: { backgroundColor: C.c200 },
  retryBtnText: { color: C.white, fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: C.subtle },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.c600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.c800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { fontSize: 30, color: C.white, lineHeight: 34 },
});

export default QueueListScreen;
