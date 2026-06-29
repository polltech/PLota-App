import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

export default function SelectFarmerForCaptureScreen() {
  const navigation = useNavigation();
  const [farmers, setFarmers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    farmerAPI.listCooperativeFarmers()
      .then(res => {
        const data = res.data || [];
        setFarmers(data);
        setFiltered(data);
      })
      .catch(e => setError(e.response?.data?.detail || 'Failed to load farmers'))
      .finally(() => setLoading(false));
  }, []);

  const search = useCallback((text) => {
    setQuery(text);
    const q = text.toLowerCase();
    setFiltered(
      farmers.filter(f =>
        `${f.first_name} ${f.last_name}`.toLowerCase().includes(q) ||
        (f.membership_number || '').toLowerCase().includes(q)
      )
    );
  }, [farmers]);

  const select = (farmer) => {
    navigation.navigate('AddFarm', {
      targetFarmerId:   farmer.id,
      targetFarmerName: `${farmer.first_name} ${farmer.last_name}`,
      targetMemberNo:   farmer.membership_number || farmer.coop_member_no,
      targetFarmer:     farmer,
    });
  };

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Select Farmer</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search" size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or member number..."
          placeholderTextColor={C.muted}
          value={query}
          onChangeText={search}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => search('')}>
            <Ionicons name="close-circle" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />}
      {error && <Text style={s.error}>{error}</Text>}

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => select(item)} activeOpacity={0.7}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(item.first_name?.[0] || '') + (item.last_name?.[0] || '')}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.first_name} {item.last_name}</Text>
              {item.membership_number ? (
                <Text style={s.memNo}>Member #{item.membership_number}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={C.muted} />
              <Text style={s.emptyText}>
                {query ? 'No farmers match your search' : 'No farmers found in your cooperative'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: C.text },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#f5f5f5', borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: C.primary + '20',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: C.primary },
  name: { fontSize: 15, fontWeight: '600', color: C.text },
  memNo: { fontSize: 12, color: C.muted, marginTop: 2 },
  error: { color: 'red', textAlign: 'center', margin: 24 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 12 },
});
