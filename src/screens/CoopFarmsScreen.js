import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar, Alert,
  Dimensions, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = (SCREEN_W - 32 - 10) / 2;

// ── helpers ──────────────────────────────────────────────────────────────────
const verifyStyle = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'coop_approved' || s === 'admin_approved') return { color: '#15803d', bg: '#dcfce7', label: 'Approved' };
  if (s === 'coop_rejected' || s === 'rejected')       return { color: '#dc2626', bg: '#fee2e2', label: 'Rejected' };
  if (s === 'pending' || s === 'draft')                return { color: C.c700,    bg: C.c050,    label: 'Pending' };
  return                                                      { color: C.steel600, bg: C.steel100, label: status || 'Draft' };
};

const complianceStyle = (cs) => {
  if (!cs) return null;
  const u = (cs || '').toUpperCase();
  if (u.includes('LOW') || (u.includes('COMPLIANT') && !u.includes('NON'))) return { color: '#15803d', bg: '#dcfce7', label: 'Compliant' };
  if (u.includes('HIGH') || u.includes('RISK') || u.includes('NON'))        return { color: '#dc2626', bg: '#fee2e2', label: 'Non-Compliant' };
  return { color: C.muted, bg: C.steel100, label: 'Under Review' };
};

const fmt = (n) => (n != null && n !== 0) ? `${Number(n).toFixed(2)} ha` : null;

const isPending = (f) => {
  const s = (f.verification_status || '').toLowerCase();
  const c = (f.coop_status || '').toLowerCase();
  return s === 'pending' || s === 'draft' ||
    (!c.includes('approved') && !c.includes('rejected') &&
     s !== 'coop_approved' && s !== 'admin_approved' && s !== 'coop_rejected' && s !== 'rejected');
};

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

// ── Farm Approval Modal ──────────────────────────────────────────────────────
function FarmApprovalModal({ farm, visible, onClose, onApproved, onRejected }) {
  const insets = useSafeAreaInsets();
  const [detail,       setDetail]      = useState(null);
  const [loadingDet,   setLoadingDet]  = useState(false);
  const [actioning,    setActioning]   = useState(null); // 'approve'|'reject'|'request'
  const [showRequest,  setShowRequest] = useState(false);
  const [requestMsg,   setRequestMsg]  = useState('');

  // Load full farm detail when modal opens
  const loadDetail = useCallback(async () => {
    if (!farm) return;
    setLoadingDet(true);
    try {
      const res = await coopAPI.getFarm(farm.id);
      setDetail(res.data);
    } catch {
      setDetail(farm); // fall back to what we already have
    } finally {
      setLoadingDet(false);
    }
  }, [farm]);

  const d = detail || farm || {};
  const vs = verifyStyle(d.verification_status || d.coop_status);
  const cs = complianceStyle(d.eudr_risk_level || d.compliance_status);
  const area = fmt(d.total_area_ha || d.total_area_hectares);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = () => {
    Alert.alert(
      'Approve Farm',
      `Confirm approval of "${d.farm_name || 'this farm'}" for ${d.farmer_name || 'the farmer'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActioning('approve');
            try {
              await coopAPI.approveFarm(d.id, '');
              onApproved(d.id);
              onClose();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Approval failed.');
            } finally { setActioning(null); }
          },
        },
      ]
    );
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = () => {
    Alert.alert(
      'Reject Farm',
      `Reject "${d.farm_name || 'this farm'}"? Enter a reason (optional).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            setActioning('reject');
            try {
              await coopAPI.rejectFarm(d.id, 'Rejected by cooperative officer');
              onRejected(d.id);
              onClose();
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Rejection failed.');
            } finally { setActioning(null); }
          },
        },
      ]
    );
  };

  // ── Request Update ────────────────────────────────────────────────────────
  const handleRequestUpdate = async () => {
    if (!requestMsg.trim()) return;
    setActioning('request');
    try {
      await coopAPI.requestFarmUpdate(d.id, requestMsg.trim());
      setShowRequest(false);
      setRequestMsg('');
      Alert.alert(
        'Update Requested',
        `A notification has been sent to ${d.farmer_name || 'the farmer'} requesting them to update the farm details.`,
        [{ text: 'OK' }]
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not send the request. Please try again.');
    } finally { setActioning(null); }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={loadDetail}
    >
      <View style={[m.root, { paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={m.header}>
          <View style={{ flex: 1 }}>
            <Text style={m.headerTitle}>Farm Review</Text>
            <Text style={m.headerSub}>Review and take action on this farm</Text>
          </View>
          <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>

        {loadingDet ? (
          <View style={m.center}><ActivityIndicator color={C.c700} size="large" /></View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false}>

            {/* Farm identity card */}
            <View style={m.identityCard}>
              <View style={m.identityIconBox}>
                <Ionicons name="leaf" size={28} color={C.c700} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.identityName}>{d.farm_name || 'Unnamed Farm'}</Text>
                {d.farm_code && <Text style={m.identityCode}>ID: {d.farm_code}</Text>}
              </View>
              <View style={[m.statusBadge, { backgroundColor: vs.bg }]}>
                <Text style={[m.statusBadgeText, { color: vs.color }]}>{vs.label}</Text>
              </View>
            </View>

            {/* Farmer info */}
            <View style={m.section}>
              <Text style={m.sectionTitle}>Farmer Information</Text>
              <View style={m.sectionCard}>
                <View style={m.farmerRow}>
                  <View style={m.farmerAvatar}>
                    <Text style={m.farmerAvatarText}>
                      {(d.farmer_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={m.farmerName}>{d.farmer_name || '—'}</Text>
                    {d.farmer_phone && <Text style={m.farmerSub}>{d.farmer_phone}</Text>}
                    {d.farmer_email && <Text style={m.farmerSub}>{d.farmer_email}</Text>}
                  </View>
                </View>
              </View>
            </View>

            {/* Farm details */}
            <View style={m.section}>
              <Text style={m.sectionTitle}>Farm Details</Text>
              <View style={m.sectionCard}>
                <DetailRow icon="expand-outline"         label="Total Area"      value={area} />
                <DetailRow icon="location-outline"       label="County"          value={d.county} />
                <DetailRow icon="map-outline"            label="Sub-County"      value={d.sub_county} />
                <DetailRow icon="business-outline"       label="Ward"            value={d.ward} />
                <DetailRow icon="grid-outline"           label="Parcels"         value={d.parcels_count ? `${d.parcels_count} parcel${d.parcels_count !== 1 ? 's' : ''}` : null} />
                <DetailRow icon="cafe-outline"           label="Coffee Type"     value={d.coffee_type || d.crop_type} />
                <DetailRow icon="calendar-outline"       label="Submitted"       value={d.created_at ? new Date(d.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : null} />
                {d.latitude && d.longitude && (
                  <DetailRow icon="navigate-outline" label="GPS" value={`${Number(d.latitude).toFixed(5)}, ${Number(d.longitude).toFixed(5)}`} />
                )}
              </View>
            </View>

            {/* Compliance */}
            {cs && (
              <View style={m.section}>
                <Text style={m.sectionTitle}>Compliance</Text>
                <View style={[m.sectionCard, m.complianceCard, { borderLeftColor: cs.color }]}>
                  <View style={[m.compBadge, { backgroundColor: cs.bg }]}>
                    <Text style={[m.compBadgeText, { color: cs.color }]}>{cs.label}</Text>
                  </View>
                  {d.eudr_risk_level && (
                    <Text style={m.compDetail}>EUDR Risk: {d.eudr_risk_level}</Text>
                  )}
                </View>
              </View>
            )}

            {/* Notes / rejection reason */}
            {d.rejection_reason && (
              <View style={m.section}>
                <Text style={m.sectionTitle}>Previous Rejection Reason</Text>
                <View style={[m.sectionCard, m.noteCard]}>
                  <Text style={m.noteText}>{d.rejection_reason}</Text>
                </View>
              </View>
            )}

            {/* Request update input panel */}
            {showRequest && (
              <View style={m.section}>
                <Text style={m.sectionTitle}>Request Update from Farmer</Text>
                <View style={m.sectionCard}>
                  <Text style={m.requestHint}>
                    Describe what the farmer needs to fix or provide. This will appear as a notification in their app.
                  </Text>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <TextInput
                      style={m.requestInput}
                      value={requestMsg}
                      onChangeText={setRequestMsg}
                      placeholder="e.g. Please re-capture the parcel boundary accurately, the current GPS trace has gaps…"
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
        )}

        {/* Fixed action footer */}
        {!loadingDet && (
          <View style={[m.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {/* Request Update */}
            <TouchableOpacity
              style={[m.footerRequestBtn, showRequest && { backgroundColor: '#eff6ff', borderColor: '#3b82f6' }]}
              onPress={() => setShowRequest(v => !v)}
              activeOpacity={0.8}
              disabled={!!actioning}
            >
              <Ionicons name="refresh-circle-outline" size={17} color="#3b82f6" />
              <Text style={m.footerRequestText}>Request Update</Text>
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
                  : <><Ionicons name="checkmark-circle-outline" size={16} color={C.white} /><Text style={m.footerApproveText}>Approve Farm</Text></>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Farm card (2-column grid for listing tab) ────────────────────────────────
function FarmCard({ farm, onPress }) {
  const vs = verifyStyle(farm.verification_status || farm.coop_status);
  const cs = complianceStyle(farm.eudr_risk_level || farm.compliance_status);
  const area = fmt(farm.total_area_ha || farm.total_area_hectares);
  const hasPolygon = (farm.parcels_count || 0) > 0;

  return (
    <TouchableOpacity
      style={[s.card, { width: CARD_W, borderTopColor: vs.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={s.cardTop}>
        <View style={[s.badge, { backgroundColor: vs.bg }]}>
          <Text style={[s.badgeText, { color: vs.color }]}>{vs.label}</Text>
        </View>
        {hasPolygon && <Ionicons name="location" size={13} color={C.c400} />}
      </View>

      <Text style={s.farmName} numberOfLines={2}>{farm.farm_name || 'Unnamed Farm'}</Text>
      {farm.farmer_name ? <Text style={s.farmerName} numberOfLines={1}>{farm.farmer_name}</Text> : null}

      <View style={s.cardMeta}>
        {area && (
          <View style={s.metaRow}>
            <Ionicons name="expand-outline" size={11} color={C.muted} />
            <Text style={s.metaText}>{area}</Text>
          </View>
        )}
        {farm.county ? (
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={11} color={C.muted} />
            <Text style={s.metaText} numberOfLines={1}>{farm.county}</Text>
          </View>
        ) : null}
      </View>

      {cs && (
        <View style={[s.compChip, { backgroundColor: cs.bg }]}>
          <Text style={[s.compText, { color: cs.color }]}>{cs.label}</Text>
        </View>
      )}

      <View style={s.cardFooter}>
        <Ionicons name="eye-outline" size={14} color={C.c700} />
        <Text style={s.cardFooterText}>View details</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Approval list card (tappable → opens modal) ──────────────────────────────
function ApprovalCard({ farm, onPress }) {
  const area = fmt(farm.total_area_ha || farm.total_area_hectares);
  return (
    <TouchableOpacity style={s.approvalCard} onPress={onPress} activeOpacity={0.85}>
      <View style={s.approvalCardBody}>
        <View style={s.approvalIconBox}>
          <Ionicons name="leaf" size={22} color={C.c700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.approvalFarmName} numberOfLines={1}>{farm.farm_name || 'Unnamed Farm'}</Text>
          <Text style={s.approvalFarmer} numberOfLines={1}>{farm.farmer_name || '—'}</Text>
          <View style={s.approvalMeta}>
            {area && <Text style={s.approvalMetaText}>{area}</Text>}
            {farm.county && <Text style={s.approvalMetaText}>{area ? ' · ' : ''}{farm.county}</Text>}
            {farm.farm_code && <Text style={s.approvalMetaText}>{(area || farm.county) ? ' · ' : ''}{farm.farm_code}</Text>}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.muted} />
      </View>
      <View style={s.approvalHint}>
        <Ionicons name="information-circle-outline" size={13} color="#3b82f6" />
        <Text style={s.approvalHintText}>Tap to review, approve, reject, or request update</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CoopFarmsScreen() {
  const navigation = useNavigation();
  const [tab,        setTab]        = useState('listing');
  const [farms,      setFarms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query,      setQuery]      = useState('');
  const [modalFarm,  setModalFarm]  = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await coopAPI.getFarms();
      const d = res.data;
      setFarms(Array.isArray(d) ? d : (d?.farms || []));
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const q = query.toLowerCase().trim();

  const allFarms = farms.filter(f => {
    if (!q) return true;
    return (
      (f.farm_name || '').toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q) ||
      (f.farm_code || '').toLowerCase().includes(q)
    );
  });

  const pendingFarms = farms.filter(isPending).filter(f => {
    if (!q) return true;
    return (
      (f.farm_name || '').toLowerCase().includes(q) ||
      (f.farmer_name || '').toLowerCase().includes(q) ||
      (f.county || '').toLowerCase().includes(q)
    );
  });

  const pendingCount  = farms.filter(isPending).length;
  const approvedCount = farms.filter(f => {
    const s = (f.verification_status || '').toLowerCase();
    return s === 'coop_approved' || s === 'admin_approved';
  }).length;

  const onApproved = (id) => {
    setFarms(prev => prev.map(f =>
      f.id === id ? { ...f, verification_status: 'coop_approved', coop_status: 'coop_approved' } : f
    ));
  };

  const onRejected = (id) => {
    setFarms(prev => prev.map(f =>
      f.id === id ? { ...f, verification_status: 'coop_rejected', coop_status: 'coop_rejected' } : f
    ));
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
              <Text style={s.heroTitle}>Farms</Text>
              <Text style={s.heroSub}>{farms.length} total · {pendingCount} pending · {approvedCount} approved</Text>
            </View>
          </View>
          {!loading && (
            <View style={s.heroStats}>
              <View style={s.heroStat}><Text style={s.heroStatVal}>{farms.length}</Text><Text style={s.heroStatLabel}>Total</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{approvedCount}</Text><Text style={s.heroStatLabel}>Approved</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{pendingCount}</Text><Text style={s.heroStatLabel}>Pending</Text></View>
              <View style={s.heroStatDivider} />
              <View style={s.heroStat}><Text style={s.heroStatVal}>{farms.length - approvedCount - pendingCount}</Text><Text style={s.heroStatLabel}>Other</Text></View>
            </View>
          )}
        </SafeAreaView>
      </View>

      <View style={s.tabWrap}>
        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'listing' && s.tabBtnActive]}
            onPress={() => { setTab('listing'); setQuery(''); }}
            activeOpacity={0.8}
          >
            <Ionicons name="grid-outline" size={15} color={tab === 'listing' ? C.c700 : C.muted} />
            <Text style={[s.tabText, tab === 'listing' && s.tabTextActive]}>Farm Listing</Text>
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
          placeholder={tab === 'listing' ? 'Search farms…' : 'Search pending farms…'}
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
      ) : tab === 'listing' ? (
        // ── FARM LISTING TAB ──────────────────────────────────────────────────
        <FlatList
          key="farm-grid"
          data={allFarms}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          columnWrapperStyle={s.columnWrapper}
          contentContainerStyle={s.gridList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderItem={({ item }) => (
            <FarmCard
              farm={item}
              onPress={() => navigation.navigate('FarmDetail', { farmId: item.id, farm: item })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="leaf-outline" size={52} color={C.steel300} />
              <Text style={s.emptyTitle}>{query ? 'No results' : 'No farms yet'}</Text>
              <Text style={s.emptyMsg}>{query ? 'Try a different search.' : 'Farms from farmers in your cooperative will appear here.'}</Text>
            </View>
          }
        />
      ) : (
        // ── APPROVALS TAB ─────────────────────────────────────────────────────
        <FlatList
          key="approval-list"
          data={pendingFarms}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.approvalList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          renderItem={({ item }) => (
            <ApprovalCard farm={item} onPress={() => setModalFarm(item)} />
          )}
          ListHeaderComponent={pendingFarms.length > 0 ? (
            <View style={s.approvalBanner}>
              <Ionicons name="information-circle-outline" size={15} color="#1d4ed8" />
              <Text style={s.approvalBannerText}>
                {pendingFarms.length} farm{pendingFarms.length !== 1 ? 's' : ''} waiting for your review. Tap a card to open the review panel.
              </Text>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="checkmark-circle-outline" size={52} color={C.c400} />
              <Text style={s.emptyTitle}>All caught up!</Text>
              <Text style={s.emptyMsg}>No farms are waiting for approval right now.</Text>
            </View>
          }
        />
      )}

      {/* Approval modal */}
      <FarmApprovalModal
        farm={modalFarm}
        visible={!!modalFarm}
        onClose={() => setModalFarm(null)}
        onApproved={onApproved}
        onRejected={onRejected}
      />

      {/* Add Farm FAB — all coop staff can capture farms on behalf of farmers */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('SelectFarmerForCapture')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={C.white} />
      </TouchableOpacity>
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

  // Grid listing
  gridList: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  columnWrapper: { gap: 10, marginBottom: 10 },

  card: {
    backgroundColor: C.white, borderRadius: 16, padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  farmName: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 3, lineHeight: 19 },
  farmerName: { fontSize: 11, color: C.muted, fontWeight: '500', marginBottom: 6 },
  cardMeta: { gap: 3, marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: C.muted },
  compChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 10 },
  compText: { fontSize: 9, fontWeight: '700' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: C.steel100, paddingTop: 8 },
  cardFooterText: { fontSize: 12, fontWeight: '600', color: C.c700 },

  // Approval list
  approvalList: { padding: 14, paddingTop: 6, paddingBottom: 40 },
  approvalBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12,
  },
  approvalBannerText: { flex: 1, fontSize: 13, color: '#1e40af', fontWeight: '500', lineHeight: 18 },

  approvalCard: {
    backgroundColor: C.white, borderRadius: 16, marginBottom: 10,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    overflow: 'hidden',
  },
  approvalCardBody: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  approvalIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  approvalFarmName: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 2 },
  approvalFarmer: { fontSize: 12, color: C.muted, fontWeight: '500', marginBottom: 4 },
  approvalMeta: { flexDirection: 'row', flexWrap: 'wrap' },
  approvalMetaText: { fontSize: 11, color: C.subtle },
  approvalHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#bfdbfe',
  },
  approvalHintText: { fontSize: 11, color: '#1e40af', fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  fab: {
    position: 'absolute', right: 20, bottom: 28,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.c700,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8, elevation: 6,
  },
});

// ── Modal styles ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingTop: 8 },

  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: C.white, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100,
    alignItems: 'center', justifyContent: 'center', marginLeft: 12, flexShrink: 0,
  },

  // Identity card
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.white, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.steel200, marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  identityIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  identityName: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 3 },
  identityCode: { fontSize: 12, color: C.muted, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  // Section
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  sectionCard: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.steel200,
    padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  // Farmer row
  farmerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center',
  },
  farmerAvatarText: { fontSize: 18, fontWeight: '800', color: C.white },
  farmerName: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 2 },
  farmerSub: { fontSize: 12, color: C.muted },

  // Detail rows
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  detailIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailLabel: { fontSize: 11, color: C.muted, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 14, color: C.ink, fontWeight: '500' },

  // Compliance
  complianceCard: { borderLeftWidth: 4 },
  compBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginBottom: 8 },
  compBadgeText: { fontSize: 12, fontWeight: '800' },
  compDetail: { fontSize: 13, color: C.muted },

  // Note
  noteCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  noteText: { fontSize: 13, color: '#7f1d1d', lineHeight: 20 },

  // Request update input
  requestHint: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 10 },
  requestInput: {
    borderWidth: 1, borderColor: C.steel300, borderRadius: 10,
    padding: 12, fontSize: 14, color: C.ink,
    minHeight: 100, backgroundColor: C.steel100,
    marginBottom: 12,
  },
  requestActions: { flexDirection: 'row', gap: 10 },
  requestCancelBtn: {
    flex: 1, height: 40, borderRadius: 8, borderWidth: 1.5, borderColor: C.steel300,
    alignItems: 'center', justifyContent: 'center',
  },
  requestCancelText: { fontSize: 14, fontWeight: '600', color: C.muted },
  requestSendBtn: {
    flex: 2, height: 40, borderRadius: 8, backgroundColor: '#3b82f6',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  requestSendText: { fontSize: 14, fontWeight: '700', color: C.white },

  // Footer
  footer: {
    backgroundColor: C.white, paddingHorizontal: 16, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: C.steel200,
    gap: 10,
  },
  footerRequestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: '#3b82f6',
    backgroundColor: C.white,
  },
  footerRequestText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
  footerPrimary: { flexDirection: 'row', gap: 10 },
  footerRejectBtn: {
    flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: '#dc2626',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fef2f2',
  },
  footerRejectText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  footerApproveBtn: {
    flex: 2, height: 42, borderRadius: 10, backgroundColor: C.c700,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  footerApproveText: { fontSize: 14, fontWeight: '700', color: C.white },
});
