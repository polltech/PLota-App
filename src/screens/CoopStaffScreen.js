import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, RefreshControl, StatusBar, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const initials = (f, l) => ((f?.[0] || '') + (l?.[0] || '')).toUpperCase() || '?';

export default function CoopStaffScreen() {
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Form state
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [nationalId,  setNationalId]  = useState('');
  const [jobTitle,    setJobTitle]    = useState('Delivery Agent');
  const [creating,    setCreating]    = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getStaff();
      const d = res.data;
      setStaff(Array.isArray(d) ? d : []);
    } catch (e) {
      console.warn('CoopStaff load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const resetForm = () => {
    setFirstName(''); setLastName(''); setPhone('');
    setEmail(''); setPassword(''); setNationalId('');
    setJobTitle('Delivery Agent'); setShowPwd(false);
  };

  const handleCreate = async () => {
    if (!firstName.trim()) { Alert.alert('Required', 'First name is required.'); return; }
    if (!lastName.trim())  { Alert.alert('Required', 'Last name is required.'); return; }
    if (!phone.trim())     { Alert.alert('Required', 'Phone number is required.'); return; }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Required', 'Password must be at least 6 characters.'); return;
    }

    setCreating(true);
    try {
      const res = await coopAPI.createStaff({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password: password,
        national_id: nationalId.trim() || undefined,
        job_title: jobTitle.trim() || 'Delivery Agent',
      });
      setStaff(prev => [res.data, ...prev]);
      setShowCreate(false);
      resetForm();
      Alert.alert(
        'Account Created',
        `${firstName} ${lastName} can now log in with their phone number and password to record deliveries.`
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create account.');
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item, index }) => (
    <View style={[s.row, index === 0 && { borderTopWidth: 0 }]}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials(item.first_name, item.last_name)}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.rowName}>{item.first_name} {item.last_name}</Text>
        <Text style={s.rowMeta}>{item.phone || '—'}{item.email ? `  ·  ${item.email}` : ''}</Text>
        <Text style={s.rowSub}>{item.job_title || 'Delivery Agent'}  ·  Added {fmtDate(item.created_at)}</Text>
      </View>
      <View style={[s.activeBadge, !item.is_active && s.inactiveBadge]}>
        <Text style={[s.activeBadgeText, !item.is_active && { color: '#b45309' }]}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Delivery Agents</Text>
            <Text style={s.headerSub}>{staff.length} staff · can record deliveries</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add-outline" size={16} color={C.white} />
            <Text style={s.newBtnText}>Add Agent</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Info banner */}
      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#0369a1" />
        <Text style={s.infoText}>
          Delivery Agents can log in with their phone + password to record coffee deliveries on behalf of your cooperative.
        </Text>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No delivery agents yet</Text>
              <Text style={s.emptyMsg}>
                Create a Delivery Agent account so your staff can log in and record deliveries from the app.
              </Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={16} color={C.white} />
                <Text style={s.emptyBtnText}>Add First Agent</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Agent Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Delivery Agent</Text>
            <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
              <Ionicons name="close" size={24} color={C.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Role explainer */}
            <View style={s.roleBanner}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#1d4ed8" />
              <Text style={s.roleBannerText}>
                This account will have the <Text style={{ fontWeight: '900' }}>Delivery Agent</Text> role — they can record deliveries for any farmer in your cooperative. They cannot approve farmers or manage batches.
              </Text>
            </View>

            <Text style={s.fieldLabel}>First Name *</Text>
            <TextInput
              style={s.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor={C.subtle}
              autoCapitalize="words"
            />

            <Text style={s.fieldLabel}>Last Name *</Text>
            <TextInput
              style={s.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor={C.subtle}
              autoCapitalize="words"
            />

            <Text style={s.fieldLabel}>Phone Number * (used to log in)</Text>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+254 7XX XXX XXX"
              placeholderTextColor={C.subtle}
              keyboardType="phone-pad"
            />

            <Text style={s.fieldLabel}>Email (optional)</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="agent@example.com"
              placeholderTextColor={C.subtle}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={s.fieldLabel}>Password * (min 6 characters)</Text>
            <View style={s.pwdRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Set a password"
                placeholderTextColor={C.subtle}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.pwdToggle} onPress={() => setShowPwd(v => !v)}>
                <Ionicons name={showPwd ? "eye-off-outline" : "eye-outline"} size={18} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>National ID (optional)</Text>
            <TextInput
              style={s.input}
              value={nationalId}
              onChangeText={setNationalId}
              placeholder="National ID number"
              placeholderTextColor={C.subtle}
              keyboardType="numeric"
            />

            <Text style={s.fieldLabel}>Job Title</Text>
            <TextInput
              style={s.input}
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder="Delivery Agent"
              placeholderTextColor={C.subtle}
            />

            <TouchableOpacity
              style={[s.submitBtn, creating && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.8}
            >
              {creating
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name="person-add-outline" size={18} color={C.white} />
                    <Text style={s.submitBtnText}>Create Agent Account</Text>
                  </>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.c700, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  newBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18, fontWeight: '500' },

  list: { paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel100 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '900', color: C.white },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowSub: { fontSize: 11, color: C.subtle, marginTop: 2 },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  inactiveBadge: { backgroundColor: '#fef3c7' },
  activeBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803d' },

  empty: { alignItems: 'center', paddingVertical: 70, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, backgroundColor: C.c700, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: C.white, fontSize: 14, fontWeight: '800' },

  // Modal
  modal: { flex: 1, backgroundColor: C.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.steel200, paddingTop: 52 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  modalBody: { flex: 1, padding: 20 },

  roleBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', padding: 14, borderRadius: 12, marginBottom: 8 },
  roleBannerText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 19 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.steel700, marginBottom: 6, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderColor: C.steel200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.ink, backgroundColor: C.steel100 },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pwdToggle: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.steel200, alignItems: 'center', justifyContent: 'center', backgroundColor: C.steel100 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  submitBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
