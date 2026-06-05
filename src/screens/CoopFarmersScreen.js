import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

// ── helpers ───────────────────────────────────────────────────────────────────
const farmerStatusStyle = (f) => {
  const vs = (f.verification_status || '').toLowerCase();
  const cs = (f.coop_status || '').toLowerCase();
  if (vs === 'verified') return { label: 'Verified', color: '#15803d', bg: '#dcfce7' };
  if (vs === 'rejected') return { label: 'Rejected', color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_rejected') return { label: 'Coop Rejected', color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_approved') return { label: 'Coop Approved', color: '#0891b2', bg: '#e0f2fe' };
  return { label: 'Pending', color: '#b45309', bg: '#fef3c7' };
};

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const TABS = [
  { key: 'all',     label: 'All Farmers' },
  { key: 'pending', label: 'Pending Review' },
];

export default function CoopFarmersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialTab = route.params?.tab || 'all';

  const [tab,          setTab]          = useState(initialTab);
  const [allFarmers,   setAllFarmers]   = useState([]);
  const [pending,      setPending]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [query,        setQuery]        = useState('');
  const [actionId,     setActionId]     = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { farmer, action: 'approve'|'reject' }
  const [requestTarget, setRequestTarget] = useState(null);
  const [issueText,    setIssueText]    = useState('');
  const [requesting,   setRequesting]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [allRes, pendRes] = await Promise.allSettled([
        coopAPI.getFarmers(),
        coopAPI.getPendingFarmers(),
      ]);
      if (allRes.status === 'fulfilled') {
        const d = allRes.value.data;
        setAllFarmers(Array.isArray(d) ? d : []);
      }
      if (pendRes.status === 'fulfilled') {
        const d = pendRes.value.data;
        setPending(Array.isArray(d) ? d : []);
      }
    } catch (e) { console.warn('CoopFarmers load:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const source = tab === 'pending' ? pending : allFarmers;
  const filtered = query.trim()
    ? source.filter(f => {
        const q = query.toLowerCase();
        return (
          `${f.first_name||''} ${f.last_name||''}`.toLowerCase().includes(q) ||
          (f.phone || '').includes(q) ||
          (f.county || '').toLowerCase().includes(q) ||
          (f.national_id || '').includes(q)
        );
      })
    : source;

  // Stat counts
  const totalFarmers    = allFarmers.length;
  const verified        = allFarmers.filter(f => f.verification_status === 'verified').length;
  const coopApproved    = allFarmers.filter(f => f.coop_status === 'coop_approved' && f.verification_status !== 'verified').length;
  const pendingCount    = pending.length;

  const doApprove = async (farmer) => {
    const name = `${farmer.first_name || ''} ${farmer.last_name || ''}`.trim();
    setConfirmModal(null);
    setActionId(farmer.id);
    try {
      await coopAPI.approveFarmer(farmer.id);
      const update = f => f.id === farmer.id ? { ...f, coop_status: 'coop_approved', verification_status: 'verified' } : f;
      setAllFarmers(p => p.map(update));
      setPending(p => p.filter(f => f.id !== farmer.id));
      Alert.alert('Approved', `${name} has been approved as a cooperative member.`);
    } catch (e) { Alert.alert('Error', e.response?.data?.detail || 'Approval failed.'); }
    finally { setActionId(null); }
  };

  const handleRequestUpdate = async () => {
    const issue = issueText.trim();
    if (!issue) { Alert.alert('Required', 'Describe what the farmer needs to update.'); return; }
    if (!requestTarget) return;
    setRequesting(true);
    try {
      await coopAPI.requestUpdate(requestTarget.id, issue);
      const updated = f => f.id === requestTarget.id
        ? { ...f, update_requested: true, update_request_notes: issue, coop_status: 'update_requested' }
        : f;
      setAllFarmers(prev => prev.map(updated));
      setPending(prev => prev.map(updated));
      setRequestTarget(null);
      setIssueText('');
      const name = `${requestTarget.first_name || ''} ${requestTarget.last_name || ''}`.trim();
      Alert.alert('Request Sent', `${name} has been notified to update their profile.`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to send request.');
    } finally {
      setRequesting(false);
    }
  };

  const doReject = async (farmer) => {
    setConfirmModal(null);
    setActionId(farmer.id);
    try {
      await coopAPI.rejectFarmer(farmer.id, 'Rejected by cooperative officer');
      const update = f => f.id === farmer.id ? { ...f, coop_status: 'coop_rejected', verification_status: 'rejected' } : f;
      setAllFarmers(p => p.map(update));
      setPending(p => p.filter(f => f.id !== farmer.id));
    } catch (e) { Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.'); }
    finally { setActionId(null); }
  };


  const renderFarmer = ({ item: f, index }) => {
    const ss = farmerStatusStyle(f);
    const name = `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown';
    const isPending = !f.coop_status || f.coop_status === 'pending' || (!['coop_approved','coop_rejected'].includes(f.coop_status) && f.verification_status !== 'verified');
    const actioning = actionId === f.id;

    return (
      <View>
        <TouchableOpacity
          style={s.tableRow}
          onPress={() => navigation.navigate('FarmerDetail', { farmerId: f.id, farmer: f })}
          activeOpacity={0.8}
        >
          {/* Name + email */}
          <View style={{ flex: 2 }}>
            <View style={s.farmerName}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{((f.first_name?.[0]||'')+(f.last_name?.[0]||'')).toUpperCase()||'?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.tdName} numberOfLines={1}>{name}</Text>
                {!!f.coop_member_no && <Text style={[s.tdSub, { color: C.c700, fontWeight: '700' }]} numberOfLines={1}>{f.coop_member_no}</Text>}
                {!!f.email && <Text style={s.tdSub} numberOfLines={1}>{f.email}</Text>}
              </View>
            </View>
          </View>
          {/* Phone */}
          <View style={{ flex: 1.2 }}>
            <Text style={s.tdText} numberOfLines={1}>{f.phone || '—'}</Text>
            {!!f.national_id && <Text style={s.tdSub}>ID: {f.national_id}</Text>}
          </View>
          {/* County */}
          <Text style={[s.tdText, { flex: 1 }]} numberOfLines={1}>{f.county || '—'}</Text>
          {/* Farms */}
          <Text style={[s.tdText, { flex: 0.6, textAlign: 'center' }]}>{f.farm_count ?? 0}</Text>
          {/* Status */}
          <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {!!f.update_requested && (
                <Ionicons name="warning" size={13} color="#d97706" />
              )}
              <View style={[s.badge, { backgroundColor: ss.bg }]}>
                <Text style={[s.badgeText, { color: ss.color }]}>{ss.label}</Text>
              </View>
            </View>
            {!!f.created_at && <Text style={s.tdDate}>{fmtDate(f.created_at)}</Text>}
          </View>
        </TouchableOpacity>

        {/* Inline actions for pending */}
        {isPending && (
          <View style={s.inlineActions}>
            <TouchableOpacity
              style={[s.approveBtn, actioning && { opacity: 0.5 }]}
              onPress={() => setConfirmModal({ farmer: f, action: 'approve' })}
              disabled={actioning}
              activeOpacity={0.8}
            >
              {actioning
                ? <ActivityIndicator color={C.white} size="small" />
                : <><Ionicons name="checkmark-circle-outline" size={14} color={C.white} /><Text style={s.approveBtnText}>Approve</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.rejectBtn, actioning && { opacity: 0.5 }]}
              onPress={() => setConfirmModal({ farmer: f, action: 'reject' })}
              disabled={actioning}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={14} color="#dc2626" />
              <Text style={s.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.detailBtn}
              onPress={() => navigation.navigate('FarmerDetail', { farmerId: f.id, farmer: f })}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={14} color={C.c700} />
              <Text style={s.detailBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Request Update row for approved / verified farmers */}
        {!isPending && (
          <View style={s.inlineActions}>
            {f.update_requested ? (
              <View style={s.updateSentRow}>
                <Ionicons name="warning" size={14} color="#d97706" />
                <Text style={s.updateSentText}>Update requested — pending farmer response</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={s.requestUpdateBtn}
                onPress={() => { setRequestTarget(f); setIssueText(''); }}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={14} color="#d97706" />
                <Text style={s.requestUpdateBtnText}>Request Update</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.detailBtn}
              onPress={() => navigation.navigate('FarmerDetail', { farmerId: f.id, farmer: f })}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={14} color={C.c700} />
              <Text style={s.detailBtnText}>View</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <Text style={s.headerTitle}>Farmers</Text>
        <Text style={s.headerSub}>
          {totalFarmers} members · {pendingCount} pending review
        </Text>
      </SafeAreaView>

      {/* 4 stat cards matching web */}
      {!loading && (
        <View style={s.statsRow}>
          {[
            { val: totalFarmers, label: 'Total Farmers',    color: C.c700,    bg: C.c050 },
            { val: verified,     label: 'Fully Verified',   color: '#15803d', bg: '#dcfce7' },
            { val: coopApproved, label: 'Coop Approved',    color: '#0891b2', bg: '#e0f2fe' },
            { val: pendingCount, label: 'Pending Review',   color: '#b45309', bg: '#fef3c7' },
          ].map(c => (
            <View key={c.label} style={[s.statCard, { backgroundColor: c.bg }]}>
              <Text style={[s.statVal, { color: c.color }]}>{c.val}</Text>
              <Text style={[s.statLabel, { color: c.color }]}>{c.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabBtnText, tab === t.key && s.tabBtnTextActive]}>
              {t.label}{t.key === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={16} color={C.subtle} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, phone, county, ID..."
          placeholderTextColor={C.subtle}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.subtle} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Table header */}
          <View style={s.tableHeaderWrap}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 2 }]}>Farmer</Text>
              <Text style={[s.th, { flex: 1.2 }]}>Phone / ID</Text>
              <Text style={[s.th, { flex: 1 }]}>County</Text>
              <Text style={[s.th, { flex: 0.6, textAlign: 'center' }]}>Farms</Text>
              <Text style={[s.th, { flex: 1.2, textAlign: 'right' }]}>Status</Text>
            </View>
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            renderItem={renderFarmer}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="people-outline" size={48} color={C.steel300} />
                <Text style={s.emptyTitle}>No farmers found</Text>
                <Text style={s.emptyMsg}>{query ? 'Try a different search.' : tab === 'pending' ? 'No pending approvals.' : 'Farmers in your cooperative appear here.'}</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ── Farmer Detail Confirm Modal (Approve / Reject) ───────────────── */}
      {!!confirmModal && (() => {
        const cf = confirmModal.farmer;
        const isApprove = confirmModal.action === 'approve';
        const cfName = `${cf.first_name || ''} ${cf.last_name || ''}`.trim() || 'Farmer';
        const cfInitials = ((cf.first_name?.[0] || '') + (cf.last_name?.[0] || '')).toUpperCase() || '?';
        const cfSS = farmerStatusStyle(cf);
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
            <TouchableOpacity style={s.confirmOverlay} activeOpacity={1} onPress={() => setConfirmModal(null)}>
              <TouchableOpacity activeOpacity={1} style={s.confirmSheet} onPress={() => {}}>
                {/* no handle — centered dialog */}

                {/* Farmer identity header */}
                <View style={s.confirmHero}>
                  <View style={s.confirmAvatar}>
                    <Text style={s.confirmAvatarText}>{cfInitials}</Text>
                  </View>
                  <Text style={s.confirmName}>{cfName}</Text>
                  <View style={[s.confirmBadge, { backgroundColor: cfSS.bg }]}>
                    <Text style={[s.confirmBadgeText, { color: cfSS.color }]}>{cfSS.label}</Text>
                  </View>
                </View>

                {/* Detail rows */}
                <View style={s.confirmDetails}>
                  {!!cf.coop_member_no && <View style={s.confirmRow}><Ionicons name="ribbon-outline"    size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Member No.</Text><Text style={s.confirmRowVal}>{cf.coop_member_no}</Text></View>}
                  {!!cf.phone      && <View style={s.confirmRow}><Ionicons name="call-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Phone</Text><Text style={s.confirmRowVal}>{cf.phone}</Text></View>}
                  {!!cf.national_id && <View style={s.confirmRow}><Ionicons name="card-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>National ID</Text><Text style={s.confirmRowVal}>{cf.national_id}</Text></View>}
                  {!!cf.email      && <View style={s.confirmRow}><Ionicons name="mail-outline"     size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Email</Text><Text style={s.confirmRowVal} numberOfLines={1}>{cf.email}</Text></View>}
                  {!!cf.county     && <View style={s.confirmRow}><Ionicons name="location-outline" size={14} color={C.c600} /><Text style={s.confirmRowLabel}>County</Text><Text style={s.confirmRowVal}>{cf.county}</Text></View>}
                  <View style={s.confirmRow}><Ionicons name="leaf-outline" size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Farms</Text><Text style={s.confirmRowVal}>{cf.farm_count ?? 0} registered</Text></View>
                  {!!cf.created_at && <View style={s.confirmRow}><Ionicons name="calendar-outline" size={14} color={C.c600} /><Text style={s.confirmRowLabel}>Joined</Text><Text style={s.confirmRowVal}>{fmtDate(cf.created_at)}</Text></View>}
                  {cf.update_requested && !!cf.update_request_notes && (
                    <View style={s.confirmNoteBox}>
                      <Ionicons name="warning" size={13} color="#d97706" />
                      <Text style={s.confirmNoteText}>Update requested: {cf.update_request_notes}</Text>
                    </View>
                  )}
                </View>

                {/* Action buttons */}
                <View style={s.confirmActions}>
                  {isApprove ? (
                    <TouchableOpacity style={s.confirmApproveBtn} onPress={() => doApprove(cf)} activeOpacity={0.85}>
                      <Ionicons name="checkmark-circle-outline" size={18} color={C.white} />
                      <Text style={s.confirmApproveBtnText}>Approve Member</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={s.confirmRejectBtn} onPress={() => doReject(cf)} activeOpacity={0.85}>
                      <Ionicons name="close-circle-outline" size={18} color={C.white} />
                      <Text style={s.confirmRejectBtnText}>Reject Application</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.confirmRequestUpdateBtn}
                    onPress={() => { setConfirmModal(null); setRequestTarget(cf); setIssueText(''); }}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={16} color="#d97706" />
                    <Text style={s.confirmRequestUpdateBtnText}>Request Update Instead</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setConfirmModal(null)} activeOpacity={0.8}>
                    <Text style={s.confirmCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        );
      })()}

      {/* ── Request Update Modal ──────────────────────────────────────────── */}
      <Modal visible={!!requestTarget} transparent animationType="fade" onRequestClose={() => setRequestTarget(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Request Profile Update</Text>
            <Text style={s.modalSub}>
              Describe what{' '}
              {requestTarget ? `${requestTarget.first_name || 'the farmer'} ${requestTarget.last_name || ''}`.trim() : 'the farmer'}{' '}
              needs to fix or update:
            </Text>
            <TextInput
              style={s.modalInput}
              value={issueText}
              onChangeText={setIssueText}
              placeholder="e.g. National ID is missing, phone number incorrect, county not set..."
              placeholderTextColor={C.subtle}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setRequestTarget(null); setIssueText(''); }}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  statsRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', lineHeight: 11, marginTop: 2 },

  tabRow: { flexDirection: 'row', backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: C.c700 },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: C.muted },
  tabBtnTextActive: { color: C.c700 },

  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, margin: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: C.steel200 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink },

  tableHeaderWrap: { backgroundColor: C.white },
  tableHeader: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: C.steel100, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.steel200 },
  th: { fontSize: 10, fontWeight: '800', color: C.steel600, textTransform: 'uppercase', letterSpacing: 0.4 },

  list: { paddingBottom: 80 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmerName: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 12, fontWeight: '900', color: C.white },
  tdName: { fontSize: 13, fontWeight: '700', color: C.ink },
  tdSub: { fontSize: 10, color: C.muted, marginTop: 1 },
  tdText: { fontSize: 12, color: C.ink, fontWeight: '600' },
  tdDate: { fontSize: 10, color: C.muted, marginTop: 3 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800' },

  inlineActions: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: C.steel100 },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#15803d', paddingVertical: 9 },
  approveBtnText: { color: C.white, fontSize: 12, fontWeight: '800' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderLeftWidth: 1, borderLeftColor: C.steel200 },
  rejectBtnText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  detailBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderLeftWidth: 1, borderLeftColor: C.steel200 },
  detailBtnText: { color: C.c700, fontSize: 12, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 16 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  requestUpdateBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#fffbeb', paddingVertical: 9, borderRightWidth: 1, borderRightColor: C.steel200 },
  requestUpdateBtnText: { color: '#d97706', fontSize: 12, fontWeight: '800' },
  updateSentRow: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#fffbeb', paddingVertical: 9, borderRightWidth: 1, borderRightColor: C.steel200 },
  updateSentText: { color: '#d97706', fontSize: 11, fontWeight: '700' },

  // Confirm (approve/reject) centered dialog
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  confirmSheet: { backgroundColor: C.white, borderRadius: 26, width: '96%', maxHeight: '88%', overflow: 'hidden', paddingBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 40, elevation: 20 },
  confirmHero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  confirmAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  confirmAvatarText: { fontSize: 22, fontWeight: '900', color: C.white },
  confirmName: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 8 },
  confirmBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  confirmBadgeText: { fontSize: 11, fontWeight: '800' },
  confirmDetails: { paddingHorizontal: 24, paddingVertical: 12 },
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
