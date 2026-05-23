import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../utils/roles';
import { C } from '../theme';

const MenuItem = ({ icon, label, onPress, destructive, right }) => (
  <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.7}>
    <View style={[s.menuIcon, destructive && { backgroundColor: C.eudrHighBg }]}>
      <Ionicons name={icon} size={20} color={destructive ? C.eudrHigh : C.c600} />
    </View>
    <Text style={[s.menuLabel, destructive && { color: C.eudrHigh }]}>{label}</Text>
    {right || <Ionicons name="chevron-forward" size={16} color={C.subtle} />}
  </TouchableOpacity>
);

const InfoItem = ({ label, value }) => (
  <View style={s.infoItem}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value || '—'}</Text>
  </View>
);

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (() => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0] || '';
    return (f + l).toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  })();

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            await logout();
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{fullName}</Text>
          <Text style={s.email}>{user?.email || user?.phone || ''}</Text>
          {user?.role && (
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{roleLabel(user).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Account info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.card}>
            <InfoItem label="Email" value={user?.email} />
            <InfoItem label="Phone" value={user?.phone} />
            <InfoItem label="National ID" value={user?.national_id} />
            <InfoItem label="County" value={user?.county || user?.district} />
            <InfoItem label="Role" value={roleLabel(user)} />
            {user?.cooperative_name && (
              <InfoItem label="Cooperative" value={user.cooperative_name} />
            )}
          </View>
        </View>

        {/* App section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>App</Text>
          <View style={s.card}>
            <MenuItem
              icon="phone-portrait-outline"
              label="Capture Farm Boundary"
              onPress={() => {}} // navigates via tabs
            />
            <MenuItem
              icon="cloud-upload-outline"
              label="Sync Queue"
              onPress={() => {}}
            />
            <MenuItem
              icon="information-circle-outline"
              label="About Plotra"
              onPress={() => Alert.alert(
                'Plotra',
                'Plotra v1.1.0\n\nEUDR-compliant agricultural intelligence platform.\n\nCopernicus Sentinel-2 · Hansen GFC · XGBoost ML',
              )}
            />
          </View>
        </View>

        {/* Compliance */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Compliance</Text>
          <View style={s.card}>
            <View style={s.complianceRow}>
              <View style={[s.compDot, { backgroundColor: '#22c55e' }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.compTitle}>EUDR Regulation (EU) 2023/1115</Text>
                <Text style={s.compDesc}>Data collected through this app is used for EUDR due diligence. All spatial data is encrypted at rest.</Text>
              </View>
            </View>
            <View style={s.complianceRow}>
              <View style={[s.compDot, { backgroundColor: '#6366f1' }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.compTitle}>Copernicus Sentinel-2</Text>
                <Text style={s.compDesc}>Satellite indices (NDVI, BSI, NBR) sourced from CDSE free-tier API.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={s.section}>
          <View style={s.card}>
            <MenuItem
              icon="log-out-outline"
              label={loggingOut ? 'Signing out…' : 'Sign Out'}
              onPress={confirmLogout}
              destructive
              right={loggingOut ? <ActivityIndicator size="small" color={C.eudrHigh} /> : undefined}
            />
          </View>
        </View>

        <Text style={s.version}>Plotra Agent App • v1.1.0 • © 2025 Plotra</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },

  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  avatarText: { fontSize: 28, fontWeight: '800', color: C.white },
  name: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 4 },
  email: { fontSize: 14, color: C.muted, fontWeight: '500' },
  roleBadge: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 10, backgroundColor: C.c050, borderWidth: 1, borderColor: C.c200 },
  roleText: { fontSize: 11, fontWeight: '800', color: C.c700, letterSpacing: 0.5 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  infoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },

  complianceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  compDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  compTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 4 },
  compDesc: { fontSize: 12, color: C.muted, lineHeight: 17 },

  version: { textAlign: 'center', fontSize: 11, color: C.subtle, marginTop: 28, fontWeight: '500' },
});
