import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { coopAPI } from '../services/api';
import { C } from '../theme';
import ProfileAvatar from '../components/ProfileAvatar';

export default function CaptureOfficerDashboardScreen({ navigation }) {
  const { user } = useAuth();

  const [stats,      setStats]      = useState(null);
  const [farmers,    setFarmers]    = useState([]);
  const [farms,      setFarms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, farmersRes, farmsRes] = await Promise.allSettled([
        coopAPI.getStats(),
        coopAPI.getFarmers(),
        coopAPI.getFarms(),
      ]);
      if (statsRes.status === 'fulfilled')  setStats(statsRes.value.data);
      if (farmersRes.status === 'fulfilled') setFarmers(Array.isArray(farmersRes.value.data) ? farmersRes.value.data : []);
      if (farmsRes.status === 'fulfilled') {
        const d = farmsRes.value.data;
        setFarms(Array.isArray(d) ? d : (d?.farms || []));
      }
    } catch (e) {
      console.warn('CaptureOfficerDashboard load:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const coopName = stats?.coop_name || null;
  const totalFarmers = farmers.length || stats?.total_farmers || stats?.member_count || 0;
  const totalFarms   = farms.length   || stats?.total_farms   || 0;
  const pendingFarms = farms.filter(f => !f.coop_status || f.coop_status === 'pending').length;

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.c700} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero header */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={s.greet}>{greeting},</Text>
              <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
              <Text style={s.roleTag}>Farm Capturing Officer</Text>
              {coopName ? <Text style={s.coopTag}>{coopName}</Text> : null}
            </View>
            <ProfileAvatar />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stat cards */}
        <View style={s.cardsRow}>
          <StatCard
            icon="people"
            iconColor={C.c600}
            value={totalFarmers}
            label="Total Farmers"
            accent={C.c600}
            onPress={() => navigation.getParent()?.navigate('CaptureFarmers')}
          />
          <StatCard
            icon="location"
            iconColor="#1d4ed8"
            value={totalFarms}
            label="Total Farms"
            accent="#1d4ed8"
            onPress={() => navigation.getParent()?.navigate('CaptureFarms')}
          />
        </View>

        {pendingFarms > 0 && (
          <View style={s.alertBanner}>
            <Ionicons name="hourglass-outline" size={16} color="#92400e" />
            <Text style={s.alertText}>{pendingFarms} farm{pendingFarms > 1 ? 's' : ''} awaiting coop approval</Text>
          </View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          style={s.captureBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SelectFarmerForCapture')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={s.captureBtnText}>Capture New Farm</Text>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Ionicons name="flash" size={15} color="#f59e0b" />
            <Text style={s.cardTitle}>Quick Actions</Text>
          </View>
          {[
            {
              icon:  'people-outline',
              label: 'View Farmers',
              color: C.c600,
              onPress: () => navigation.getParent()?.navigate('CaptureFarmers'),
            },
            {
              icon:  'map-outline',
              label: 'View Farms',
              color: '#1d4ed8',
              onPress: () => navigation.getParent()?.navigate('CaptureFarms'),
            },
            {
              icon:  'list-outline',
              label: 'Capture Queue',
              color: '#7c3aed',
              onPress: () => navigation.navigate('QueueList'),
            },
            {
              icon:  'person-circle-outline',
              label: 'My Profile',
              color: C.c700,
              onPress: () => navigation.navigate('CoopProfile'),
            },
          ].map((a, i, arr) => (
            <TouchableOpacity
              key={a.label}
              style={[s.actionRow, i < arr.length - 1 && s.rowBorder]}
              onPress={a.onPress}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: a.color + '18' }]}>
                <Ionicons name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={s.actionLabel}>{a.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.subtle} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

function StatCard({ icon, iconColor, value, label, accent, onPress }) {
  return (
    <TouchableOpacity
      style={[s.statCard, { borderLeftColor: accent }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <Ionicons name={icon} size={26} color={iconColor} style={{ marginBottom: 8 }} />
      <Text style={s.statVal}>{value ?? '—'}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero:      { backgroundColor: C.c800, paddingHorizontal: 20, paddingBottom: 20 },
  heroTop:   { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 14, gap: 12 },
  greet:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  name:      { fontSize: 22, fontWeight: '800', color: '#fff' },
  roleTag:   { fontSize: 11, fontWeight: '700', color: C.c400, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  coopTag:   { fontSize: 13, color: C.c200, marginTop: 5, fontWeight: '600' },

  scroll:  { flex: 1 },
  content: { padding: 16 },

  cardsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statVal:   { fontSize: 28, fontWeight: '900', color: C.ink, marginBottom: 4 },
  statLabel: { fontSize: 11, fontWeight: '700', color: C.muted, lineHeight: 14 },

  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fef3c7', borderRadius: 12, padding: 12, marginBottom: 12,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  alertText: { fontSize: 13, color: '#92400e', fontWeight: '600' },

  captureBtn: {
    backgroundColor: C.c700, borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginBottom: 14,
    shadowColor: C.c700, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  captureBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, borderBottomWidth: 1, borderBottomColor: C.steel100,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: C.ink },

  actionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  actionIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionLabel:{ flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },
});
