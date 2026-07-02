import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';

const ROLE_FILTERS = ['ALL', 'farmer', 'cooperative_officer', 'plotra_admin', 'eudr_reviewer'];
const ROLE_LABEL = {
  farmer: 'Farmer',
  cooperative_officer: 'Coop Officer',
  plotra_admin: 'Admin',
  eudr_reviewer: 'Reviewer',
};
const ROLE_COLOR = {
  farmer: { bg: C.eudrLowBg, fg: C.eudrLow },
  cooperative_officer: { bg: '#ede9fe', fg: '#6d28d9' },
  plotra_admin: { bg: C.c050, fg: C.c700 },
  eudr_reviewer: { bg: '#e0f2fe', fg: '#0369a1' },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const UserCard = ({ user, onSuspend, onUnsuspend }) => {
  const rc = ROLE_COLOR[user.role] || { bg: C.steel100, fg: C.steel700 };
  const active = user.is_active !== false;
  return (
    <View style={[s.card, !active && s.cardSuspended]}>
      <View style={s.cardRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {(user.first_name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.name} numberOfLines={1}>
              {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
            </Text>
            {!active && (
              <View style={s.suspendedChip}>
                <Text style={s.suspendedText}>SUSPENDED</Text>
              </View>
            )}
          </View>
          <Text style={s.email} numberOfLines={1}>{user.email || user.phone || '—'}</Text>
          <View style={s.metaRow}>
            <View style={[s.rolePill, { backgroundColor: rc.bg }]}>
              <Text style={[s.roleText, { color: rc.fg }]}>{ROLE_LABEL[user.role] || user.role}</Text>
            </View>
            <Text style={s.dateTxt}>Joined {fmtDate(user.created_at)}</Text>
          </View>
        </View>
      </View>

      <View style={s.actions}>
        {active ? (
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.eudrHigh }]}
            onPress={() => onSuspend(user)}
          >
            <Ionicons name="ban-outline" size={14} color={C.eudrHigh} />
            <Text style={[s.actionText, { color: C.eudrHigh }]}>Suspend</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.actionBtn, { borderColor: C.eudrLow }]}
            onPress={() => onUnsuspend(user)}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color={C.eudrLow} />
            <Text style={[s.actionText, { color: C.eudrLow }]}>Restore</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function AdminUsersScreen() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminAPI.getUsers();
      const d = res.data;
      setUsers(Array.isArray(d) ? d : d?.users || []);
    } catch (e) {
      console.warn('Admin users:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleSuspend = (user) => {
    Alert.alert(
      'Suspend User',
      `Suspend ${user.first_name || user.email}? They will lose access immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.suspendUser(user.id);
              setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: false } : u));
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to suspend user.');
            }
          },
        },
      ]
    );
  };

  const handleUnsuspend = async (user) => {
    try {
      await adminAPI.unsuspendUser(user.id);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: true } : u));
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to restore user.');
    }
  };

  const filtered = users.filter((u) => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.last_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.national_id || '').toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <Text style={s.heroTitle}>Users</Text>
          <Text style={s.heroSub}>{users.length} total accounts</Text>
        </SafeAreaView>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, phone..."
          placeholderTextColor={C.subtle}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {/* Role filters */}
      <View style={s.filterScroll}>
        {ROLE_FILTERS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[s.filterBtn, roleFilter === r && s.filterBtnActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[s.filterText, roleFilter === r && s.filterTextActive]}>
              {r === 'ALL' ? 'All' : ROLE_LABEL[r] || r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <UserCard user={item} onSuspend={handleSuspend} onUnsuspend={handleUnsuspend} />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No users found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 16, marginTop: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, fontWeight: '500' },

  filterScroll: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterBtn: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 10, backgroundColor: C.white },
  filterBtnActive: { backgroundColor: C.c700 },
  filterText: { fontSize: 12, fontWeight: '700', color: C.steel700 },
  filterTextActive: { color: C.white },

  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardSuspended: { opacity: 0.7, borderWidth: 1.5, borderColor: C.eudrHighBg },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.white },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  name: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1 },
  suspendedChip: { backgroundColor: C.eudrHighBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  suspendedText: { fontSize: 9, fontWeight: '800', color: C.eudrHigh },
  email: { fontSize: 12, color: C.muted, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  roleText: { fontSize: 10, fontWeight: '800' },
  dateTxt: { fontSize: 11, color: C.subtle },

  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.steel100 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 14 },
});
