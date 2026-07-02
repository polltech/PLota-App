import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar, TextInput, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { farmerAPI, authAPI } from '../services/api';
import { C } from '../theme';
import AppModal, { useAppModal } from '../components/AppModal';

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

// ── Farmer QR Card ────────────────────────────────────────────────────────────
const buildQRHtml = (payload) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#f0fdf4; display:flex; align-items:center; justify-content:center; height:100vh; }
  #qr canvas, #qr img { display:block; }
  #err { font-family:sans-serif; font-size:12px; color:#64748b; text-align:center; padding:16px; }
</style>
</head>
<body>
<div id="qr"><p id="err">Loading QR…</p></div>
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
<script>
(function(){
  var data=${JSON.stringify(payload)};
  if(typeof QRCode==='undefined'){document.getElementById('err').textContent='Offline — QR unavailable';return;}
  QRCode.toCanvas(data,{width:200,margin:1,color:{dark:'#052e16',light:'#f0fdf4'}},function(err,canvas){
    var el=document.getElementById('qr');
    el.innerHTML='';
    if(err){el.innerHTML='<p id="err">'+err.message+'</p>';return;}
    el.appendChild(canvas);
  });
})();
</script>
</body>
</html>`;

const FarmerIDCard = ({ user, memberNo }) => {
  const qrPayload = [
    'PLOTRA:FARMER',
    user?.id           || '',
    user?.national_id  || '',
    memberNo           || user?.coop_member_no || '',
    [user?.first_name, user?.last_name].filter(Boolean).join(' '),
  ].join(':');

  const shareID = async () => {
    try {
      await Share.share({ message: `Plotra Farmer ID\nName: ${[user?.first_name, user?.last_name].filter(Boolean).join(' ')}\nMember No: ${memberNo || user?.coop_member_no || '—'}\nNational ID: ${user?.national_id || '—'}` });
    } catch (_) {}
  };

  return (
    <View style={qr.card}>
      <View style={qr.header}>
        <Ionicons name="qr-code-outline" size={18} color={C.c700} />
        <Text style={qr.headerText}>Farmer Identity Card</Text>
        <TouchableOpacity onPress={shareID} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="share-outline" size={18} color={C.muted} />
        </TouchableOpacity>
      </View>
      <View style={qr.body}>
        <View style={qr.qrBox}>
          <WebView
            source={{ html: buildQRHtml(qrPayload) }}
            style={{ width: 200, height: 200, backgroundColor: '#f0fdf4' }}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            overScrollMode="never"
          />
        </View>
        <View style={qr.idInfo}>
          <Text style={qr.idName} numberOfLines={1}>
            {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Farmer'}
          </Text>
          {(memberNo || user?.coop_member_no) ? (
            <View style={qr.idRow}>
              <Text style={qr.idLabel}>Member No</Text>
              <Text style={qr.idValue}>{memberNo || user?.coop_member_no}</Text>
            </View>
          ) : null}
          {user?.national_id ? (
            <View style={qr.idRow}>
              <Text style={qr.idLabel}>National ID</Text>
              <Text style={qr.idValue}>{user.national_id}</Text>
            </View>
          ) : null}
          {user?.cooperative_name ? (
            <View style={qr.idRow}>
              <Text style={qr.idLabel}>Cooperative</Text>
              <Text style={qr.idValue} numberOfLines={1}>{user.cooperative_name}</Text>
            </View>
          ) : null}
          <Text style={qr.idHint}>Show this QR at the delivery point to verify your identity.</Text>
        </View>
      </View>
    </View>
  );
};

const qr = StyleSheet.create({
  card: { backgroundColor: C.white, borderRadius: 18, marginHorizontal: 16, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  headerText: { flex: 1, fontSize: 13, fontWeight: '800', color: C.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  body: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 16 },
  qrBox: { width: 200, height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: C.c200 },
  idInfo: { flex: 1, justifyContent: 'center' },
  idName: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 10 },
  idRow: { marginBottom: 6 },
  idLabel: { fontSize: 10, fontWeight: '700', color: C.subtle, textTransform: 'uppercase', letterSpacing: 0.3 },
  idValue: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 1 },
  idHint: { fontSize: 10, color: C.muted, lineHeight: 15, marginTop: 10 },
});

// ── Main screen ────────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();
  const modal = useAppModal();

  const hasUpdateRequest = !!user?.update_requested;

  const [editing,    setEditing]    = useState(hasUpdateRequest);
  const [saving,     setSaving]     = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [memberNo,   setMemberNo]   = useState(user?.coop_member_no || null);

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await authAPI.me();
        if (res.data) {
          await updateUser(res.data);
          if (res.data.coop_member_no) setMemberNo(res.data.coop_member_no);
        }
      } catch (_) {}
      try {
        const mRes = await farmerAPI.getMembership();
        if (mRes.data?.membership_number) setMemberNo(mRes.data.membership_number);
      } catch (_) {}
    };
    refresh();
  }, []);

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
    const wasUpdateRequested = !!user?.update_requested;
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
      Alert.alert(
        'Profile Updated',
        wasUpdateRequested
          ? 'Your profile has been updated. Your cooperative officer will review the changes.'
          : 'Your profile has been updated.'
      );
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to save profile.';
      Alert.alert('Error', typeof msg === 'string' ? msg : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    modal.show({
      type:         'danger',
      icon:         'log-out',
      title:        'Sign Out',
      message:      'Are you sure you want to sign out of your account?',
      confirmLabel: 'Sign Out',
      cancelLabel:  'Cancel',
      onConfirm:    async () => { setLoggingOut(true); await logout(); },
    });
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

        {/* ── UPDATE REQUEST BANNER ──────────────────────────────────────── */}
        {hasUpdateRequest && (
          <View style={s.urBanner}>
            <View style={s.urBannerTop}>
              <Ionicons name="warning" size={20} color="#d97706" />
              <Text style={s.urTitle}>Profile Update Required</Text>
            </View>
            <Text style={s.urSubtitle}>
              {user?.update_requested_by_name
                ? `${user.update_requested_by_name} from your cooperative has requested that you update your profile.`
                : 'Your cooperative has requested that you update your profile.'}
            </Text>
            {!!user?.update_request_notes && (
              <View style={s.urNotesBox}>
                <Text style={s.urNotesLabel}>Issue to fix:</Text>
                <Text style={s.urNotesText}>{user.update_request_notes}</Text>
              </View>
            )}
            {!editing && (
              <TouchableOpacity style={s.urButton} onPress={startEdit} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={16} color={C.white} />
                <Text style={s.urButtonText}>Update My Profile Now</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
            {/* Farmer QR Identity Card */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Identity</Text>
            </View>
            <FarmerIDCard user={user} memberNo={memberNo} />

            {/* Account info */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Account</Text>
              <View style={s.card}>
                {!!memberNo && (
                  <InfoItem label="Member No." value={memberNo} />
                )}
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
                  onPress={() => navigation.navigate('Documents')}
                />
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

        <View style={{ height: 40 }} />
      </ScrollView>

      <AppModal {...modal.props} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },

  header: { backgroundColor: C.white, paddingLeft: 56, paddingRight: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: C.steel200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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

  // Update request banner
  urBanner: { margin: 20, marginBottom: 0, backgroundColor: '#fffbeb', borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: '#fcd34d' },
  urBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  urTitle: { fontSize: 15, fontWeight: '800', color: '#92400e' },
  urSubtitle: { fontSize: 13, color: '#78350f', lineHeight: 19, marginBottom: 10 },
  urNotesBox: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 12 },
  urNotesLabel: { fontSize: 10, fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  urNotesText: { fontSize: 14, color: '#78350f', fontWeight: '600', lineHeight: 20 },
  urButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#d97706', borderRadius: 12, paddingVertical: 12, shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  urButtonText: { color: C.white, fontSize: 14, fontWeight: '800' },
});
