import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

const eudrColor = (status) => {
  if (!status) return C.subtle;
  const s = status.toUpperCase();
  if (s.includes('COMPLIANT') || s === 'LOW') return C.eudrLow;
  if (s === 'MEDIUM' || s.includes('PENDING')) return C.eudrMedium;
  return C.eudrHigh;
};

const StatCard = ({ icon, label, value, color }) => (
  <View style={s.statCard}>
    <View style={[s.statIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={s.statVal}>{value}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [stats, setStats] = useState(null);
  const [farms, setFarms] = useState([]);
  const [pendingSync, setPendingSync] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'Agent';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsRes, farmsRes, notifRes] = await Promise.allSettled([
        farmerAPI.getStats(),
        farmerAPI.getFarms(),
        farmerAPI.getNotifications(),
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (farmsRes.status === 'fulfilled') setFarms(farmsRes.value.data?.farms || farmsRes.value.data || []);
      if (notifRes.status === 'fulfilled') setNotifications(notifRes.value.data?.notifications || []);

      // Local pending count
      try {
        const { dbService: db } = require('../services/database');
        const r = await db.getPendingCount();
        setPendingSync(r?.count || 0);
      } catch (_) {}
    } catch (e) {
      console.warn('Home load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const recentFarms = farms.slice(0, 3);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={C.c700} size="large" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Hero header */}
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroInner}>
            <View>
              <Text style={s.greet}>{greeting},</Text>
              <Text style={s.name}>{firstName}</Text>
            </View>
            <View style={s.logoCircle}>
              <Image source={require('../../assets/logo.jpeg')} style={s.logo} />
            </View>
          </View>
          {pendingSync > 0 && (
            <TouchableOpacity
              style={s.syncBanner}
              onPress={() => navigation.navigate('Capture', { screen: 'QueueList' })}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fbbf24" />
              <Text style={s.syncBannerText}>{pendingSync} capture{pendingSync > 1 ? 's' : ''} pending sync — tap to view</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick stats */}
        <Text style={s.sectionTitle}>Overview</Text>
        <View style={s.statsRow}>
          <StatCard icon="leaf-outline" label="Farms" value={stats?.farms_count ?? farms.length} color={C.c600} />
          <StatCard icon="map-outline" label="Parcels" value={stats?.parcels_count ?? '—'} color="#6366f1" />
          <StatCard icon="cube-outline" label="Deliveries" value={stats?.deliveries_count ?? '—'} color="#0ea5e9" />
        </View>

        {/* EUDR compliance at a glance */}
        {stats?.eudr_risk_level != null && (
          <View style={s.eudrCard}>
            <View style={s.eudrLeft}>
              <Ionicons name="shield-checkmark-outline" size={26} color={eudrColor(stats.eudr_risk_level)} />
              <View style={{ marginLeft: 12 }}>
                <Text style={s.eudrTitle}>EUDR Status</Text>
                <Text style={[s.eudrStatus, { color: eudrColor(stats.eudr_risk_level) }]}>
                  {stats.eudr_risk_level}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.subtle} />
          </View>
        )}

        {/* Quick actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionsRow}>
          {[
            { icon: 'location-outline', label: 'Capture\nBoundary', tab: 'Capture', screen: 'CaptureLanding', color: C.c700 },
            { icon: 'leaf-outline', label: 'My\nFarms', tab: 'Farms', screen: 'FarmsList', color: '#6366f1' },
            { icon: 'cube-outline', label: 'Deliveries', tab: 'Deliveries', screen: null, color: '#0ea5e9' },
            { icon: 'list-outline', label: 'Sync\nQueue', tab: 'Capture', screen: 'QueueList', color: '#f59e0b' },
          ].map(({ icon, label, tab, screen, color }) => (
            <TouchableOpacity
              key={label}
              style={s.actionBtn}
              onPress={() => screen
                ? navigation.navigate(tab, { screen })
                : navigation.navigate(tab)
              }
              activeOpacity={0.75}
            >
              <View style={[s.actionIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon} size={24} color={color} />
              </View>
              <Text style={s.actionLabel}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent farms */}
        {recentFarms.length > 0 && (
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>Recent Farms</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Farms')}>
                <Text style={s.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentFarms.map((farm) => (
              <TouchableOpacity
                key={farm.id}
                style={s.farmCard}
                onPress={() => navigation.navigate('Farms', { screen: 'FarmDetail', params: { farm } })}
                activeOpacity={0.8}
              >
                <View style={s.farmIconWrap}>
                  <Ionicons name="leaf" size={20} color={C.c600} />
                </View>
                <View style={s.farmInfo}>
                  <Text style={s.farmName} numberOfLines={1}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
                  <Text style={s.farmMeta}>
                    {farm.total_area_ha ? `${Number(farm.total_area_ha).toFixed(2)} ha` : ''}{farm.county ? ` • ${farm.county}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.subtle} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Notifications</Text>
            {notifications.slice(0, 3).map((n, i) => (
              <View key={n.id || i} style={s.notifCard}>
                <View style={s.notifDot} />
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle} numberOfLines={1}>{n.title || 'Notification'}</Text>
                  <Text style={s.notifMsg} numberOfLines={2}>{n.message || ''}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },

  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 28, paddingTop: 0 },
  heroInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginBottom: 16 },
  greet: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: C.white },
  logoCircle: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  logo: { width: '100%', height: '100%' },
  syncBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)' },
  syncBannerText: { fontSize: 12, color: '#fbbf24', fontWeight: '700', flex: 1 },

  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: 24 },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  seeAll: { fontSize: 13, color: C.c600, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: C.white, borderRadius: 18, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statVal: { fontSize: 22, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginTop: 2 },

  eudrCard: { backgroundColor: C.white, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  eudrLeft: { flexDirection: 'row', alignItems: 'center' },
  eudrTitle: { fontSize: 12, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  eudrStatus: { fontSize: 16, fontWeight: '800', marginTop: 2 },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  actionBtn: { width: '22%', alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.steel700, textAlign: 'center', lineHeight: 14 },

  farmCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  farmIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  farmInfo: { flex: 1 },
  farmName: { fontSize: 15, fontWeight: '700', color: C.ink },
  farmMeta: { fontSize: 12, color: C.muted, marginTop: 2 },

  notifCard: { backgroundColor: C.white, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.c600, marginTop: 5 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  notifMsg: { fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 17 },
});
