import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI, farmerAPI } from '../services/api';
import { C } from '../theme';

const verifyColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'verified') return C.eudrLow;
  if (s === 'pending' || s === 'update_requested') return C.eudrMedium;
  if (s === 'rejected') return C.eudrHigh;
  return C.subtle;
};

const InfoRow = ({ icon, label, value }) => (
  <View style={s.infoRow}>
    <Ionicons name={icon} size={15} color={C.c600} style={{ marginRight: 10 }} />
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value || '—'}</Text>
  </View>
);

export default function FarmerDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmer: initialFarmer } = route.params || {};

  const [farmer, setFarmer] = useState(initialFarmer);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const farmerId = farmer?.id;
  const fullName = [farmer?.first_name, farmer?.last_name].filter(Boolean).join(' ') || 'Farmer';
  const initials = ((farmer?.first_name?.[0] || '') + (farmer?.last_name?.[0] || '')).toUpperCase() || '?';
  const statusColor = verifyColor(farmer?.verification_status);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Load farmer's farms from coop farms and filter
      const farmsRes = await coopAPI.getFarms();
      const allFarms = farmsRes.data?.farms || farmsRes.data || [];
      setFarms(allFarms.filter((f) => String(f.owner_id) === String(farmerId) || String(f.farmer_id) === String(farmerId)));
    } catch (e) {
      console.warn('FarmerDetail load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [farmerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleVerify = () => {
    Alert.alert(
      'Verify Farmer',
      `Confirm verification for ${fullName}? This marks them as KYC-approved within your cooperative.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Verify',
          onPress: async () => {
            setVerifying(true);
            try {
              await coopAPI.verifyFarmer(farmerId);
              setFarmer((prev) => ({ ...prev, verification_status: 'verified' }));
              Alert.alert('Verified', `${fullName} has been verified successfully.`);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Verification failed.');
            } finally {
              setVerifying(false);
            }
          },
        },
      ]
    );
  };

  const isPending = ['pending', 'update_requested'].includes((farmer?.verification_status || '').toLowerCase());

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <View style={s.hero}>
        <SafeAreaView>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={C.white} />
          </TouchableOpacity>
          <View style={s.heroBody}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.heroName}>{fullName}</Text>
            <View style={[s.statusBadge, { backgroundColor: statusColor + '25' }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusText, { color: statusColor }]}>
                {(farmer?.verification_status || 'UNVERIFIED').toUpperCase()}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
      >
        {/* Verify banner */}
        {isPending && (
          <TouchableOpacity
            style={[s.verifyBanner, verifying && s.btnDisabled]}
            onPress={handleVerify}
            disabled={verifying}
            activeOpacity={0.85}
          >
            {verifying ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
            )}
            <Text style={s.verifyBannerText}>
              {verifying ? 'Verifying…' : 'Approve & Verify This Farmer'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Personal info */}
        <View style={s.section}>
          <Text style={s.subHeader}>Personal Information</Text>
          <InfoRow icon="person-outline" label="Full Name" value={fullName} />
          <InfoRow icon="call-outline" label="Phone" value={farmer?.phone} />
          <InfoRow icon="mail-outline" label="Email" value={farmer?.email} />
          <InfoRow icon="card-outline" label="National ID" value={farmer?.national_id} />
          <InfoRow icon="people-outline" label="Gender" value={farmer?.gender} />
          <InfoRow icon="location-outline" label="County" value={farmer?.county} />
          <InfoRow icon="calendar-outline" label="Joined" value={farmer?.created_at ? new Date(farmer.created_at).toLocaleDateString() : null} />
        </View>

        {/* Cooperative status */}
        <View style={s.section}>
          <Text style={s.subHeader}>Cooperative Status</Text>
          <InfoRow icon="checkmark-circle-outline" label="KYC Status" value={farmer?.verification_status} />
          <InfoRow icon="people-circle-outline" label="Coop Status" value={farmer?.coop_status} />
          {farmer?.update_requested && (
            <View style={s.noteBox}>
              <Ionicons name="information-circle-outline" size={16} color={C.eudrMedium} />
              <Text style={s.noteText}>
                Update requested{farmer.update_requested_by_name ? ` by ${farmer.update_requested_by_name}` : ''}.
                {farmer.update_request_notes ? `\n"${farmer.update_request_notes}"` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Farms */}
        <View style={s.section}>
          <Text style={s.subHeader}>Farms ({farms.length})</Text>
          {loading ? (
            <ActivityIndicator color={C.c700} style={{ marginVertical: 20 }} />
          ) : farms.length === 0 ? (
            <Text style={s.noFarms}>No farms registered yet.</Text>
          ) : (
            farms.map((farm) => (
              <TouchableOpacity
                key={farm.id}
                style={s.farmRow}
                onPress={() => navigation.navigate('FarmDetail', { farm })}
              >
                <Ionicons name="leaf-outline" size={16} color={C.c600} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.farmName} numberOfLines={1}>{farm.farm_name || farm.name || 'Unnamed Farm'}</Text>
                  <Text style={s.farmMeta}>{farm.total_area_ha ? `${Number(farm.total_area_ha).toFixed(2)} ha` : ''}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={C.subtle} />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroBody: { alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.c600, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 24, fontWeight: '800', color: C.white },
  heroName: { fontSize: 22, fontWeight: '800', color: C.white, marginBottom: 10 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  scroll: { flex: 1 },
  content: { padding: 20 },

  verifyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.eudrLow, borderRadius: 16, paddingVertical: 16, marginBottom: 16, shadowColor: C.eudrLow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  verifyBannerText: { color: C.white, fontSize: 15, fontWeight: '800' },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  subHeader: { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '700', textAlign: 'right', maxWidth: '55%' },

  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.eudrMedBg, borderRadius: 10, padding: 12, marginTop: 8 },
  noteText: { flex: 1, fontSize: 12, color: C.eudrMedium, lineHeight: 18, fontWeight: '500' },

  farmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmName: { fontSize: 14, fontWeight: '700', color: C.ink },
  farmMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  noFarms: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 20 },
});
