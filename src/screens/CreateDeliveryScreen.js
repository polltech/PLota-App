import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, FlatList, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { coopAPI } from '../services/api';
import { C } from '../theme';
import AppModal, { useAppModal } from '../components/AppModal';

const todayISO = () => new Date().toISOString().slice(0, 10);

const complianceInfo = (farm) => {
  const s = (farm?.compliance_status || 'Under Review').trim();
  if (s === 'Compliant')
    return { blocked: false, label: 'Compliant',    icon: 'shield-checkmark', color: '#15803d', bg: '#dcfce7', border: '#86efac' };
  if (s === 'Non-Compliant' || s === 'Non Compliant')
    return { blocked: true,  label: 'Non-Compliant', icon: 'shield-outline',   color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  if (s.toLowerCase().includes('flag'))
    return { blocked: true,  label: 'Flagged',        icon: 'flag',             color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  // Under Review or anything else — warn but allow
  return { blocked: false, label: s,               icon: 'time-outline',     color: '#d97706', bg: '#fef3c7', border: '#fcd34d', warn: true };
};

const Lbl = ({ text, required }) => (
  <Text style={s.label}>{text}{required && <Text style={{ color: '#dc2626' }}> *</Text>}</Text>
);

export default function CreateDeliveryScreen() {
  const navigation = useNavigation();

  // Data
  const [allFarmers, setAllFarmers] = useState([]);
  const [allFarms,   setAllFarms]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — farmer selection
  const [farmerQuery,    setFarmerQuery]    = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [showFarmerList, setShowFarmerList] = useState(false);

  // Step 2 — farm selection
  const [selectedFarm, setSelectedFarm] = useState(null);

  // Form fields
  const [netWeightInput, setNetWeightInput] = useState('');
  const [deliveryDate,   setDeliveryDate]   = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Coffee varieties
  const [selectedVarieties, setSelectedVarieties] = useState([]);

  const toggleVariety = (v) =>
    setSelectedVarieties(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  useEffect(() => {
    (async () => {
      try {
        const [fRes, farmRes] = await Promise.allSettled([
          coopAPI.getFarmers(),
          coopAPI.getFarms(),
        ]);
        if (fRes.status === 'fulfilled') {
          const d = fRes.value.data;
          setAllFarmers(Array.isArray(d) ? d : []);
        }
        if (farmRes.status === 'fulfilled') {
          const d = farmRes.value.data;
          setAllFarms(Array.isArray(d) ? d : (d?.farms || []));
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredFarmers = farmerQuery.trim()
    ? allFarmers.filter(f => {
        const q = farmerQuery.toLowerCase();
        const name = `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase();
        const phone = (f.phone || '').toLowerCase();
        const email = (f.email || '').toLowerCase();
        const memberNo = (f.coop_member_no || '').toLowerCase();
        const pcfno = (f.pcfno || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || email.includes(q) || memberNo.includes(q) || pcfno.includes(q);
      })
    : allFarmers.slice(0, 15);

  // Farms for the selected farmer
  const farmerFarms = selectedFarmer
    ? allFarms.filter(f =>
        String(f.owner_id) === String(selectedFarmer.id) ||
        String(f.farmer_id) === String(selectedFarmer.id)
      )
    : [];

  const modal = useAppModal();
  const netKg = parseFloat(netWeightInput) || 0;

  const resetForm = () => {
    setSelectedFarmer(null); setSelectedFarm(null);
    setNetWeightInput('');
    setSelectedVarieties([]);
    setDeliveryDate(new Date());
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await coopAPI.createDelivery({
        farm_id:          selectedFarm.id,
        net_weight_kg:    netKg,
        reception_date:   deliveryDate.toISOString().slice(0, 10),
        coffee_varieties: selectedVarieties.length > 0 ? selectedVarieties : null,
      });
      modal.show({
        type:         'success',
        title:        'Delivery Received',
        message:      `${netKg} kg from ${selectedFarm.farm_name || 'the farm'} has been received and recorded.\nNext step: processing.`,
        confirmLabel: 'Done',
        cancelLabel:  'Record Another',
        onConfirm:    () => navigation.goBack(),
        onCancel:     resetForm,
      });
    } catch (e) {
      const detail = e.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map(d => d.msg || String(d)).join('\n')
        : (typeof detail === 'string' ? detail : 'Failed to record delivery.');
      modal.show({ type: 'danger', title: 'Error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleSubmit = () => {
    if (!selectedFarm) {
      modal.show({ type: 'warning', title: 'Required', message: 'Please select a farm.' });
      return;
    }
    const ci = complianceInfo(selectedFarm);
    if (ci.blocked) {
      modal.show({ type: 'danger', title: 'Farm Not Compliant', message: `This farm is ${ci.label} and cannot accept deliveries.` });
      return;
    }
    if (netKg <= 0) {
      modal.show({ type: 'warning', title: 'Required', message: 'Net weight must be greater than 0.' });
      return;
    }

    const farmerName = selectedFarmer ? `${selectedFarmer.first_name} ${selectedFarmer.last_name}` : '—';
    modal.show({
      type:         'confirm',
      icon:         'archive',
      title:        'Confirm Delivery',
      message:      `Farmer: ${farmerName}\nFarm: ${selectedFarm.farm_name || selectedFarm.name}\nNet Weight: ${netKg} kg\nDate: ${fmtDate(deliveryDate)}`,
      confirmLabel: 'Record',
      cancelLabel:  'Cancel',
      onConfirm:    doSubmit,
    });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <View style={s.hero}>
        <SafeAreaView>
          <View style={s.heroRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={C.white} />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Record Delivery</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* STEP 1: Select Farmer */}
          <View style={s.section}>
            <View style={s.stepHeader}>
              <View style={s.stepBadge}><Text style={s.stepBadgeText}>1</Text></View>
              <Text style={s.stepTitle}>Select Farmer</Text>
            </View>
            <Text style={s.stepHint}>Search by name, phone or member number (PCFNO)</Text>

            {selectedFarmer ? (
              <TouchableOpacity
                style={s.selectedCard}
                onPress={() => { setSelectedFarmer(null); setSelectedFarm(null); setFarmerQuery(''); }}
                activeOpacity={0.8}
              >
                <View style={s.selectedCardLeft}>
                  <View style={s.farmerAvatar}>
                    <Text style={s.farmerAvatarText}>
                      {((selectedFarmer.first_name?.[0] || '') + (selectedFarmer.last_name?.[0] || '')).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View>
                    <Text style={s.selectedName}>{selectedFarmer.first_name} {selectedFarmer.last_name}</Text>
                    <Text style={s.selectedSub}>
                      {[selectedFarmer.pcfno, selectedFarmer.coop_member_no, selectedFarmer.phone].filter(Boolean).join('  ·  ')}
                    </Text>
                  </View>
                </View>
                <Ionicons name="close-circle" size={20} color={C.subtle} />
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={s.searchInput}
                  value={farmerQuery}
                  onChangeText={t => { setFarmerQuery(t); setShowFarmerList(true); }}
                  onFocus={() => setShowFarmerList(true)}
                  placeholder="Search farmers..."
                  placeholderTextColor={C.subtle}
                />
                {showFarmerList && (
                  <View style={s.dropdown}>
                    {filteredFarmers.length === 0 ? (
                      <Text style={s.dropEmpty}>No farmers found</Text>
                    ) : (
                      filteredFarmers.map(f => (
                        <TouchableOpacity
                          key={f.id}
                          style={s.dropItem}
                          onPress={() => { setSelectedFarmer(f); setShowFarmerList(false); setFarmerQuery(''); }}
                          activeOpacity={0.8}
                        >
                          <View style={s.dropItemLeft}>
                            <View style={s.dropAvatar}>
                              <Text style={s.dropAvatarText}>
                                {((f.first_name?.[0]||'')+(f.last_name?.[0]||'')).toUpperCase()||'?'}
                              </Text>
                            </View>
                            <View>
                              <Text style={s.dropName}>{f.first_name} {f.last_name}</Text>
                              <Text style={s.dropSub}>
                                {[f.pcfno, f.coop_member_no, f.phone].filter(Boolean).join('  ·  ')}
                              </Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={C.subtle} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* STEP 2: Select Farm (only if farmer selected) */}
          {selectedFarmer && (
            <View style={s.section}>
              <View style={s.stepHeader}>
                <View style={s.stepBadge}><Text style={s.stepBadgeText}>2</Text></View>
                <Text style={s.stepTitle}>Select Farm</Text>
              </View>

              {selectedFarm ? (
                <TouchableOpacity
                  style={[s.selectedCard, { borderColor: C.c300 }]}
                  onPress={() => setSelectedFarm(null)}
                  activeOpacity={0.8}
                >
                  <View style={s.selectedCardLeft}>
                    <View style={[s.farmerAvatar, { backgroundColor: C.c100 }]}>
                      <Ionicons name="leaf" size={18} color={C.c700} />
                    </View>
                    <View>
                      <Text style={s.selectedName}>{selectedFarm.farm_name || selectedFarm.name}</Text>
                      <Text style={s.selectedSub}>
                        {[selectedFarm.county, selectedFarm.total_area_ha ? `${Number(selectedFarm.total_area_ha).toFixed(2)} ha` : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="close-circle" size={20} color={C.subtle} />
                </TouchableOpacity>
              ) : farmerFarms.length === 0 ? (
                <View style={s.noFarms}>
                  <Ionicons name="leaf-outline" size={28} color={C.steel300} />
                  <Text style={s.noFarmsText}>No farms found for this farmer.</Text>
                  <Text style={s.noFarmsHint}>The farmer must register farms before a delivery can be recorded.</Text>
                </View>
              ) : (
                <View style={s.farmList}>
                  {farmerFarms.map(f => {
                    const ci = complianceInfo(f);
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={s.farmOption}
                        onPress={() => setSelectedFarm(f)}
                        activeOpacity={0.8}
                      >
                        <View style={s.farmOptionLeft}>
                          <Ionicons name="leaf-outline" size={16} color={C.c600} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.farmOptionName} numberOfLines={1}>{f.farm_name || f.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Text style={s.farmOptionSub} numberOfLines={1}>
                                {[f.county, f.total_area_ha ? `${Number(f.total_area_ha).toFixed(2)} ha` : null].filter(Boolean).join(' · ')}
                              </Text>
                              <View style={[s.compliancePill, { backgroundColor: ci.bg }]}>
                                <Ionicons name={ci.icon} size={9} color={ci.color} />
                                <Text style={[s.compliancePillText, { color: ci.color }]}>{ci.label}</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="radio-button-off-outline" size={18} color={C.subtle} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Compliance banner + Steps 3-5 (only if farm selected) */}
          {selectedFarm && (() => {
            const ci = complianceInfo(selectedFarm);
            return (
              <>
                {/* Compliance status banner */}
                <View style={[s.complianceBanner, { backgroundColor: ci.bg, borderColor: ci.border }]}>
                  <Ionicons name={ci.icon} size={22} color={ci.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.complianceBannerTitle, { color: ci.color }]}>
                      {ci.blocked ? `Farm is ${ci.label}` : ci.warn ? 'Farm Under Review' : 'Farm is Compliant'}
                    </Text>
                    {ci.blocked && (
                      <Text style={[s.complianceBannerSub, { color: ci.color }]}>
                        {selectedFarm.deforestation_risk_score != null && Number(selectedFarm.deforestation_risk_score) > 0
                          ? `Deforestation risk score: ${Number(selectedFarm.deforestation_risk_score).toFixed(1)}/100`
                          : 'This farm has been flagged.'
                        }{'\n'}Deliveries cannot be recorded for this farm.
                      </Text>
                    )}
                    {ci.warn && !ci.blocked && (
                      <Text style={[s.complianceBannerSub, { color: ci.color }]}>
                        Compliance review is pending. Proceed with caution.
                      </Text>
                    )}
                    {!ci.blocked && !ci.warn && (
                      <Text style={[s.complianceBannerSub, { color: ci.color }]}>
                        This farm meets EUDR requirements.
                      </Text>
                    )}
                  </View>
                </View>

                {!ci.blocked && (
                  <>
                    <View style={s.section}>
                      <View style={s.stepHeader}>
                        <View style={s.stepBadge}><Text style={s.stepBadgeText}>3</Text></View>
                        <Text style={s.stepTitle}>Weight</Text>
                      </View>
                      <Lbl text="Net Weight (kg)" required />
                      <TextInput
                        style={s.input}
                        value={netWeightInput}
                        onChangeText={setNetWeightInput}
                        keyboardType="decimal-pad"
                        placeholder="0.0"
                        placeholderTextColor={C.subtle}
                      />
                    </View>

                    {/* Coffee Varieties */}
                    <View style={s.section}>
                      <View style={s.stepHeader}>
                        <View style={s.stepBadge}><Text style={s.stepBadgeText}>4</Text></View>
                        <Text style={s.stepTitle}>Coffee Varieties</Text>
                        <View style={s.optionalTag}><Text style={s.optionalTagText}>Optional</Text></View>
                      </View>
                      <Text style={s.stepHint}>Select all varieties in this delivery</Text>
                      <View style={s.varietyGrid}>
                        {['SL28','SL34','Ruiru 11','Batian','K7','Blue Mountain','Robusta','Other'].map(v => {
                          const active = selectedVarieties.includes(v);
                          return (
                            <TouchableOpacity
                              key={v}
                              style={[s.varietyChip, active && s.varietyChipActive]}
                              onPress={() => toggleVariety(v)}
                              activeOpacity={0.8}
                            >
                              <Text style={[s.varietyChipText, active && s.varietyChipTextActive]}>{v}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Record Date — calendar picker */}
                    <View style={s.section}>
                      <View style={s.stepHeader}>
                        <View style={s.stepBadge}><Text style={s.stepBadgeText}>5</Text></View>
                        <Text style={s.stepTitle}>Record Date</Text>
                      </View>
                      <TouchableOpacity
                        style={s.datePickerBtn}
                        onPress={() => setShowDatePicker(true)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={18} color={C.c700} />
                        <Text style={s.datePickerText}>{fmtDate(deliveryDate)}</Text>
                        <Ionicons name="chevron-down" size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
                      </TouchableOpacity>

                      {/* Android: renders inline as dialog when showDatePicker=true */}
                      {Platform.OS === 'android' && showDatePicker && (
                        <DateTimePicker
                          value={deliveryDate}
                          mode="date"
                          display="calendar"
                          maximumDate={new Date()}
                          onChange={(_, d) => { setShowDatePicker(false); if (d) setDeliveryDate(d); }}
                        />
                      )}

                      {/* iOS: wrap in Modal so it doesn't push content */}
                      {Platform.OS === 'ios' && (
                        <Modal visible={showDatePicker} transparent animationType="slide">
                          <View style={s.iosPickerBackdrop}>
                            <View style={s.iosPickerSheet}>
                              <View style={s.iosPickerHeader}>
                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                  <Text style={s.iosPickerDone}>Done</Text>
                                </TouchableOpacity>
                              </View>
                              <DateTimePicker
                                value={deliveryDate}
                                mode="date"
                                display="spinner"
                                maximumDate={new Date()}
                                onChange={(_, d) => { if (d) setDeliveryDate(d); }}
                                style={{ width: '100%' }}
                              />
                            </View>
                          </View>
                        </Modal>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[s.submitBtn, (submitting || netKg <= 0) && s.btnDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting || netKg <= 0}
                      activeOpacity={0.85}
                    >
                      {submitting
                        ? <ActivityIndicator color={C.white} />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={C.white} />
                            <Text style={s.submitText}>Record Delivery</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </>
                )}
              </>
            );
          })()}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      <AppModal {...modal.props} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingLeft: 56, paddingRight: 24, paddingBottom: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: C.white },

  scroll: { flex: 1 },
  content: { padding: 16 },

  section: { backgroundColor: C.white, borderRadius: 18, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  stepBadgeText: { fontSize: 12, fontWeight: '900', color: C.white },
  stepTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  stepHint: { fontSize: 12, color: C.muted, marginBottom: 12 },

  searchInput: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 14, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },

  dropdown: { backgroundColor: C.white, borderRadius: 12, marginTop: 4, borderWidth: 1.5, borderColor: C.steel200, maxHeight: 220, overflow: 'hidden' },
  dropItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  dropItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dropAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.c100, alignItems: 'center', justifyContent: 'center' },
  dropAvatarText: { fontSize: 13, fontWeight: '900', color: C.c700 },
  dropName: { fontSize: 14, fontWeight: '700', color: C.ink },
  dropSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  dropEmpty: { textAlign: 'center', padding: 16, color: C.muted },

  selectedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#bbf7d0' },
  selectedCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  farmerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center' },
  farmerAvatarText: { fontSize: 15, fontWeight: '900', color: C.white },
  selectedName: { fontSize: 14, fontWeight: '800', color: C.ink },
  selectedSub: { fontSize: 11, color: C.muted, marginTop: 2 },

  noFarms: { alignItems: 'center', paddingVertical: 20 },
  noFarmsText: { fontSize: 14, fontWeight: '700', color: C.steel600, marginTop: 10 },
  noFarmsHint: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 },

  farmList: { gap: 0 },
  farmOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  farmOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  farmOptionName: { fontSize: 14, fontWeight: '700', color: C.ink },
  farmOptionSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  compliancePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  compliancePillText: { fontSize: 9, fontWeight: '800' },

  optionalTag: { marginLeft: 6, backgroundColor: C.steel100, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: C.steel200 },
  optionalTagText: { fontSize: 10, fontWeight: '700', color: C.muted },

  varietyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  varietyChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100 },
  varietyChipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  varietyChipText: { fontSize: 13, fontWeight: '600', color: C.steel600 },
  varietyChipTextActive: { color: C.white },


  complianceBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1.5 },
  complianceBannerTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  complianceBannerSub: { fontSize: 12, fontWeight: '600', lineHeight: 17 },

  label: { fontSize: 11, fontWeight: '700', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },



  datePickerBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.steel100, borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1.5, borderColor: C.steel200 },
  datePickerText:    { fontSize: 15, fontWeight: '700', color: C.ink },
  iosPickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  iosPickerSheet:    { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  iosPickerHeader:   { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  iosPickerDone:     { fontSize: 16, fontWeight: '700', color: C.c700 },


  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 18, paddingVertical: 18, marginTop: 8, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  submitText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
