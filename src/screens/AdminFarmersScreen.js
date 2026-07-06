import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';
import AppModal, { useAppModal } from '../components/AppModal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const TABS = ['Pending', 'All'];

const FarmerCard = ({ farmer, isPending, onVerify, onReject }) => (
  <View style={[s.card, isPending && s.cardPending]}>
    {isPending && <View style={s.pendingBar} />}
    <View style={s.cardRow}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>
          {(farmer.first_name?.[0] || farmer.email?.[0] || '?').toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>
          {[farmer.first_name, farmer.last_name].filter(Boolean).join(' ') || farmer.email}
        </Text>
        {!!farmer.coop_member_no && (
          <Text style={[s.meta, { color: '#6d28d9', fontWeight: '700' }]}>{farmer.coop_member_no}</Text>
        )}
        <Text style={s.meta}>ID: {farmer.national_id || '—'} · {farmer.phone || '—'}</Text>
        <Text style={s.meta}>{farmer.county || farmer.district || '—'} · Joined {fmtDate(farmer.created_at)}</Text>
        {farmer.cooperative_name && (
          <View style={s.coopPill}>
            <Ionicons name="business-outline" size={11} color="#6d28d9" />
            <Text style={s.coopText}>{farmer.cooperative_name}</Text>
          </View>
        )}
      </View>
    </View>

    {isPending && (
      <View style={s.actionRow}>
        <TouchableOpacity style={s.rejectBtn} onPress={() => onReject(farmer)}>
          <Ionicons name="close-outline" size={16} color={C.eudrHigh} />
          <Text style={s.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.verifyBtn} onPress={() => onVerify(farmer)}>
          <Ionicons name="checkmark-outline" size={16} color={C.white} />
          <Text style={s.verifyText}>Approve</Text>
        </TouchableOpacity>
      </View>
    )}

    {!isPending && (
      <View style={s.verifiedBadge}>
        <Ionicons name="shield-checkmark-outline" size={12} color={C.eudrLow} />
        <Text style={s.verifiedText}>Verified</Text>
      </View>
    )}
  </View>
);

export default function AdminFarmersScreen() {
  const modal = useAppModal();
  const [tab, setTab] = useState('Pending');
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [pendRes, allRes] = await Promise.all([
        adminAPI.getPendingFarmers(),
        adminAPI.getAllFarmers(),
      ]);
      const pend = pendRes.data;
      const allD = allRes.data;
      setPending(Array.isArray(pend) ? pend : pend?.farmers || []);
      setAll(Array.isArray(allD) ? allD : allD?.farmers || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleVerify = (farmer) => {
    modal.show({
      type:         'confirm',
      icon:         'shield-checkmark',
      title:        'Approve Farmer',
      message:      `Approve ${farmer.first_name || farmer.email}? They will gain full platform access.`,
      confirmLabel: 'Approve',
      cancelLabel:  'Cancel',
      onConfirm: async () => {
        try {
          await adminAPI.verifyFarmer(farmer.id);
          setPending((prev) => prev.filter((f) => f.id !== farmer.id));
          modal.show({ type: 'success', title: 'Approved', message: 'Farmer has been verified successfully.' });
        } catch (e) {
          modal.show({ type: 'danger', title: 'Error', message: e.response?.data?.detail || 'Failed to verify farmer.' });
        }
      },
    });
  };

  const handleReject = (farmer) => {
    modal.show({
      type:         'danger',
      icon:         'close-circle',
      title:        'Reject Farmer',
      message:      `Reject ${farmer.first_name || farmer.email}? This will deny their access to the platform.`,
      confirmLabel: 'Reject',
      cancelLabel:  'Cancel',
      onConfirm: async () => {
        try {
          await adminAPI.rejectFarmer(farmer.id, 'Rejected by admin');
          setPending((prev) => prev.filter((f) => f.id !== farmer.id));
        } catch (e) {
          modal.show({ type: 'danger', title: 'Error', message: e.response?.data?.detail || 'Failed to reject farmer.' });
        }
      },
    });
  };

  const data = tab === 'Pending' ? pending : all;
  const q = search.toLowerCase();
  const filtered = data.filter((f) =>
    !q ||
    (f.first_name || '').toLowerCase().includes(q) ||
    (f.last_name || '').toLowerCase().includes(q) ||
    (f.email || '').toLowerCase().includes(q) ||
    (f.phone || '').toLowerCase().includes(q) ||
    (f.national_id || '').toLowerCase().includes(q) ||
    (f.county || f.district || '').toLowerCase().includes(q)
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <Text style={s.heroTitle}>Farmers</Text>
          <Text style={s.heroSub}>
            {pending.length > 0 ? `${pending.length} pending verification` : 'All farmers verified'}
          </Text>
        </SafeAreaView>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t}{t === 'Pending' && pending.length > 0 ? ` (${pending.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Name, ID, county..."
          placeholderTextColor={C.subtle}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.subtle} />
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
            <FarmerCard
              farmer={item}
              isPending={tab === 'Pending'}
              onVerify={handleVerify}
              onReject={handleReject}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons
                name={tab === 'Pending' ? 'checkmark-circle-outline' : 'person-outline'}
                size={52}
                color={C.steel300}
              />
              <Text style={s.emptyTitle}>
                {tab === 'Pending' ? 'No pending verifications' : 'No farmers found'}
              </Text>
            </View>
          }
        />
      )}
      <AppModal {...modal.props} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tabBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, backgroundColor: C.steel100 },
  tabBtnActive: { backgroundColor: C.c700 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  tabTextActive: { color: C.white },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 16, marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },

  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, overflow: 'hidden' },
  cardPending: { borderWidth: 1.5, borderColor: '#fed7aa' },
  pendingBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: C.eudrMedium },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: C.white },
  name: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 4 },
  meta: { fontSize: 12, color: C.muted, marginBottom: 2 },
  coopPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: '#ede9fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  coopText: { fontSize: 11, fontWeight: '700', color: '#6d28d9' },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.steel100 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderColor: C.eudrHigh, borderRadius: 12, paddingVertical: 10 },
  rejectText: { fontSize: 13, fontWeight: '800', color: C.eudrHigh },
  verifyBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: C.eudrLow, borderRadius: 12, paddingVertical: 10 },
  verifyText: { fontSize: 13, fontWeight: '800', color: C.white },

  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, alignSelf: 'flex-end' },
  verifiedText: { fontSize: 11, fontWeight: '700', color: C.eudrLow },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 14 },
});
