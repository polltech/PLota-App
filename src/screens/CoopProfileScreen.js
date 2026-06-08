import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { C } from '../theme';

const InfoRow = ({ label, value }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={s.infoValue}>{value || '—'}</Text>
  </View>
);

const Field = ({ label, value, onChangeText, keyboardType, placeholder }) => (
  <View style={s.field}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TextInput
      style={s.fieldInput}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || label}
      placeholderTextColor={C.subtle}
      keyboardType={keyboardType || 'default'}
      autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
    />
  </View>
);

export default function CoopProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();

  const [editing,    setEditing]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName,  setLastName]  = useState(user?.last_name  || '');
  const [phone,     setPhone]     = useState(user?.phone      || '');
  const [email,     setEmail]     = useState(user?.email      || '');

  const initials = (() => {
    const f = user?.first_name?.[0] || '';
    const l = user?.last_name?.[0]  || '';
    return (f + l).toUpperCase() || user?.email?.[0]?.toUpperCase() || 'CO';
  })();

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Officer';

  const startEdit = () => {
    setFirstName(user?.first_name || '');
    setLastName (user?.last_name  || '');
    setPhone    (user?.phone      || '');
    setEmail    (user?.email      || '');
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'First and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim() || undefined,
        email:      email.trim() || undefined,
      };
      const res = await authAPI.updateProfile(payload);
      await updateUser(res.data || payload);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to save.';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => { setLoggingOut(true); await logout(); },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Profile</Text>
        {!editing ? (
          <TouchableOpacity onPress={startEdit} style={s.editBtn}>
            <Ionicons name="create-outline" size={18} color={C.c700} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setEditing(false)} style={s.editBtn}>
            <Text style={[s.editBtnText, { color: C.muted }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={s.avatarSection}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{fullName}</Text>
          <Text style={s.email}>{user?.email || user?.phone || ''}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="business-outline" size={12} color={C.c700} />
            <Text style={s.roleText}>COOPERATIVE OFFICER</Text>
          </View>
        </View>

        {/* Edit form */}
        {editing && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Edit Profile</Text>
            <View style={s.card}>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field label="First Name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Last name" />
                </View>
              </View>
              <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+254..." />
              <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="email@example.com" />

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.6 }]}
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

        {/* Personal details */}
        {!editing && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Personal Details</Text>
            <View style={s.card}>
              <InfoRow label="Full Name"   value={fullName} />
              <InfoRow label="Email"       value={user?.email} />
              <InfoRow label="Phone"       value={user?.phone} />
              <InfoRow label="National ID" value={user?.national_id} />
              <InfoRow label="Role"        value="Cooperative Officer" />
              <InfoRow label="Country"     value={user?.country || 'Kenya'} />
            </View>
          </View>
        )}

        {/* Cooperative info */}
        {!editing && (user?.cooperative_name || user?.cooperative_id) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Cooperative</Text>
            <View style={s.card}>
              <InfoRow label="Name"   value={user?.cooperative_name} />
              <InfoRow label="County" value={user?.county || user?.district} />
            </View>
          </View>
        )}

        {/* Actions */}
        {!editing && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Account</Text>
            <View style={s.card}>
              <TouchableOpacity style={s.actionRow} onPress={confirmLogout} activeOpacity={0.7} disabled={loggingOut}>
                <View style={[s.actionIcon, { backgroundColor: '#fee2e2' }]}>
                  {loggingOut
                    ? <ActivityIndicator color="#dc2626" size="small" />
                    : <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                  }
                </View>
                <Text style={[s.actionLabel, { color: '#dc2626' }]}>Sign Out</Text>
                <Ionicons name="chevron-forward" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.steel100 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: C.ink },
  editBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText:  { fontSize: 14, fontWeight: '700', color: C.c700 },

  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: C.white, marginBottom: 8 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  avatarText:    { fontSize: 28, fontWeight: '900', color: C.white },
  name:          { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 4 },
  email:         { fontSize: 13, color: C.muted, marginBottom: 10 },
  roleBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.c50, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.c200 },
  roleText:      { fontSize: 11, fontWeight: '800', color: C.c700, letterSpacing: 0.5 },

  section:       { marginHorizontal: 16, marginTop: 16 },
  sectionTitle:  { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  card:          { backgroundColor: C.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },

  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { fontSize: 13, color: C.ink, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },

  row:       { flexDirection: 'row' },
  field:     { marginBottom: 14 },
  fieldLabel:{ fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput:{ backgroundColor: C.steel100, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, borderWidth: 1, borderColor: C.steel200 },

  saveBtn:     { backgroundColor: C.c700, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },

  actionRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  actionIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionLabel:{ fontSize: 15, fontWeight: '700', flex: 1 },
});
