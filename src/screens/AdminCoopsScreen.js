import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const CoopCard = ({ coop }) => (
  <View style={s.card}>
    <View style={s.cardLeft}>
      <Ionicons name="business" size={22} color={C.c600} />
    </View>
    <View style={s.cardContent}>
      <Text style={s.coopName} numberOfLines={1}>{coop.name}</Text>
      <Text style={s.coopMeta}>
        {coop.county || coop.district || '—'}
        {coop.registration_number ? `  ·  Reg: ${coop.registration_number}` : ''}
      </Text>
      <View style={s.statsRow}>
        {coop.member_count != null && (
          <View style={s.statPill}>
            <Ionicons name="people-outline" size={11} color={C.muted} />
            <Text style={s.statPillText}>{coop.member_count} members</Text>
          </View>
        )}
        {coop.farm_count != null && (
          <View style={s.statPill}>
            <Ionicons name="leaf-outline" size={11} color={C.muted} />
            <Text style={s.statPillText}>{coop.farm_count} farms</Text>
          </View>
        )}
        {coop.is_active !== false && (
          <View style={[s.statPill, { backgroundColor: C.eudrLowBg }]}>
            <Text style={[s.statPillText, { color: C.eudrLow }]}>Active</Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

export default function AdminCoopsScreen() {
  const [coops, setCoops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form
  const [coopName, setCoopName] = useState('');
  const [coopCounty, setCoopCounty] = useState('');
  const [coopRegNo, setCoopRegNo] = useState('');
  const [coopContact, setCoopContact] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await adminAPI.getCooperatives();
      const d = res.data;
      setCoops(Array.isArray(d) ? d : d?.cooperatives || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleCreate = async () => {
    if (!coopName.trim()) { Alert.alert('Required', 'Cooperative name is required.'); return; }
    setCreating(true);
    try {
      await adminAPI.createCooperative({
        name: coopName.trim(),
        county: coopCounty.trim() || undefined,
        registration_number: coopRegNo.trim() || undefined,
        contact_phone: coopContact.trim() || undefined,
      });
      setShowCreate(false);
      setCoopName(''); setCoopCounty(''); setCoopRegNo(''); setCoopContact('');
      Alert.alert('Created', 'Cooperative registered successfully.');
      await load(true);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create cooperative.');
    } finally {
      setCreating(false);
    }
  };

  const q = search.toLowerCase();
  const filtered = coops.filter((c) =>
    !q ||
    (c.name || '').toLowerCase().includes(q) ||
    (c.county || c.district || '').toLowerCase().includes(q) ||
    (c.registration_number || '').toLowerCase().includes(q)
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <View>
              <Text style={s.heroTitle}>Cooperatives</Text>
              <Text style={s.heroSub}>{coops.length} registered</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)}>
              <Ionicons name="add" size={22} color={C.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search cooperatives..."
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
          renderItem={({ item }) => <CoopCard coop={item} />}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="business-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No cooperatives yet</Text>
              <Text style={s.emptyMsg}>Create the first cooperative to get started.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)}>
                <Text style={s.emptyBtnText}>Add Cooperative</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>New Cooperative</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'Cooperative Name', value: coopName, onChange: setCoopName, placeholder: 'e.g. Mt. Kenya Farmers Cooperative', required: true },
              { label: 'County / Region', value: coopCounty, onChange: setCoopCounty, placeholder: 'e.g. Nyeri' },
              { label: 'Registration Number', value: coopRegNo, onChange: setCoopRegNo, placeholder: 'e.g. CPY/001/2024' },
              { label: 'Contact Phone', value: coopContact, onChange: setCoopContact, placeholder: '+254700000000' },
            ].map(({ label, value, onChange, placeholder, required }) => (
              <View key={label}>
                <Text style={s.fieldLabel}>{label}{required && <Text style={{ color: C.eudrHigh }}> *</Text>}</Text>
                <TextInput
                  style={s.input}
                  value={value}
                  onChangeText={onChange}
                  placeholder={placeholder}
                  placeholderTextColor={C.subtle}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[s.submitBtn, creating && s.btnDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating
                ? <ActivityIndicator color={C.white} />
                : <Text style={s.submitText}>Register Cooperative</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingTop: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, marginHorizontal: 16, marginTop: 14, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, color: C.ink },

  list: { padding: 16, paddingBottom: 80 },
  card: { backgroundColor: C.white, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardLeft: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  cardContent: { flex: 1 },
  coopName: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 4 },
  coopMeta: { fontSize: 12, color: C.muted, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.steel100, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  statPillText: { fontSize: 11, fontWeight: '700', color: C.steel700 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: { marginTop: 16, backgroundColor: C.c700, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  submitBtn: { backgroundColor: C.c700, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  btnDisabled: { backgroundColor: C.steel300 },
  submitText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
