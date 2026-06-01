import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

// ── Sub-components ────────────────────────────────────────────────────────────
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

const EditField = ({ label, value, onChangeText, keyboardType, placeholder }) => (
  <View style={s.editField}>
    <Text style={s.editLabel}>{label}</Text>
    <TextInput
      style={s.editInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor={C.subtle}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
    />
  </View>
);

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();

  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState(user?.first_name  || '');
  const [lastName,  setLastName]  = useState(user?.last_name   || '');
  const [phone,     setPhone]     = useState(user?.phone       || '');
  const [county,    setCounty]    = useState(user?.county || user?.district || '');
  const [subcounty, setSubcounty] = useState(user?.subcounty   || '');
  const [ward,      setWard]      = useState(user?.ward        || '');

  const initials = (() => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0]  || '';
    return (f + l).toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  })();

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'User';

  const startEdit = () => {
    setFirstName(user?.first_name  || '');
    setLastName (user?.last_name   || '');
    setPhone    (user?.phone       || '');
    setCounty   (user?.county || user?.district || '');
    setSubcounty(user?.subcounty   || '');
    setWard     (user?.ward        || '');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || undefined,
        county:     county.trim() || undefined,
        subcounty:  subcounty.trim() || undefined,
        ward:       ward.trim() || undefined,
      };
      const res = await farmerAPI.updateProfile(payload);
      await updateUser(res.data || payload);
      setEditing(false);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to save profile.';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => { setLoggingOut(true); await logout(); },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Profile</Text>
        {!editing ? (
          <TouchableOpacity style={s.editBtn} onPress={startEdit} activeOpacity={0.8}>
            <Ionicons name="create-outline" size={18} color={C.c700} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.cancelBtn} onPress={cancelEdit} activeOpacity={0.8}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          {!editing && (
            <>
              <Text style={s.name}>{fullName}</Text>
              <Text style={s.email}>{user?.email || user?.phone || ''}</Text>
              <View style={s.roleBadge}>
                <Text style={s.roleText}>FARMER</Text>
              </View>
            </>
          )}
        </View>

        {/* ── EDIT MODE ──────────────────────────────────────────────────── */}
        {editing && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Edit Profile</Text>
            <View style={s.card}>
              <View style={s.editRow}>
                <View style={{ flex: 1 }}>
                  <EditField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <EditField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
                </View>
              </View>
              <EditField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+254..." />
              <EditField label="County" value={county} onChangeText={setCounty} placeholder="e.g. Kirinyaga" />
              <EditField label="Sub-County" value={subcounty} onChangeText={setSubcounty} placeholder="e.g. Mwea" />
              <EditField label="Ward" value={ward} onChangeText={setWard} placeholder="e.g. Tebere" />

              <TouchableOpacity
                style={[s.saveBtn, saving && s.saveBtnDisabled]}
                onPress={saveProfile}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color={C.white} />
                  : <Text style={s.saveBtnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── VIEW MODE ──────────────────────────────────────────────────── */}
        {!editing && (
          <>
            {/* Account info */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Account</Text>
              <View style={s.card}>
                <InfoItem label="Email"       value={user?.email} />
                <InfoItem label="Phone"       value={user?.phone} />
                <InfoItem label="National ID" value={user?.national_id} />
                <InfoItem label="County"      value={user?.county || user?.district} />
                <InfoItem label="Sub-County"  value={user?.subcounty} />
                <InfoItem label="Ward"        value={user?.ward} />
                {user?.cooperative_name && (
                  <InfoItem label="Cooperative" value={user.cooperative_name} />
                )}
              </View>
            </View>

            {/* App navigation */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>App</Text>
              <View style={s.card}>
                <MenuItem icon="grid-outline"       label="Dashboard"              onPress={() => navigation.navigate('Dashboard')} />
                <MenuItem icon="leaf-outline"       label="My Farms"               onPress={() => navigation.navigate('Farms')} />
                <MenuItem icon="add-circle-outline" label="Add Farm / Capture Boundary" onPress={() => navigation.navigate('Capture')} />
                <MenuItem icon="cube-outline"       label="My Deliveries"          onPress={() => navigation.navigate('Deliveries')} />
                <MenuItem icon="cloud-upload-outline" label="Sync Queue"           onPress={() => navigation.navigate('Dashboard', { screen: 'QueueList' })} />
              </View>
            </View>

            {/* Documents */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Documents & Compliance</Text>
              <View style={s.card}>
                <MenuItem
                  icon="document-text-outline"
                  label="KYC Documents"
                  onPress={() => Alert.alert('KYC Documents', 'Upload and manage your identity verification documents via the Plotra web dashboard at dev.plotra.eu')}
                />
                <MenuItem
                  icon="shield-checkmark-outline"
                  label="EUDR Compliance"
                  onPress={() => Alert.alert('EUDR Compliance', 'View detailed EUDR compliance reports, generate Due Diligence Statements, and review satellite findings for your farms.')}
                />
                <MenuItem
                  icon="analytics-outline"
                  label="Satellite Reports"
                  onPress={() => navigation.navigate('Farms')}
                />
                <MenuItem
                  icon="information-circle-outline"
                  label="About Plotra"
                  onPress={() => Alert.alert('Plotra v1.1.0', 'EUDR-compliant agricultural intelligence platform.\n\nCopernicus Sentinel-2 · Hansen GFC · XGBoost ML\n\nAll spatial data encrypted at rest.')}
                />
              </View>
            </View>

            {/* EUDR Compliance */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Compliance</Text>
              <View style={s.card}>
                <View style={s.complianceRow}>
                  <View style={[s.compDot, { backgroundColor: '#22c55e' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.compTitle}>EUDR Regulation (EU) 2023/1115</Text>
                    <Text style={s.compDesc}>Data collected through this app supports EUDR due diligence. All spatial data is encrypted at rest.</Text>
                  </View>
                </View>
                <View style={s.complianceRow}>
                  <View style={[s.compDot, { backgroundColor: '#6366f1' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.compTitle}>Copernicus Sentinel-2</Text>
                    <Text style={s.compDesc}>Satellite indices (NDVI, BSI, NBR) sourced from CDSE free-tier API.</Text>
                  </View>
                </View>
                <View style={s.complianceRow}>
                  <View style={[s.compDot, { backgroundColor: '#f59e0b' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.compTitle}>Hansen Global Forest Change</Text>
                    <Text style={s.compDesc}>Deforestation baseline uses Hansen GFC data (2000–2020).</Text>
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
          </>
        )}

        <Text style={s.version}>Plotra Agent App • v1.1.0 • © 2025 Plotra</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },

  header: { backgroundColor: C.white, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.c050, borderWidth: 1, borderColor: C.c200 },
  editBtnText: { fontSize: 13, fontWeight: '700', color: C.c700 },
  cancelBtn: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: C.steel100, borderWidth: 1, borderColor: C.steel300 },
  cancelBtnText: { fontSize: 13, fontWeight: '700', color: C.steel700 },

  avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
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

  // Edit mode
  editRow: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 14 },
  editField: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  editLabel: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  editInput: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  saveBtn: { margin: 16, backgroundColor: C.c700, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  saveBtnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  saveBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },

  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },

  complianceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  compDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  compTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 4 },
  compDesc: { fontSize: 12, color: C.muted, lineHeight: 17 },

  version: { textAlign: 'center', fontSize: 11, color: C.subtle, marginTop: 28, fontWeight: '500' },
});
