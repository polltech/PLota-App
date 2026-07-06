import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar,
  Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

// ── helpers ──────────────────────────────────────────────────────────────────
const farmerStatusStyle = (f) => {
  const vs = (f.verification_status || '').toLowerCase();
  const cs = (f.coop_status || '').toLowerCase();
  if (vs === 'verified')          return { label: 'Verified',      color: '#15803d', bg: '#dcfce7' };
  if (vs === 'rejected')          return { label: 'Rejected',      color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_rejected')     return { label: 'Rejected',      color: '#dc2626', bg: '#fee2e2' };
  if (cs === 'coop_approved')     return { label: 'Coop Approved', color: '#0891b2', bg: '#e0f2fe' };
  if (cs === 'update_requested')  return { label: 'Update Req.',   color: '#d97706', bg: '#fef3c7' };
  return                                 { label: 'Pending',       color: C.c700,    bg: C.c050 };
};

const isPendingFarmer = (f) => {
  const cs = (f.coop_status || '').toLowerCase();
  const vs = (f.verification_status || '').toLowerCase();
  return !cs || cs === 'pending' || cs === 'update_requested' ||
    (!['coop_approved', 'coop_rejected'].includes(cs) && vs !== 'verified' && vs !== 'rejected');
};

const fmtDate = (d) => {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return null; }
};

const initials = (f) =>
  ((f.first_name?.[0] || '') + (f.last_name?.[0] || '')).toUpperCase() || '?';

const fullName = (f) =>
  `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Unknown';

// ── Detail row used inside modal ──────────────────────────────────────────────
const DetailRow = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <View style={m.detailRow}>
      <View style={m.detailIcon}>
        <Ionicons name={icon} size={15} color={C.c700} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={m.detailLabel}>{label}</Text>
        <Text style={m.detailValue}>{value}</Text>
      </View>
    </View>
  );
};

// ── Farmer Approval Modal ─────────────────────────────────────────────────────
function FarmerApprovalModal({ farmer, visible, onClose, onApproved, onRejected, onUpdateSent }) {
  const insets = useSafeAreaInsets();
  const [actioning,   setActioning]   = useState(null); // 'approve'|'reject'|'request'
  const [showRequest, setShowRequest] = useState(false);
  const [requestMsg,  setRequestMsg]  = useState('');

  const f = farmer || {};
  const ss = farmerStatusStyle(f);
  const name = fullName(f);
  const ini = initials(f);

  const handleApprove = () => {
    Alert.alert(
      'Approve Farmer',
      `Approve ${name} as a cooperative member?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActioning('approve');
            try {
              await coopAPI.approveFarmer(f.id);
              onApproved(f.id);
              onClose();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Approval failed.');
            } finally { setActioning(null); }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Application',
      `Reject ${name}'s cooperative membership application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setActioning('reject');
            try {
              await coopAPI.rejectFarmer(f.id, 'Rejected by cooperative officer');
              onRejected(f.id);
              onClose();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
            } finally { setActioning(null); }
          },
        },
      ]
    );
  };

  const handleRequestUpdate = async () => {
    if (!requestMsg.trim()) return;
    setActioning('request');
    try {
      await coopAPI.requestUpdate(f.id, requestMsg.trim());
      onUpdateSent(f.id, requestMsg.trim());
      setShowRequest(false);
      setRequestMsg('');
      Alert.alert(
        'Update Requested',
        `${name} has been notified to update their profile.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not send the request.');
    } finally { setActioning(null); }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={() => { setShowRequest(false); setRequestMsg(''); }}
    >
      <View style={[m.root, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={m.header}>
          <View style={{ flex: 1 }}>
            <Text style={m.headerTitle}>Farmer Review</Text>
            <Text style={m.headerSub}>Review and take action on this member</Text>
          </View>
          <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>

          {/* Identity card */}
          <View style={m.identityCard}>
            <View style={m.farmerAvatar}>
              <Text style={m.farmerAvatarText}>{ini}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={m.identityName}>{name}</Text>
              {f.coop_member_no && <Text style={m.identityCode}>Member #{f.coop_member_no}</Text>}
            </View>
            <View style={[m.statusBadge, { backgroundColor: ss.bg }]}>
              <Text style={[m.statusBadgeText, { color: ss.color }]}>{ss.label}</Text>
            </View>
          </View>

          {/* Contact details */}
          <View style={m.section}>
            <Text style={m.sectionTitle}>Contact Information</Text>
            <View style={m.sectionCard}>
              <DetailRow icon="call-outline"      label="Phone"       value={f.phone} />
              <DetailRow icon="mail-outline"      label="Email"       value={f.email} />
              <DetailRow icon="card-outline"      label="National ID" value={f.national_id} />
              <DetailRow icon="location-outline"  label="County"      value={f.county} />
              <DetailRow icon="map-outline"       label="Sub-County"  value={f.sub_county} />
              <DetailRow icon="calendar-outline"  label="Joined"      value={fmtDate(f.created_at)} />
            </View>
          </View>

          {/* Farm summary */}
          <View style={m.section}>
            <Text style={m.sectionTitle}>Farm Summary</Text>
            <View style={m.sectionCard}>
              <DetailRow icon="leaf-outline"      label="Registered Farms" value={f.farm_count != null ? `${f.farm_count} farm${f.farm_count !== 1 ? 's' : ''}` : null} />
              <DetailRow icon="expand-outline"    label="Total Area"       value={f.total_area_ha ? `${Number(f.total_area_ha).toFixed(2)} ha` : null} />
            </View>
          </View>

          {/* Update note */}
          {f.update_requested && f.update_request_notes && (
            <View style={m.section}>
              <Text style={m.sectionTitle}>Previous Update Request</Text>
              <View style={[m.sectionCard, m.noteCard]}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Ionicons name="warning" size={15} color="#d97706" />
                  <Text style={m.noteText}>{f.update_request_notes}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Request update inline panel */}
          {showRequest && (
            <View style={m.section}>
              <Text style={m.sectionTitle}>Request Profile Update</Text>
              <View style={m.sectionCard}>
                <Text style={m.requestHint}>
                  Describe what {f.first_name || 'the farmer'} needs to fix or provide. This will appear as a notification in their app.
                </Text>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <TextInput
                    style={m.requestInput}
                    value={requestMsg}
                    onChangeText={setRequestMsg}
                    placeholder="e.g. National ID is missing, phone number is incorrect, please upload ID document…"
                    placeholderTextColor={C.subtle}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </KeyboardAvoidingView>
                <View style={m.requestActions}>
                  <TouchableOpacity
                    style={m.requestCancelBtn}
                    onPress={() => { setShowRequest(false); setRequestMsg(''); }}
                    activeOpacity={0.8}
                  >
                    <Text style={m.requestCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[m.requestSendBtn, (!requestMsg.trim() || actioning === 'request') && { opacity: 0.5 }]}
                    onPress={handleRequestUpdate}
                    disabled={!requestMsg.trim() || actioning === 'request'}
                    activeOpacity={0.8}
                  >
                    {actioning === 'request'
                      ? <ActivityIndicator size="small" color={C.white} />
                      : <><Ionicons name="send" size={14} color={C.white} /><Text style={m.requestSendText}>Send Notification</Text></>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Fixed footer */}
        <View style={[m.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Request update */}
          <TouchableOpacity
            style={[m.footerRequestBtn, showRequest && { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}
            onPress={() => setShowRequest(v => !v)}
            disabled={!!actioning}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-circle-outline" size={17} color="#3b82f6" />
            <Text style={m.footerRequestText}>Request Profile Update</Text>
          </TouchableOpacity>

          <View style={m.footerPrimary}>
            {/* Reject */}
            <TouchableOpacity
              style={[m.footerRejectBtn, actioning && { opacity: 0.5 }]}
              onPress={handleReject}
              disabled={!!actioning}
              activeOpacity={0.8}
            >
              {actioning === 'reject'
                ? <ActivityIndicator size="small" color="#dc2626" />
                : <><Ionicons name="close-circle-outline" size={16} color="#dc2626" /><Text style={m.footerRejectText}>Reject</Text></>
              }
            </TouchableOpacity>

            {/* Approve */}
            <TouchableOpacity
              style={[m.footerApproveBtn, actioning && { opacity: 0.5 }]}
              onPress={handleApprove}
              disabled={!!actioning}
              activeOpacity={0.8}
            >
              {actioning === 'approve'
                ? <ActivityIndicator size="small" color={C.white} />
                : <><Ionicons name="checkmark-circle-outline" size={16} color={C.white} /><Text style={m.footerApproveText}>Approve Member</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Farmer list card ──────────────────────────────────────────────────────────
function FarmerCard({ farmer: f, onPress }) {
  const ss = farmerStatusStyle(f);
  const name = fullName(f);
  const ini = initials(f);
  const pending = isPendingFarmer(f);

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.cardBody}>
        <View style={[s.avatar, pending && { backgroundColor: C.c700 }]}>
          <Text style={s.avatarText}>{ini}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.cardNameRow}>
            <Text style={s.cardName} numberOfLines={1}>{name}</Text>
            {f.update_requested && <Ionicons name="warning" size={13} color="#d97706" />}
          </View>
          {f.coop_member_no && <Text style={s.cardSub}>#{f.coop_member_no}</Text>}
          <View style={s.cardMeta}>
            {f.phone && <Text style={s.cardMetaText}>{f.phone}</Text>}
            {f.county && <Text style={s.cardMetaText}>{f.phone ? ' · ' : ''}{f.county}</Text>}
            {f.farm_count != null && <Text style={s.cardMetaText}> · {f.farm_count} farm{f.farm_count !== 1 ? 's' : ''}</Text>}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{ss.label}</Text>
          </View>
          {f.created_at && <Text style={s.cardDate}>{fmtDate(f.created_at)}</Text>}
        </View>
      </View>
      {pending && (
        <View style={s.cardHint}>
          <Ionicons name="information-circle-outline" size={13} color="#3b82f6" />
          <Text style={s.cardHintText}>Tap to review, approve, reject, or request update</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
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
  const [modalFarmer,  setModalFarmer]  = useState(null);

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
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const q = query.toLowerCase().trim();
  const source = tab === 'approvals' ? pending : allFarmers;
  const filtered = source.filter(f => {
    if (!q) return true;
    return (
      fullName(f).toLowerCase().includes(q) ||
      (f.phone || '').includes(q) ||
      (f.county || '').toLowerCase().includes(q) ||
      (f.national_id || '').includes(q) ||
      (f.coop_member_no || '').includes(q)
    );
  });

  const totalFarmers = allFarmers.length;
  const verified     = allFarmers.filter(f => f.verification_status === 'verified').length;
  const pendingCount = pending.length;

  const onApproved = (id) => {
    const update = f => f.id === id
      ? { ...f, coop_status: 'coop_approved', verification_status: 'verified' }
      : f;
    setAllFarmers(prev => prev.map(update));
    setPending(prev => prev.filter(f => f.id !== id));
  };

  const onRejected = (id) => {
    const update = f => f.id === id
      ? { ...f, coop_status: 'coop_rejected', verification_status: 'rejected' }
      : f;
    setAllFarmers(prev => prev.map(update));
    setPending(prev => prev.filter(f => f.id !== id));
  };

  const onUpdateSent = (id, notes) => {
    const update = f => f.id === id
      ? { ...f, update_requested: true, update_request_notes: notes, coop_status: 'update_requested' }
      : f;
    setAllFarmers(prev => prev.map(update));
    setPending(prev => prev.map(update));
    // Update the currently-open modal farmer too
    if (modalFarmer?.id === id) setModalFarmer(prev => update(prev));
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <View style={s.decor1} />
        <View style={s.decor2} />
        <SafeAreaView>
          <View style={s.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.heroTitle}>Farmers</Text>
              <Text style={s.heroSub}>{totalFarmers} members · {pendingCount} pending review</Text>
            </View>
          </View>
          {!loading && (
            <View style={s.heroStats}>
              <View style={s.heroStat}><Text style={s.heroStatVal}>{totalFarmers}</Text><Text style={s.heroStatLabel}>Total</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{verified}</Text><Text style={s.heroStatLabel}>Verified</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{totalFarmers - verified}</Text><Text style={s.heroStatLabel}>Unverified</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{pendingCount}</Text><Text style={s.heroStatLabel}>Pending</Text></View>
            </View>
          )}
        </SafeAreaView>
      </View>

      <View style={s.tabWrap}>
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'all' && s.tabBtnActive]}
            onPress={() => { setTab('all'); setQuery(''); }}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={15} color={tab === 'all' ? C.c700 : C.muted} />
            <Text style={[s.tabText, tab === 'all' && s.tabTextActive]}>All Farmers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'approvals' && s.tabBtnActive]}
            onPress={() => { setTab('approvals'); setQuery(''); }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color={tab === 'approvals' ? C.c700 : C.muted} />
            <Text style={[s.tabText, tab === 'approvals' && s.tabTextActive]}>Approvals</Text>
            {pendingCount > 0 && (
              <View style={s.tabBadge}>
                <Text style={s.tabBadgeText}>{pendingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={tab === 'all' ? 'Search name, phone, county, ID…' : 'Search pending farmers…'}
          placeholderTextColor={C.subtle}
          autoCapitalize="none"
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderItem={({ item }) => (
            <FarmerCard
              farmer={item}
              onPress={() => {
                if (isPendingFarmer(item)) {
                  setModalFarmer(item);
                } else {
                  navigation.navigate('FarmerDetail', { farmerId: item.id, farmer: item });
                }
              }}
            />
          )}
          ListHeaderComponent={tab === 'approvals' && pending.length > 0 ? (
            <View style={s.approvalBanner}>
              <Ionicons name="information-circle-outline" size={15} color="#1d4ed8" />
              <Text style={s.approvalBannerText}>
                {pending.length} farmer{pending.length !== 1 ? 's' : ''} waiting for review. Tap a card to open the review panel.
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>{query ? 'No results' : tab === 'approvals' ? 'All caught up!' : 'No farmers yet'}</Text>
              <Text style={s.emptyMsg}>
                {query ? 'Try a different search.' : tab === 'approvals' ? 'No pending farmer approvals.' : 'Farmers in your cooperative appear here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Farmer approval modal */}
      <FarmerApprovalModal
        farmer={modalFarmer}
        visible={!!modalFarmer}
        onClose={() => setModalFarmer(null)}
        onApproved={onApproved}
        onRejected={onRejected}
        onUpdateSent={onUpdateSent}
      />
    </View>
  );
}

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 20, paddingBottom: 20, overflow: 'hidden' },
  decor1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)', top: -60, right: -40 },
  decor2: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.05)', bottom: -30, right: 80 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingVertical: 12, marginBottom: 4 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 26, backgroundColor: 'rgba(255,255,255,0.12)' },

  tabWrap: { backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  tabRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5,
    borderColor: C.steel200, backgroundColor: C.steel100,
  },
  tabBtnActive: { borderColor: C.c700, backgroundColor: C.c050 },
  tabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  tabTextActive: { color: C.c700 },
  tabBadge: { backgroundColor: C.c700, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: C.white },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: 14, marginBottom: 8,
    backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.steel200,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.ink, height: 20 },

  list: { padding: 14, paddingTop: 8, paddingBottom: 40 },

  approvalBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12,
  },
  approvalBannerText: { flex: 1, fontSize: 13, color: '#1e40af', fontWeight: '500', lineHeight: 18 },

  card: {
    backgroundColor: C.white, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  cardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.steel300, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 16, fontWeight: '800', color: C.white },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700', color: C.ink, flex: 1 },
  cardSub: { fontSize: 11, color: C.c700, fontWeight: '700', marginBottom: 3 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap' },
  cardMetaText: { fontSize: 11, color: C.muted },
  cardDate: { fontSize: 10, color: C.subtle },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800' },
  cardHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#bfdbfe',
  },
  cardHintText: { fontSize: 11, color: '#1e40af', fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});

// ── Modal styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  scroll: { padding: 16, paddingTop: 8 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center', marginLeft: 12, flexShrink: 0 },

  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.steel200, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  farmerAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  farmerAvatarText: { fontSize: 20, fontWeight: '800', color: C.white },
  identityName: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 3 },
  identityCode: { fontSize: 12, color: C.c700, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  sectionCard: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.steel200, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  detailIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 14, color: C.ink, fontWeight: '500' },

  noteCard: { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
  noteText: { flex: 1, fontSize: 13, color: '#92400e', lineHeight: 20 },

  requestHint: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 10 },
  requestInput: {
    borderWidth: 1, borderColor: C.steel300, borderRadius: 10,
    padding: 12, fontSize: 14, color: C.ink,
    minHeight: 100, backgroundColor: C.steel100, marginBottom: 12,
  },
  requestActions: { flexDirection: 'row', gap: 10 },
  requestCancelBtn: { flex: 1, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  requestCancelText: { fontSize: 14, fontWeight: '600', color: C.muted },
  requestSendBtn: { flex: 2, height: 40, borderRadius: 8, backgroundColor: '#3b82f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  requestSendText: { fontSize: 14, fontWeight: '700', color: C.white },

  footer: {
    backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.steel200, gap: 10,
  },
  footerRequestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: '#3b82f6', backgroundColor: C.white,
  },
  footerRequestText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  footerPrimary: { flexDirection: 'row', gap: 10 },
  footerRejectBtn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: '#dc2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef2f2',
  },
  footerRejectText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  footerApproveBtn: {
    flex: 2, height: 42, borderRadius: 10, backgroundColor: C.c700,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  footerApproveText: { fontSize: 14, fontWeight: '700', color: C.white },
});
