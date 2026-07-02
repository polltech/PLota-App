import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, TextInput,
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

  // Confirm modal (approve / reject)
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' | 'reject'

  // Request update modal
  const [updateModal, setUpdateModal] = useState(false);
  const [issueText,   setIssueText]   = useState('');
  const [requesting,  setRequesting]  = useState(false);

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

  const doVerify = async () => {
    setConfirmAction(null);
    setVerifying(true);
    try {
      await coopAPI.approveFarmer(farmerId);
      setFarmer(prev => ({ ...prev, verification_status: 'verified', coop_status: 'coop_approved', update_requested: false }));
      Alert.alert('Approved', `${fullName} has been verified and approved.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const doReject = async () => {
    setConfirmAction(null);
    try {
      await coopAPI.rejectFarmer(farmerId, 'Application rejected by cooperative officer');
      setFarmer(prev => ({ ...prev, coop_status: 'coop_rejected', update_requested: false }));
      Alert.alert('Rejected', `${fullName}'s application has been rejected.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
    }
  };

  const handleRequestUpdate = async () => {
    const issue = issueText.trim();
    if (!issue) { Alert.alert('Required', 'Describe what the farmer needs to update.'); return; }
    setRequesting(true);
    try {
      await coopAPI.requestUpdate(farmerId, issue);
      setFarmer(prev => ({
        ...prev,
        update_requested: true,
        update_requested_by_name: 'You',
        update_request_notes: issue,
        coop_status: 'update_requested',
      }));
      setUpdateModal(false);
      setIssueText('');
      Alert.alert('Request Sent', `${fullName} has been notified to update their profile.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send request.');
    } finally {
      setRequesting(false);
    }
  };

  const isPending = ['pending', 'update_requested'].includes((farmer?.verification_status || '').toLowerCase());
  const isCoopRejected = farmer?.coop_status === 'coop_rejected';

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
        {/* Verify / Reject actions */}
        {isPending && (
          <View style={s.actionRow}>
            <TouchableOpacity
              style={[s.verifyBanner, { flex: 2 }, verifying && s.btnDisabled]}
              onPress={() => setConfirmAction('approve')}
              disabled={verifying}
              activeOpacity={0.85}
            >
              {verifying ? <ActivityIndicator color={C.white} size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />}
              <Text style={s.verifyBannerText}>{verifying ? 'Verifying…' : 'Approve'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectBtn, { flex: 1 }]}
              onPress={() => setConfirmAction('reject')}
              activeOpacity={0.85}
            >
              <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
              <Text style={s.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
        {isCoopRejected && (
          <View style={[s.verifyBanner, { backgroundColor: '#fee2e2', marginBottom: 14 }]}>
            <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
            <Text style={[s.verifyBannerText, { color: '#dc2626' }]}>Application rejected</Text>
          </View>
        )}

        {/* Request Update button (always available) */}
        {!farmer?.update_requested && (
          <TouchableOpacity
            style={s.requestUpdateBtn}
            onPress={() => { setIssueText(''); setUpdateModal(true); }}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color="#d97706" />
            <Text style={s.requestUpdateBtnText}>Request Profile Update</Text>
          </TouchableOpacity>
        )}
        {farmer?.update_requested && (
          <View style={s.updatePendingBanner}>
            <Ionicons name="warning" size={16} color="#d97706" />
            <Text style={s.updatePendingText}>Update requested — awaiting farmer's response</Text>
          </View>
        )}

        {/* Personal info */}
        <View style={s.section}>
          <Text style={s.subHeader}>Personal Information</Text>
          {!!farmer?.coop_member_no && (
            <InfoRow icon="ribbon-outline" label="Member No." value={farmer.coop_member_no} />
          )}
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
                {farmer.update_request_notes ? ` "${farmer.update_request_notes}"` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Farms */}
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.subHeader, { marginBottom: 0 }]}>Farms ({farms.length})</Text>
            <TouchableOpacity
              style={s.addFarmBtn}
              onPress={() => navigation.navigate('AddFarm', {
                targetFarmerId:   farmerId,
                targetFarmerName: `${farmer?.first_name || ''} ${farmer?.last_name || ''}`.trim(),
                targetMemberNo:   farmer?.coop_member_no || farmer?.membership_number,
                targetFarmer:     farmer,
              })}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color={C.white} />
              <Text style={s.addFarmBtnText}>Add Farm</Text>
            </TouchableOpacity>
          </View>
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

      {/* ── Approve / Reject Confirm Modal ────────────────────────────── */}
      <Modal visible={!!confirmAction} transparent animationType="fade" onRequestClose={() => setConfirmAction(null)}>
        <TouchableOpacity style={s.confirmOverlay} activeOpacity={1} onPress={() => setConfirmAction(null)}>
          <TouchableOpacity activeOpacity={1} style={s.confirmSheet} onPress={() => {}}>
            {/* centered dialog */}

            {/* Farmer summary */}
            <View style={s.confirmHero}>
              <View style={s.confirmAvatar}>
                <Text style={s.confirmAvatarText}>{initials}</Text>
              </View>
              <Text style={s.confirmName}>{fullName}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColor + '25', marginTop: 6 }]}>
                <View style={[s.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[s.statusText, { color: statusColor }]}>
                  {(farmer?.verification_status || 'UNVERIFIED').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Key details */}
            <View style={s.confirmDetails}>
              {!!farmer?.coop_member_no && <View style={s.confirmRow}><Ionicons name="ribbon-outline"    size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Member No.</Text><Text style={s.confirmRowVal}>{farmer.coop_member_no}</Text></View>}
              {!!farmer?.phone      && <View style={s.confirmRow}><Ionicons name="call-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Phone</Text><Text style={s.confirmRowVal}>{farmer.phone}</Text></View>}
              {!!farmer?.national_id && <View style={s.confirmRow}><Ionicons name="card-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>National ID</Text><Text style={s.confirmRowVal}>{farmer.national_id}</Text></View>}
              {!!farmer?.email      && <View style={s.confirmRow}><Ionicons name="mail-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Email</Text><Text style={s.confirmRowVal} numberOfLines={1}>{farmer.email}</Text></View>}
              {!!farmer?.county     && <View style={s.confirmRow}><Ionicons name="location-outline" size={14} color={C.c600} /><Text style={s.confirmRowLabel}>County</Text><Text style={s.confirmRowVal}>{farmer.county}</Text></View>}
              {!!farmer?.gender     && <View style={s.confirmRow}><Ionicons name="person-outline"   size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Gender</Text><Text style={s.confirmRowVal}>{farmer.gender}</Text></View>}
              <View style={s.confirmRow}><Ionicons name="leaf-outline" size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Farms</Text><Text style={s.confirmRowVal}>{farms.length} registered</Text></View>
              {farmer?.update_requested && !!farmer?.update_request_notes && (
                <View style={s.confirmNoteBox}>
                  <Ionicons name="warning" size={13} color="#d97706" />
                  <Text style={s.confirmNoteText}>Update requested: {farmer.update_request_notes}</Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={s.confirmActions}>
              {confirmAction === 'approve' ? (
                <TouchableOpacity style={s.confirmApproveBtn} onPress={doVerify} disabled={verifying} activeOpacity={0.85}>
                  {verifying ? <ActivityIndicator color={C.white} size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />}
                  <Text style={s.confirmApproveBtnText}>Approve Member</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={s.confirmRejectBtn} onPress={doReject} activeOpacity={0.85}>
                  <Ionicons name="close-circle-outline" size={18} color={C.white} />
                  <Text style={s.confirmRejectBtnText}>Reject Application</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.confirmRequestUpdateBtn}
                onPress={() => { setConfirmAction(null); setIssueText(''); setUpdateModal(true); }}
                activeOpacity={0.85}
              >
                <Ionicons name="create-outline" size={16} color="#d97706" />
                <Text style={s.confirmRequestUpdateBtnText}>Request Update Instead</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmAction(null)} activeOpacity={0.8}>
                <Text style={s.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Request Update Modal ───────────────────────────────────────── */}
      <Modal visible={updateModal} transparent animationType="fade" onRequestClose={() => setUpdateModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Request Profile Update</Text>
            <Text style={s.modalSub}>
              Describe what {farmer?.first_name || 'the farmer'} needs to fix or update in their profile:
            </Text>
            <TextInput
              style={s.modalInput}
              value={issueText}
              onChangeText={setIssueText}
              placeholder="e.g. National ID is missing, phone number is incorrect, county needs to be updated..."
              placeholderTextColor={C.subtle}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setUpdateModal(false); setIssueText(''); }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalSubmit, requesting && { opacity: 0.5 }]}
                onPress={handleRequestUpdate}
                disabled={requesting}
                activeOpacity={0.85}
              >
                {requesting
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.modalSubmitText}>Send Request</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 28 },
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

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  verifyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.eudrLow, borderRadius: 16, paddingVertical: 14, shadowColor: C.eudrLow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  verifyBannerText: { color: C.white, fontSize: 14, fontWeight: '800' },
  rejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, paddingVertical: 14, borderWidth: 2, borderColor: '#dc2626', backgroundColor: '#fff5f5' },
  rejectBtnText: { color: '#dc2626', fontSize: 14, fontWeight: '800' },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  subHeader: { fontSize: 11, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { flex: 1, fontSize: 13, color: C.muted, fontWeight: '600' },
  infoValue: { fontSize: 14, color: C.ink, fontWeight: '700', textAlign: 'right', maxWidth: '55%' },

  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.eudrMedBg, borderRadius: 10, padding: 12, marginTop: 8 },
  noteText: { flex: 1, fontSize: 12, color: C.eudrMedium, lineHeight: 18, fontWeight: '500' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addFarmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.c700, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  addFarmBtnText: { fontSize: 12, fontWeight: '700', color: C.white },

  farmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmName: { fontSize: 14, fontWeight: '700', color: C.ink },
  farmMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  noFarms: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 20 },

  // Confirm centered dialog
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  confirmSheet: { backgroundColor: C.white, borderRadius: 26, width: '96%', maxHeight: '88%', overflow: 'hidden', paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 20 },
  confirmHero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  confirmAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.c600, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmAvatarText: { fontSize: 20, fontWeight: '900', color: C.white },
  confirmName: { fontSize: 18, fontWeight: '800', color: C.ink },
  confirmDetails: { paddingHorizontal: 24, paddingVertical: 10 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  confirmRowLabel: { flex: 1, fontSize: 12, color: C.muted, fontWeight: '600' },
  confirmRowVal: { fontSize: 13, color: C.ink, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  confirmNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginTop: 8 },
  confirmNoteText: { flex: 1, fontSize: 12, color: '#92400e', fontWeight: '500', lineHeight: 17 },
  confirmActions: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  confirmApproveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#15803d', borderRadius: 16, paddingVertical: 14, shadowColor: '#15803d', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  confirmApproveBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  confirmRejectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#dc2626', borderRadius: 16, paddingVertical: 14, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  confirmRejectBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  confirmRequestUpdateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 16, paddingVertical: 14, borderWidth: 1.5, borderColor: '#fcd34d' },
  confirmRequestUpdateBtnText: { color: '#d97706', fontSize: 14, fontWeight: '800' },
  confirmCancelBtn: { alignItems: 'center', paddingVertical: 12 },
  confirmCancelBtnText: { fontSize: 14, color: C.muted, fontWeight: '700' },

  requestUpdateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 14, paddingVertical: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#fcd34d' },
  requestUpdateBtnText: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  updatePendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 14, borderWidth: 1.5, borderColor: '#fcd34d' },
  updatePendingText: { fontSize: 13, color: '#d97706', fontWeight: '700', flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: C.white, borderRadius: 22, padding: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.c900, marginBottom: 6 },
  modalSub: { fontSize: 13, color: C.muted, lineHeight: 19, marginBottom: 16 },
  modalInput: { backgroundColor: C.steel100, borderRadius: 14, padding: 14, fontSize: 14, color: C.ink, borderWidth: 1.5, borderColor: C.steel200, minHeight: 100, marginBottom: 16, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.steel300 },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: C.steel700 },
  modalSubmit: { flex: 2, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d97706', shadowColor: '#d97706', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  modalSubmitText: { fontSize: 14, fontWeight: '800', color: C.white },
});
