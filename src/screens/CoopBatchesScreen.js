import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, RefreshControl, StatusBar, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const cap = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
const fmtKg = (v) => v != null ? `${Number(v).toFixed(1)} kg` : '—';

const batchStatusStyle = (s) => {
  const u = (s || '').toLowerCase();
  if (u === 'verified' || u === 'dds_submitted') return { color: '#15803d', bg: '#dcfce7' };
  if (u === 'released')                          return { color: '#1d4ed8', bg: '#dbeafe' };
  if (u === 'under_satellite_review')            return { color: '#0891b2', bg: '#e0f2fe' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const complianceStyle = (s) => {
  if (!s) return { color: C.muted, bg: C.steel100 };
  const u = s.toLowerCase();
  if (u.includes('compliant') && !u.includes('non')) return { color: '#15803d', bg: '#dcfce7' };
  if (u.includes('non') || u.includes('risk'))       return { color: '#dc2626', bg: '#fee2e2' };
  return { color: '#b45309', bg: '#fef3c7' };
};

const StatCard = ({ value, label, color, bg }) => (
  <View style={[s.statCard, { backgroundColor: bg, borderLeftColor: color }]}>
    <Text style={[s.statVal, { color }]}>{value ?? '—'}</Text>
    <Text style={[s.statLabel, { color }]}>{label}</Text>
  </View>
);

const BatchRow = ({ item, onPress, onRelease }) => {
  const ss = batchStatusStyle(item.batch_status);
  const cs = complianceStyle(item.compliance_status);
  const eudrPct = item.total_weight_kg > 0
    ? ((item.eudr_eligible_kg || 0) / item.total_weight_kg * 100).toFixed(0)
    : 0;

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={s.rowMain}>
        {/* Top row: Batch # + Status */}
        <View style={s.rowTop}>
          <Text style={s.batchNo} numberOfLines={1}>{item.batch_reference}</Text>
          <View style={[s.badge, { backgroundColor: ss.bg }]}>
            <Text style={[s.badgeText, { color: ss.color }]}>{cap(item.batch_status || 'Draft')}</Text>
          </View>
        </View>

        {/* Metrics row */}
        <View style={s.metricsRow}>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Year</Text>
            <Text style={s.metricVal}>{item.crop_year || '—'}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Total</Text>
            <Text style={s.metricVal}>{fmtKg(item.total_weight_kg)}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>EUDR</Text>
            <Text style={[s.metricVal, { color: '#15803d' }]}>{fmtKg(item.eudr_eligible_kg)} <Text style={s.metricSub}>({eudrPct}%)</Text></Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Grade</Text>
            <Text style={s.metricVal}>{item.quality_grade || 'N/A'}</Text>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Compliance</Text>
            <View style={[s.badge, { backgroundColor: cs.bg }]}>
              <Text style={[s.badgeText, { color: cs.color }]}>{item.compliance_status || 'Under Review'}</Text>
            </View>
          </View>
          <View style={s.metric}>
            <Text style={s.metricLabel}>Date</Text>
            <Text style={s.metricVal}>{fmtDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Action: Release if draft */}
        {(item.batch_status === 'draft' || !item.batch_status) && (
          <TouchableOpacity
            style={s.releaseBtn}
            onPress={(e) => { e.stopPropagation?.(); onRelease(item); }}
            activeOpacity={0.8}
          >
            <Ionicons name="rocket-outline" size={14} color={C.white} />
            <Text style={s.releaseBtnText}>Release for Satellite Review</Text>
          </TouchableOpacity>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.subtle} style={{ marginLeft: 8 }} />
    </TouchableOpacity>
  );
};

// ── Pure-JS Calendar Picker (no native modules required) ─────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const CalendarPicker = ({ visible, value, minimumDate, onClose, onSelect }) => {
  const today = new Date();
  const initYear  = value ? parseInt(value.split('-')[0]) : today.getFullYear();
  const initMonth = value ? parseInt(value.split('-')[1]) - 1 : today.getMonth();
  const [yr, setYr] = useState(initYear);
  const [mo, setMo] = useState(initMonth);

  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const startDay    = new Date(yr, mo, 1).getDay();
  const cells       = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isDisabled = (day) => {
    if (!minimumDate || !day) return false;
    const [my, mm, md] = minimumDate.split('-').map(Number);
    if (yr < my) return true;
    if (yr === my && mo + 1 < mm) return true;
    if (yr === my && mo + 1 === mm && day < md) return true;
    return false;
  };
  const isSelected = (day) => {
    if (!value || !day) return false;
    const [vy, vm, vd] = value.split('-').map(Number);
    return vy === yr && vm === mo + 1 && vd === day;
  };
  const isToday = (day) => day && today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === day;

  const prevMonth = () => mo === 0 ? (setYr(yr - 1), setMo(11)) : setMo(mo - 1);
  const nextMonth = () => mo === 11 ? (setYr(yr + 1), setMo(0)) : setMo(mo + 1);

  const select = (day) => {
    if (!day || isDisabled(day)) return;
    const m = String(mo + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onSelect(`${yr}-${m}-${d}`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <View style={cal.card} onStartShouldSetResponder={() => true}>
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Ionicons name="chevron-back" size={22} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTH_NAMES[mo]} {yr}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Ionicons name="chevron-forward" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <View style={cal.weekRow}>
            {DAY_LABELS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
          </View>

          <View style={cal.grid}>
            {cells.map((day, i) => {
              const sel = isSelected(day);
              const dis = isDisabled(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={i}
                  style={[cal.cell, sel && cal.cellSel, tod && !sel && cal.cellToday]}
                  onPress={() => select(day)}
                  disabled={!day || dis}
                  activeOpacity={0.7}
                >
                  {!!day && (
                    <Text style={[cal.cellText, sel && cal.cellTextSel, dis && cal.cellTextDis]}>
                      {day}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={cal.cancelBtn} onPress={onClose}>
            <Text style={cal.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const cal = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card:         { backgroundColor: '#fff', borderRadius: 20, padding: 16, width: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn:       { padding: 8 },
  monthLabel:   { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  weekRow:      { flexDirection: 'row', marginBottom: 6 },
  dayLabel:     { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  cellSel:      { backgroundColor: '#15803d' },
  cellToday:    { borderWidth: 1.5, borderColor: '#15803d' },
  cellText:     { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  cellTextSel:  { color: '#fff', fontWeight: '800' },
  cellTextDis:  { color: '#cbd5e1' },
  cancelBtn:    { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  cancelText:   { fontSize: 14, fontWeight: '700', color: '#64748b' },
});

export default function CoopBatchesScreen() {
  const navigation = useNavigation();
  const [batches,     setBatches]     = useState([]);
  const [deliveries,  setDeliveries]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  // Create batch modal state
  const [showCreate,         setShowCreate]         = useState(false);
  const [selectedDeliveries, setSelectedDeliveries] = useState([]);
  const [batchRef,           setBatchRef]           = useState('');
  const [harvestStart,       setHarvestStart]       = useState('');
  const [harvestEnd,         setHarvestEnd]         = useState('');
  const [batchNotes,         setBatchNotes]         = useState('');
  const [releaseNow,         setReleaseNow]         = useState(false);
  const [creating,           setCreating]           = useState(false);
  const [showStartPicker,    setShowStartPicker]    = useState(false);
  const [showEndPicker,      setShowEndPicker]      = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [bRes, dRes] = await Promise.allSettled([
        coopAPI.getBatches(),
        coopAPI.getReadyForBatching(),
      ]);
      if (bRes.status === 'fulfilled') {
        const d = bRes.value.data;
        setBatches(Array.isArray(d) ? d : (d?.batches || []));
      }
      if (dRes.status === 'fulfilled') {
        const d = dRes.value.data;
        setDeliveries(Array.isArray(d) ? d : (d?.deliveries || []));
      }
    } catch (e) {
      console.warn('CoopBatches load:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleRelease = (batch) => {
    Alert.alert(
      'Release Batch',
      `Release batch ${batch.batch_reference} for Plotra Admin satellite review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Release', onPress: async () => {
          try {
            await coopAPI.releaseBatch(batch.id, '');
            setBatches(prev => prev.map(b =>
              b.id === batch.id ? { ...b, batch_status: 'released' } : b
            ));
            Alert.alert('Released', `${batch.batch_reference} submitted for satellite screening.`);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.detail || 'Release failed.');
          }
        }},
      ]
    );
  };

  const resetCreate = () => {
    setSelectedDeliveries([]); setBatchRef(''); setHarvestStart('');
    setHarvestEnd(''); setBatchNotes(''); setReleaseNow(false);
  };

  const handleCreate = async (release) => {
    if (!batchRef.trim()) { Alert.alert('Required', 'Enter a batch reference (e.g. NYR-2025-B04).'); return; }
    if (!selectedDeliveries.length) { Alert.alert('Required', 'Select at least one delivery.'); return; }
    if (!harvestStart.trim() || !harvestEnd.trim()) { Alert.alert('Required', 'Enter the harvest period start and end dates.'); return; }
    setCreating(true);
    try {
      await coopAPI.createBatch({
        batch_reference: batchRef.trim(),
        harvest_period_start: harvestStart.trim() || undefined,
        harvest_period_end: harvestEnd.trim() || undefined,
        notes: batchNotes.trim() || undefined,
        delivery_ids: selectedDeliveries,
        release_immediately: release,
      });
      setShowCreate(false);
      resetCreate();
      await load(true);
      Alert.alert(
        release ? 'Released' : 'Draft Saved',
        release
          ? `Batch ${batchRef} created and submitted for satellite review.`
          : `Batch ${batchRef} saved as draft. Release it when ready.`
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Failed to create batch.');
    } finally {
      setCreating(false);
    }
  };

  const toggleDelivery = (id) =>
    setSelectedDeliveries(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  // Running totals from selected deliveries
  // packed_weight_kg = weight_out_kg from the PACKING processing step (final weight into batch)
  // falls back to net_weight_kg (intake weight) if PACKING step not yet logged
  const selectedObjs    = deliveries.filter(d => selectedDeliveries.includes(d.id));
  const effKg           = (d) => d.packed_weight_kg ?? d.net_weight_kg ?? 0;
  const selTotalKg      = selectedObjs.reduce((s, d) => s + effKg(d), 0);
  const selEudrKg       = selectedObjs.filter(d => d.eudr_eligible !== false).reduce((s, d) => s + effKg(d), 0);
  const selNonCompliant = selectedObjs.filter(d => d.eudr_eligible === false);
  const selFarmers      = new Set(selectedObjs.map(d => d.farm_id).filter(Boolean)).size;
  const selFarms        = new Set(selectedObjs.map(d => d.farm_id).filter(Boolean)).size;

  // Stat counts
  const totalKg   = batches.reduce((s, b) => s + (b.total_weight_kg || 0), 0);
  const eudrKg    = batches.reduce((s, b) => s + (b.eudr_eligible_kg || 0), 0);
  const released  = batches.filter(b => b.batch_status === 'released' || b.batch_status === 'under_satellite_review').length;
  const draft     = batches.filter(b => !b.batch_status || b.batch_status === 'draft').length;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Batch Management</Text>
            <Text style={s.headerSub}>{batches.length} batches · {fmtKg(totalKg)}</Text>
          </View>
          <TouchableOpacity
            style={s.newBtn}
            onPress={() => setShowCreate(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={C.white} />
            <Text style={s.newBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* 4 stat cards — matching web */}
      {!loading && (
        <View style={s.statsRow}>
          <StatCard value={batches.length} label="Total Batches" color={C.c700} bg={C.c050} />
          <StatCard value={fmtKg(totalKg)} label="Total Weight"  color={C.c700} bg={C.c050} />
          <StatCard value={fmtKg(eudrKg)}  label="EUDR Eligible" color={C.c700} bg={C.c050} />
          <StatCard value={released}        label="In Review"     color={C.c700} bg={C.c050} />
        </View>
      )}

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={batches}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <BatchRow
              item={item}
              onPress={() => navigation.navigate('BatchDetail', { batchId: item.id, batch: item })}
              onRelease={handleRelease}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="layers-outline" size={48} color={C.steel300} />
              <Text style={s.emptyTitle}>No batches yet</Text>
              <Text style={s.emptyMsg}>Create a batch from deliveries that are ready for batching.</Text>
            </View>
          }
        />
      )}

      {/* Create Batch Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCreate(false); resetCreate(); }}>
              <Ionicons name="close" size={24} color={C.ink} />
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Batch</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Batch Reference ── */}
            <Text style={s.fieldLabel}>Batch Reference *</Text>
            <TextInput
              style={s.input}
              value={batchRef}
              onChangeText={setBatchRef}
              placeholder="e.g. NYR-2025-B04"
              placeholderTextColor={C.subtle}
              autoCapitalize="characters"
            />

            {/* ── Harvest Period ── */}
            <Text style={s.fieldLabel}>Harvest Period *</Text>
            <View style={s.dateRow}>
              <TouchableOpacity
                style={[s.input, s.datePicker]}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color={harvestStart ? C.c700 : C.subtle} />
                <Text style={[s.datePickerText, !harvestStart && { color: C.subtle }]}>
                  {harvestStart || 'Start date'}
                </Text>
              </TouchableOpacity>
              <Ionicons name="arrow-forward-outline" size={16} color={C.muted} />
              <TouchableOpacity
                style={[s.input, s.datePicker]}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={15} color={harvestEnd ? C.c700 : C.subtle} />
                <Text style={[s.datePickerText, !harvestEnd && { color: C.subtle }]}>
                  {harvestEnd || 'End date'}
                </Text>
              </TouchableOpacity>
            </View>

            <CalendarPicker
              visible={showStartPicker}
              value={harvestStart}
              onClose={() => setShowStartPicker(false)}
              onSelect={(iso) => { setHarvestStart(iso); setShowStartPicker(false); }}
            />
            <CalendarPicker
              visible={showEndPicker}
              value={harvestEnd}
              minimumDate={harvestStart || undefined}
              onClose={() => setShowEndPicker(false)}
              onSelect={(iso) => { setHarvestEnd(iso); setShowEndPicker(false); }}
            />

            {/* ── Notes ── */}
            <Text style={s.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[s.input, s.textarea]}
              value={batchNotes}
              onChangeText={setBatchNotes}
              placeholder="Grade notes, processing method, export market…"
              placeholderTextColor={C.subtle}
              multiline
              numberOfLines={3}
            />

            {/* ── Deliveries ── */}
            <View style={s.sectionRow}>
              <Text style={s.fieldLabel}>Select Deliveries *</Text>
              <Text style={s.sectionCount}>{selectedDeliveries.length} selected</Text>
            </View>

            {/* Running totals */}
            {selectedDeliveries.length > 0 && (
              <View style={s.totalsCard}>
                <View style={s.totalItem}>
                  <Text style={s.totalVal}>{selFarmers}</Text>
                  <Text style={s.totalLbl}>Farmers</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.totalItem}>
                  <Text style={s.totalVal}>{selFarms}</Text>
                  <Text style={s.totalLbl}>Farms</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.totalItem}>
                  <Text style={s.totalVal}>{fmtKg(selTotalKg)}</Text>
                  <Text style={s.totalLbl}>Total Weight</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.totalItem}>
                  <Text style={[s.totalVal, { color: '#15803d' }]}>{fmtKg(selEudrKg)}</Text>
                  <Text style={s.totalLbl}>EUDR Eligible</Text>
                </View>
                {selNonCompliant.length > 0 && (
                  <>
                    <View style={s.totalDivider} />
                    <View style={s.totalItem}>
                      <Text style={[s.totalVal, { color: '#dc2626' }]}>{fmtKg(selTotalKg - selEudrKg)}</Text>
                      <Text style={s.totalLbl}>Non-Compliant</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* EUDR warning */}
            {selNonCompliant.length > 0 && (
              <View style={s.eudrWarning}>
                <Ionicons name="warning-outline" size={16} color="#b45309" />
                <Text style={s.eudrWarningText}>
                  {selNonCompliant.length} selected deliver{selNonCompliant.length > 1 ? 'ies are' : 'y is'} linked to non-compliant or unverified parcels.
                  Their weight will be excluded from EUDR-eligible totals.
                </Text>
              </View>
            )}

            {deliveries.length === 0 ? (
              <View style={s.noDeliveries}>
                <Ionicons name="information-circle-outline" size={20} color={C.muted} />
                <Text style={s.noDeliveriesText}>No deliveries are ready for batching.</Text>
              </View>
            ) : (
              deliveries.map(d => {
                const selected = selectedDeliveries.includes(d.id);
                const compliant = d.eudr_eligible !== false;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[s.deliveryPick, selected && s.deliveryPickSel, !compliant && s.deliveryPickWarn]}
                    onPress={() => toggleDelivery(d.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.checkbox, selected && s.checkboxSel]}>
                      {selected && <Ionicons name="checkmark" size={12} color={C.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.pickNo}>{d.delivery_number || `D-${d.id?.slice(0,8)}`}</Text>
                        {!compliant && (
                          <View style={s.pickWarnBadge}>
                            <Text style={s.pickWarnText}>Non-EUDR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.pickMeta}>
                        {d.farmer_name || '—'} · {fmtKg(d.net_weight_kg)}
                      </Text>
                    </View>
                    {compliant && (
                      <Ionicons name="shield-checkmark-outline" size={14} color="#15803d" />
                    )}
                  </TouchableOpacity>
                );
              })
            )}

            {/* Action buttons */}
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.draftBtn, creating && { opacity: 0.6 }]}
                onPress={() => handleCreate(false)}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating
                  ? <ActivityIndicator color={C.c700} size="small" />
                  : <>
                      <Ionicons name="save-outline" size={16} color={C.c700} />
                      <Text style={s.draftBtnText}>Save Draft</Text>
                    </>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.releaseCreateBtn, creating && { opacity: 0.6 }]}
                onPress={() => handleCreate(true)}
                disabled={creating}
                activeOpacity={0.85}
              >
                {creating
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <>
                      <Ionicons name="rocket-outline" size={16} color={C.white} />
                      <Text style={s.releaseCreateBtnText}>Save & Release</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
            <View style={{ height: 50 }} />
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 8, paddingLeft: 36 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.c700, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  newBtnText: { color: C.white, fontSize: 13, fontWeight: '800' },

  statsRow: { flexDirection: 'row', backgroundColor: C.white, paddingHorizontal: 10, paddingVertical: 10, gap: 6, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center', borderLeftWidth: 3 },
  statVal: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  statLabel: { fontSize: 8, fontWeight: '700', textAlign: 'center', marginTop: 2, lineHeight: 11 },

  list: { padding: 12, paddingBottom: 24 },
  row: { backgroundColor: C.white, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  rowMain: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  batchNo: { fontSize: 15, fontWeight: '800', color: C.ink, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metric: { minWidth: 80 },
  metricLabel: { fontSize: 9, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  metricVal: { fontSize: 13, fontWeight: '700', color: C.ink, marginTop: 2 },
  metricSub: { fontSize: 10, color: C.muted, fontWeight: '500' },

  releaseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#15803d', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' },
  releaseBtnText: { color: C.white, fontSize: 12, fontWeight: '800' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, paddingHorizontal: 40 },

  // Modal
  modal: { flex: 1, backgroundColor: C.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.steel200, paddingTop: 52 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  modalBody: { flex: 1, padding: 20 },

  fieldLabel: { fontSize: 11, fontWeight: '800', color: C.steel600, marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 6 },
  sectionCount: { fontSize: 12, fontWeight: '700', color: C.c700 },
  input: { borderWidth: 1.5, borderColor: C.steel200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.ink, backgroundColor: C.steel50 || C.steel100 },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePicker: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  datePickerText: { fontSize: 14, color: C.ink, flex: 1 },

  // Running totals
  totalsCard: { flexDirection: 'row', backgroundColor: C.steel100, borderRadius: 14, padding: 14, marginBottom: 10, alignItems: 'center' },
  totalItem: { flex: 1, alignItems: 'center' },
  totalVal: { fontSize: 14, fontWeight: '900', color: C.ink },
  totalLbl: { fontSize: 9, color: C.muted, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  totalDivider: { width: 1, height: 28, backgroundColor: C.steel200 },

  // EUDR warning
  eudrWarning: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 12, marginBottom: 10 },
  eudrWarningText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 18 },

  noDeliveries: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: C.steel100, borderRadius: 10 },
  noDeliveriesText: { fontSize: 13, color: C.muted },

  deliveryPick: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.steel200, marginBottom: 6, backgroundColor: C.white },
  deliveryPickSel: { borderColor: C.c700, backgroundColor: C.c050 },
  deliveryPickWarn: { borderColor: '#fcd34d', backgroundColor: '#fffbeb' },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxSel: { backgroundColor: C.c700, borderColor: C.c700 },
  pickNo: { fontSize: 13, fontWeight: '800', color: C.ink },
  pickMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  pickWarnBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  pickWarnText: { fontSize: 9, fontWeight: '800', color: '#b45309' },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 2, borderColor: C.c700, borderRadius: 14, paddingVertical: 14 },
  draftBtnText: { color: C.c700, fontSize: 14, fontWeight: '800' },
  releaseCreateBtn: { flex: 1.3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#15803d', borderRadius: 14, paddingVertical: 14 },
  releaseCreateBtnText: { color: C.white, fontSize: 14, fontWeight: '800' },
});
