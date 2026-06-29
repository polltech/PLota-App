import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, RefreshControl, StatusBar, Alert, TextInput, SectionList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';
import { STAFF_ROLE_OPTIONS, ROLES, roleLabel } from '../utils/roles';
import ProfileAvatar from '../components/ProfileAvatar';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const initials = (f, l) => ((f?.[0] || '') + (l?.[0] || '')).toUpperCase() || '?';

// ── Role metadata ─────────────────────────────────────────────────────────────
const ROLE_META = {
  [ROLES.DELIVERY_AGENT]: {
    color: '#d97706', bg: '#fef3c7',
    icon: 'scale-outline',
    privileges: [
      'Record coffee cherry deliveries at the weighing station',
      'Log cherry weight, moisture, tare weight',
      'Add sorting / initial processing notes',
      'View their own delivery history',
    ],
    accessDesc: 'Dashboard + Deliveries tabs',
  },
  [ROLES.WASHING_STATION]: {
    color: '#0891b2', bg: '#e0f2fe',
    icon: 'water-outline',
    privileges: [
      'Manage deliveries and receipts at the washing station',
      'Log washing processing steps for deliveries',
      'View delivery processing history',
    ],
    accessDesc: 'Dashboard + Deliveries tabs',
  },
  [ROLES.POST_HARVEST]: {
    color: '#7c3aed', bg: '#ede9fe',
    icon: 'flask-outline',
    privileges: [
      'Enter lab results: moisture, cup scores, screen size',
      'Log drying, milling, grading, and packing steps',
      'View and annotate batch processing history',
    ],
    accessDesc: 'Dashboard + Deliveries + Lab Results tabs',
  },
  [ROLES.AGRONOMIST]: {
    color: '#15803d', bg: '#dcfce7',
    icon: 'leaf-outline',
    privileges: [
      'Validate and approve farmer onboarding applications',
      'Review and approve farm data and GPS boundaries',
      'Assess EUDR compliance documentation',
      'Request corrections from farmers',
    ],
    accessDesc: 'Farmers + Farms + Compliance tabs',
  },
  [ROLES.FINANCE_ADMIN]: {
    color: '#1d4ed8', bg: '#dbeafe',
    icon: 'briefcase-outline',
    privileges: [
      'View released and exported batches',
      'Calculate and submit farmer payment apportionment',
      'Manage export consignments and trade documents',
      'Process and approve payment disbursements',
    ],
    accessDesc: 'Batches + Consignments + Payments tabs',
  },
  [ROLES.FARM_CAPTURING_OFFICER]: {
    color: '#166534', bg: '#dcfce7',
    icon: 'map-outline',
    privileges: [
      'Select a farmer from the cooperative roster',
      'Capture GPS farm boundary on behalf of the farmer',
      'Submit farm data and polygon coordinates',
      'View cooperative farmers list',
    ],
    accessDesc: 'Dashboard + Farmers tabs',
  },
};

const getRoleMeta = (role) =>
  ROLE_META[role] || { color: C.steel600, bg: C.steel100, icon: 'person-outline', privileges: [], accessDesc: '—' };

// ── Staff Detail Modal ────────────────────────────────────────────────────────
function StaffDetailModal({ member, visible, onClose, onUpdated, onDeleted }) {
  const insets = useSafeAreaInsets();
  const [actionLoading, setActionLoading] = useState(false);
  if (!member) return null;
  const meta = getRoleMeta(member.role);
  const roleOpt = STAFF_ROLE_OPTIONS.find(r => r.value === member.role);
  const ini = initials(member.first_name, member.last_name);
  const isActive = member.is_active !== false;

  const handleToggleActive = async () => {
    setActionLoading(true);
    try {
      if (isActive) {
        await coopAPI.deactivateStaff(member.id);
        onUpdated({ ...member, is_active: false });
      } else {
        await coopAPI.activateStaff(member.id);
        onUpdated({ ...member, is_active: true });
      }
      onClose();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Action failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Permanently delete ${member.first_name} ${member.last_name}'s account? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await coopAPI.deleteStaff(member.id);
              onDeleted(member.id);
              onClose();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to delete account.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[d.root, { paddingBottom: insets.bottom }]}>
        <View style={d.header}>
          <Text style={d.headerTitle}>Staff Member</Text>
          <TouchableOpacity style={d.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={d.scroll} showsVerticalScrollIndicator={false}>
          {/* Identity */}
          <View style={d.identityCard}>
            <View style={[d.avatar, { backgroundColor: meta.color }]}>
              <Text style={d.avatarText}>{ini}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={d.identityName}>{member.first_name} {member.last_name}</Text>
              <View style={[d.roleBadge, { backgroundColor: meta.bg }]}>
                <Ionicons name={meta.icon} size={11} color={meta.color} />
                <Text style={[d.roleBadgeText, { color: meta.color }]}>
                  {roleOpt?.label || roleLabel(member)}
                </Text>
              </View>
            </View>
            <View style={[d.statusBadge, member.is_active !== false ? d.activeB : d.inactiveB]}>
              <Text style={[d.statusText, { color: member.is_active !== false ? '#15803d' : '#b45309' }]}>
                {member.is_active !== false ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {/* Contact */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Contact</Text>
            <View style={d.card}>
              {member.phone && (
                <View style={d.row}>
                  <View style={d.rowIcon}><Ionicons name="call-outline" size={15} color={C.c700} /></View>
                  <View><Text style={d.rowLabel}>Phone</Text><Text style={d.rowValue}>{member.phone}</Text></View>
                </View>
              )}
              {member.email && (
                <View style={d.row}>
                  <View style={d.rowIcon}><Ionicons name="mail-outline" size={15} color={C.c700} /></View>
                  <View><Text style={d.rowLabel}>Email</Text><Text style={d.rowValue}>{member.email}</Text></View>
                </View>
              )}
              {member.national_id && (
                <View style={d.row}>
                  <View style={d.rowIcon}><Ionicons name="card-outline" size={15} color={C.c700} /></View>
                  <View><Text style={d.rowLabel}>National ID</Text><Text style={d.rowValue}>{member.national_id}</Text></View>
                </View>
              )}
              <View style={d.row}>
                <View style={d.rowIcon}><Ionicons name="calendar-outline" size={15} color={C.c700} /></View>
                <View><Text style={d.rowLabel}>Added</Text><Text style={d.rowValue}>{fmtDate(member.created_at)}</Text></View>
              </View>
            </View>
          </View>

          {/* App access */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>App Access</Text>
            <View style={[d.card, { backgroundColor: meta.bg, borderColor: meta.color + '44' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <View style={[d.accessIconBox, { backgroundColor: meta.color }]}>
                  <Ionicons name={meta.icon} size={18} color={C.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[d.accessTitle, { color: meta.color }]}>{roleOpt?.label || roleLabel(member)}</Text>
                  <Text style={[d.accessSub, { color: meta.color }]}>{meta.accessDesc}</Text>
                </View>
              </View>
              {meta.privileges.map((p, i) => (
                <View key={i} style={d.privilegeRow}>
                  <Ionicons name="checkmark-circle" size={14} color={meta.color} />
                  <Text style={[d.privilegeText, { color: meta.color }]}>{p}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Login instructions */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Login Credentials</Text>
            <View style={d.card}>
              <Text style={d.loginHint}>
                Staff log in using their phone number and a one-time password (OTP) sent by SMS.
                No password is required — they tap "Sign in with OTP" on the login screen.
              </Text>
              <View style={d.loginRow}>
                <View style={d.rowIcon}><Ionicons name="phone-portrait-outline" size={15} color={C.c700} /></View>
                <Text style={d.loginDetail}>Login phone: <Text style={{ color: C.ink, fontWeight: '700' }}>{member.phone || '—'}</Text></Text>
              </View>
              <View style={d.loginRow}>
                <View style={d.rowIcon}><Ionicons name="chatbubble-ellipses-outline" size={15} color={C.c700} /></View>
                <Text style={d.loginDetail}>OTP sent to phone each time they sign in.</Text>
              </View>
            </View>
          </View>

          {/* Manage account */}
          <View style={d.section}>
            <Text style={d.sectionTitle}>Manage Account</Text>
            <TouchableOpacity
              style={[d.actionBtn, isActive ? d.warnBtn : d.activateBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleToggleActive}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name={isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={18} color={C.white} />
                    <Text style={d.actionBtnText}>{isActive ? 'Deactivate Account' : 'Activate Account'}</Text>
                  </>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[d.actionBtn, d.deleteBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleDelete}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={[d.actionBtnText, { color: '#dc2626' }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Create Staff Modal ────────────────────────────────────────────────────────
function CreateStaffModal({ visible, onClose, onCreate }) {
  const insets = useSafeAreaInsets();
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [staffRole,  setStaffRole]  = useState(STAFF_ROLE_OPTIONS[0].value);
  const [creating,   setCreating]   = useState(false);

  const reset = () => {
    setFirstName(''); setLastName(''); setPhone(''); setEmail('');
    setPassword(''); setNationalId(''); setShowPwd(false);
    setStaffRole(STAFF_ROLE_OPTIONS[0].value);
  };

  const handleCreate = async () => {
    if (!firstName.trim()) { Alert.alert('Required', 'First name is required.'); return; }
    if (!lastName.trim())  { Alert.alert('Required', 'Last name is required.'); return; }
    if (!phone.trim())     { Alert.alert('Required', 'Phone number is required.'); return; }
    if (password && password.length < 6) { Alert.alert('Password too short', 'Password must be at least 6 characters, or leave it blank — staff will use phone OTP to log in.'); return; }

    setCreating(true);
    try {
      const roleOpt = STAFF_ROLE_OPTIONS.find(r => r.value === staffRole);
      const res = await coopAPI.createStaff({
        first_name:  firstName.trim(),
        last_name:   lastName.trim(),
        phone:       phone.trim(),
        email:       email.trim() || undefined,
        password:    password.trim() || undefined,
        national_id: nationalId.trim() || undefined,
        role:        staffRole,
        job_title:   roleOpt?.label || staffRole,
      });
      onCreate(res.data);
      onClose();
      reset();
      Alert.alert(
        'Account Created',
        `${firstName} ${lastName} can now log in with their phone number.\n\nRole: ${roleOpt?.label || staffRole}`
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create account.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { onClose(); reset(); }}>
      <View style={[c.root, { paddingBottom: insets.bottom }]}>
        <View style={c.header}>
          <View style={{ flex: 1 }}>
            <Text style={c.headerTitle}>Add Team Member</Text>
            <Text style={c.headerSub}>Create a staff account for any role</Text>
          </View>
          <TouchableOpacity style={c.closeBtn} onPress={() => { onClose(); reset(); }} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={c.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Role picker */}
          <Text style={c.sectionTitle}>Select Role</Text>
          {STAFF_ROLE_OPTIONS.map((opt) => {
            const meta = getRoleMeta(opt.value);
            const active = staffRole === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[c.roleOption, active && { borderColor: meta.color, backgroundColor: meta.bg }]}
                onPress={() => setStaffRole(opt.value)}
                activeOpacity={0.8}
              >
                <View style={[c.roleIconBox, { backgroundColor: active ? meta.color : C.steel200 }]}>
                  <Ionicons name={opt.icon} size={18} color={active ? C.white : C.steel600} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[c.roleLabel, active && { color: meta.color }]}>{opt.label}</Text>
                  <Text style={c.roleDesc}>{opt.description}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={meta.color} />}
              </TouchableOpacity>
            );
          })}

          <Text style={c.sectionTitle}>Personal Details</Text>
          <View style={c.card}>
            <FormField label="First Name *" value={firstName} onChange={setFirstName} placeholder="First name" autoCapitalize="words" />
            <FormField label="Last Name *" value={lastName} onChange={setLastName} placeholder="Last name" autoCapitalize="words" />
            <FormField label="Phone * (used to log in)" value={phone} onChange={setPhone} placeholder="+254 7XX XXX XXX" keyboard="phone-pad" />
            <FormField label="Email (optional)" value={email} onChange={setEmail} placeholder="staff@example.com" keyboard="email-address" autoCapitalize="none" />
            <FormField label="National ID (optional)" value={nationalId} onChange={setNationalId} placeholder="ID number" keyboard="numeric" />
          </View>

          <Text style={c.sectionTitle}>Login Method</Text>
          <View style={c.otpInfoCard}>
            <View style={c.otpInfoRow}>
              <View style={c.otpInfoIcon}><Ionicons name="phone-portrait-outline" size={18} color={C.c700} /></View>
              <View style={{ flex: 1 }}>
                <Text style={c.otpInfoTitle}>Phone OTP Login</Text>
                <Text style={c.otpInfoDesc}>Staff log in using their phone number and a one-time SMS code — no password needed.</Text>
              </View>
            </View>
          </View>
          <Text style={[c.sectionTitle, { marginTop: 10 }]}>Optional Password</Text>
          <View style={c.card}>
            <View style={c.pwdRow}>
              <View style={{ flex: 1 }}>
                <FormField label="Password (optional, min 6 chars)" value={password} onChange={setPassword} placeholder="Leave blank to use OTP only" secure={!showPwd} autoCapitalize="none" />
              </View>
              <TouchableOpacity style={c.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={c.pwdHint}>Set a password only if the staff member specifically needs one. Otherwise, leave blank — they will use the OTP tab to sign in.</Text>
          </View>

          <TouchableOpacity
            style={[c.createBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
            activeOpacity={0.8}
          >
            {creating
              ? <ActivityIndicator color={C.white} size="small" />
              : <><Ionicons name="person-add-outline" size={18} color={C.white} /><Text style={c.createBtnText}>Create Account</Text></>
            }
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// Small reusable field
const FormField = ({ label, value, onChange, placeholder, keyboard, autoCapitalize, secure }) => (
  <View style={c.fieldGroup}>
    <Text style={c.fieldLabel}>{label}</Text>
    <TextInput
      style={c.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.subtle}
      keyboardType={keyboard || 'default'}
      autoCapitalize={autoCapitalize || 'sentences'}
      secureTextEntry={!!secure}
    />
  </View>
);

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CoopStaffScreen() {
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [activeTab,   setActiveTab]   = useState('all');   // 'all' | 'byRole'
  const [query,       setQuery]       = useState('');
  const [selected,    setSelected]    = useState(null);   // member for detail modal

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getStaff();
      const d = res.data;
      setStaff(Array.isArray(d) ? d : []);
    } catch (e) { console.warn('CoopStaff load:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const q = query.toLowerCase().trim();
  const filtered = staff.filter(m => {
    if (!q) return true;
    return (
      `${m.first_name || ''} ${m.last_name || ''}`.toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.role || '').toLowerCase().includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    );
  });

  // Group by role for "By Role" tab
  const sections = STAFF_ROLE_OPTIONS.map(opt => ({
    role: opt,
    meta: getRoleMeta(opt.value),
    data: filtered.filter(m => m.role === opt.value),
  })).filter(s => s.data.length > 0);

  // Stat counts
  const countByRole = (role) => staff.filter(m => m.role === role).length;

  const renderStaffCard = (member) => {
    const meta = getRoleMeta(member.role);
    const roleOpt = STAFF_ROLE_OPTIONS.find(r => r.value === member.role);
    const ini = initials(member.first_name, member.last_name);
    return (
      <TouchableOpacity
        key={String(member.id)}
        style={s.card}
        onPress={() => setSelected(member)}
        activeOpacity={0.85}
      >
        <View style={[s.avatar, { backgroundColor: meta.color }]}>
          <Text style={s.avatarText}>{ini}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{member.first_name} {member.last_name}</Text>
          <View style={s.cardMeta}>
            <View style={[s.rolePill, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={10} color={meta.color} />
              <Text style={[s.rolePillText, { color: meta.color }]}>{roleOpt?.label || roleLabel(member)}</Text>
            </View>
          </View>
          <Text style={s.cardSub}>{member.phone || ''}{member.email ? `  ·  ${member.email}` : ''}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[s.activeBadge, member.is_active === false && s.inactiveB]}>
            <Text style={[s.activeBadgeText, { color: member.is_active === false ? '#b45309' : '#15803d' }]}>
              {member.is_active !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <Text style={s.cardDate}>Added {fmtDate(member.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Team</Text>
            <Text style={s.headerSub}>{staff.length} staff across {STAFF_ROLE_OPTIONS.filter(r => countByRole(r.value) > 0).length} roles</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={16} color={C.white} />
            <Text style={s.addBtnText}>Add Member</Text>
          </TouchableOpacity>
          <ProfileAvatar />
        </View>

        {/* Role stat chips */}
        {!loading && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statRow}>
            {STAFF_ROLE_OPTIONS.map(opt => {
              const n = countByRole(opt.value);
              const meta = getRoleMeta(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.statChip, { backgroundColor: n > 0 ? meta.bg : C.steel100, borderColor: n > 0 ? meta.color : C.steel200 }]}
                  onPress={() => { setActiveTab('byRole'); setQuery(''); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={opt.icon} size={13} color={n > 0 ? meta.color : C.muted} />
                  <Text style={[s.statChipCount, { color: n > 0 ? meta.color : C.muted }]}>{n}</Text>
                  <Text style={[s.statChipLabel, { color: n > 0 ? meta.color : C.muted }]} numberOfLines={1}>{opt.label.split(' ')[0]}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Tabs */}
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'all' && s.tabBtnActive]}
            onPress={() => setActiveTab('all')} activeOpacity={0.8}
          >
            <Ionicons name="list-outline" size={15} color={activeTab === 'all' ? C.c700 : C.muted} />
            <Text style={[s.tabText, activeTab === 'all' && s.tabTextActive]}>All Staff</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, activeTab === 'byRole' && s.tabBtnActive]}
            onPress={() => setActiveTab('byRole')} activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={15} color={activeTab === 'byRole' ? C.c700 : C.muted} />
            <Text style={[s.tabText, activeTab === 'byRole' && s.tabTextActive]}>By Role</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, role, phone…"
          placeholderTextColor={C.subtle}
          autoCapitalize="none"
        />
        {!!query && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={16} color={C.muted} /></TouchableOpacity>}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : activeTab === 'all' ? (
        // ── All Staff flat list ───────────────────────────────────────────────
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderItem={({ item }) => renderStaffCard(item)}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>{query ? 'No results' : 'No team members yet'}</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Add your first team member to get started.'}</Text>
              {!query && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
                  <Ionicons name="person-add-outline" size={16} color={C.white} />
                  <Text style={s.emptyBtnText}>Add First Member</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : (
        // ── By Role grouped sections ──────────────────────────────────────────
        <SectionList
          sections={sections.length > 0 ? sections : []}
          keyExtractor={item => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderSectionHeader={({ section }) => (
            <View style={[s.sectionHeader, { backgroundColor: section.meta.bg, borderColor: section.meta.color + '55' }]}>
              <View style={[s.sectionIconBox, { backgroundColor: section.meta.color }]}>
                <Ionicons name={section.role.icon} size={16} color={C.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.sectionRoleLabel, { color: section.meta.color }]}>{section.role.label}</Text>
                <Text style={[s.sectionRoleDesc, { color: section.meta.color }]}>{section.meta.accessDesc}</Text>
              </View>
              <View style={[s.sectionCount, { backgroundColor: section.meta.color }]}>
                <Text style={s.sectionCountText}>{section.data.length}</Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => renderStaffCard(item)}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>No staff yet</Text>
              <Text style={s.emptyMsg}>Add your first team member to see them grouped by role.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => setShowCreate(true)} activeOpacity={0.8}>
                <Ionicons name="person-add-outline" size={16} color={C.white} />
                <Text style={s.emptyBtnText}>Add First Member</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Role privilege cards shown when no staff yet */}
      {!loading && staff.length === 0 && !query && activeTab === 'byRole' && (
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={s.rolesInfoTitle}>Available Roles</Text>
          {STAFF_ROLE_OPTIONS.map(opt => {
            const meta = getRoleMeta(opt.value);
            return (
              <View key={opt.value} style={[s.roleInfoCard, { borderLeftColor: meta.color }]}>
                <View style={s.roleInfoHeader}>
                  <View style={[s.roleInfoIcon, { backgroundColor: meta.bg }]}>
                    <Ionicons name={opt.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.roleInfoLabel, { color: meta.color }]}>{opt.label}</Text>
                    <Text style={s.roleInfoAccess}>{meta.accessDesc}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.roleInfoAddBtn, { backgroundColor: meta.color }]}
                    onPress={() => setShowCreate(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={14} color={C.white} />
                    <Text style={s.roleInfoAddText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {meta.privileges.map((p, i) => (
                  <View key={i} style={s.roleInfoPriv}>
                    <Ionicons name="checkmark-circle-outline" size={13} color={meta.color} />
                    <Text style={[s.roleInfoPrivText, { color: C.steel700 }]}>{p}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      <CreateStaffModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(member) => setStaff(prev => [member, ...prev])}
      />

      <StaffDetailModal
        member={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onUpdated={(updated) => {
          setStaff(prev => prev.map(m => m.id === updated.id ? updated : m));
          setSelected(updated);
        }}
        onDeleted={(id) => {
          setStaff(prev => prev.filter(m => m.id !== id));
          setSelected(null);
        }}
      />
    </View>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.c700, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginRight: 10 },
  addBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

  statRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  statChipCount: { fontSize: 15, fontWeight: '900' },
  statChipLabel: { fontSize: 10, fontWeight: '700', maxWidth: 60 },

  tabRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100 },
  tabBtnActive: { borderColor: C.c700, backgroundColor: C.c050 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  tabTextActive: { color: C.c700 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', margin: 12, marginBottom: 8, backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, height: 20 },

  list: { padding: 12, paddingTop: 8, paddingBottom: 40 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.white, borderRadius: 16, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.white },
  cardName: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 4 },
  cardMeta: { flexDirection: 'row', marginBottom: 4 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rolePillText: { fontSize: 10, fontWeight: '800' },
  cardSub: { fontSize: 11, color: C.muted },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  inactiveB: { backgroundColor: '#fef3c7' },
  activeBadgeText: { fontSize: 9, fontWeight: '800' },
  cardDate: { fontSize: 10, color: C.subtle },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, marginBottom: 8, marginTop: 8,
    borderRadius: 14, borderWidth: 1.5,
  },
  sectionIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionRoleLabel: { fontSize: 14, fontWeight: '800' },
  sectionRoleDesc: { fontSize: 11, fontWeight: '500', opacity: 0.8 },
  sectionCount: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { fontSize: 13, fontWeight: '900', color: C.white },

  rolesInfoTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  roleInfoCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderWidth: 1, borderColor: C.steel200 },
  roleInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  roleInfoIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roleInfoLabel: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  roleInfoAccess: { fontSize: 11, color: C.muted, fontWeight: '600' },
  roleInfoAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  roleInfoAddText: { fontSize: 12, fontWeight: '800', color: C.white },
  roleInfoPriv: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  roleInfoPrivText: { flex: 1, fontSize: 12, lineHeight: 18 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 20, backgroundColor: C.c700, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: C.white, fontSize: 14, fontWeight: '800' },
});

// ── Detail modal styles ───────────────────────────────────────────────────────
const d = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  header: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  scroll: { padding: 16 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.steel200, marginBottom: 4 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: C.white },
  identityName: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  activeB: { backgroundColor: '#dcfce7' },
  inactiveB: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 10, fontWeight: '800' },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  card: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.steel200, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  rowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 2 },
  rowValue: { fontSize: 14, color: C.ink, fontWeight: '500' },
  accessIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accessTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  accessSub: { fontSize: 11, fontWeight: '600', opacity: 0.8 },
  privilegeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  privilegeText: { flex: 1, fontSize: 12, lineHeight: 18 },
  loginHint: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 12 },
  loginRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  loginDetail: { fontSize: 13, color: C.muted, flex: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 13, marginBottom: 10 },
  warnBtn: { backgroundColor: '#d97706' },
  activateBtn: { backgroundColor: C.c700 },
  deleteBtn: { backgroundColor: '#fef2f2', borderWidth: 1.5, borderColor: '#fecaca' },
  actionBtnText: { fontSize: 15, fontWeight: '800', color: C.white },
});

// ── Create modal styles ───────────────────────────────────────────────────────
const c = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  header: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 16 },
  card: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.steel200, padding: 16 },
  roleOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100, marginBottom: 8 },
  roleIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 2 },
  roleDesc: { fontSize: 11, color: C.muted, lineHeight: 15 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.steel700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { borderWidth: 1, borderColor: C.steel300, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.ink, backgroundColor: C.white },
  pwdRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  eyeBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pwdHint: { fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 4 },
  otpInfoCard: { backgroundColor: C.c050, borderRadius: 14, borderWidth: 1.5, borderColor: C.c200, padding: 14, marginBottom: 4 },
  otpInfoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  otpInfoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.c200 },
  otpInfoTitle: { fontSize: 13, fontWeight: '800', color: C.c700, marginBottom: 4 },
  otpInfoDesc: { fontSize: 12, color: C.c800, lineHeight: 17 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  createBtnText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
