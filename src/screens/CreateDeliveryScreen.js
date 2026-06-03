import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, StatusBar, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const QUALITY_GRADES = ['AA', 'AB', 'PB', 'C', 'AAAA', 'ungraded'];
const CHERRY_TYPES   = ['Red Cherry', 'Mbuni', 'Parchment'];

const Lbl = ({ text, required }) => (
  <Text style={s.label}>{text}{required && <Text style={{ color: '#dc2626' }}> *</Text>}</Text>
);

const Chips = ({ options, value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
    <View style={s.chipRow}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.chip, value === opt && s.chipActive]}
          onPress={() => onChange(value === opt ? null : opt)}
          activeOpacity={0.8}
        >
          <Text style={[s.chipText, value === opt && s.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
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
  const [grossWeight,   setGrossWeight]   = useState('');
  const [tareWeight,    setTareWeight]    = useState('0');
  const [qualityGrade,  setQualityGrade]  = useState(null);
  const [moisture,      setMoisture]      = useState('');
  const [cherryType,    setCherryType]    = useState(null);
  const [pickingDate,   setPickingDate]   = useState('');
  const [notes,         setNotes]         = useState('');

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
        console.warn('CreateDelivery load:', e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Farmer search — by name or membership number
  const filteredFarmers = farmerQuery.trim()
    ? allFarmers.filter(f => {
        const q = farmerQuery.toLowerCase();
        const name = `${f.first_name || ''} ${f.last_name || ''}`.toLowerCase();
        const phone = (f.phone || '').toLowerCase();
        const memberNo = (f.coop_member_no || f.membership_number || '').toLowerCase();
        const email = (f.email || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || memberNo.includes(q) || email.includes(q);
      })
    : allFarmers.slice(0, 15);

  // Farms for the selected farmer
  const farmerFarms = selectedFarmer
    ? allFarms.filter(f =>
        String(f.owner_id) === String(selectedFarmer.id) ||
        String(f.farmer_id) === String(selectedFarmer.id)
      )
    : [];

  const netWeight = Math.max(0, (parseFloat(grossWeight) || 0) - (parseFloat(tareWeight) || 0)).toFixed(1);

  const handleSubmit = () => {
    if (!selectedFarm)     { Alert.alert('Required', 'Select a farm.'); return; }
    if (!grossWeight || parseFloat(grossWeight) <= 0) { Alert.alert('Required', 'Gross weight must be greater than 0.'); return; }

    Alert.alert(
      'Confirm Delivery',
      [
        `Farmer: ${selectedFarmer ? `${selectedFarmer.first_name} ${selectedFarmer.last_name}` : '—'}`,
        `Farm: ${selectedFarm.farm_name || selectedFarm.name}`,
        `Net Weight: ${netWeight} kg`,
        qualityGrade ? `Grade: ${qualityGrade}` : '',
      ].filter(Boolean).join('\n'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record', onPress: async () => {
            setSubmitting(true);
            try {
              await coopAPI.createDelivery({
                farm_id:          selectedFarm.id,
                gross_weight_kg:  parseFloat(grossWeight),
                tare_weight_kg:   parseFloat(tareWeight) || 0,
                quality_grade:    qualityGrade || null,
                moisture_content: moisture ? parseFloat(moisture) : null,
                cherry_type:      cherryType || null,
                picking_date:     pickingDate ? new Date(pickingDate).toISOString() : null,
                notes:            notes.trim() || null,
              });
              Alert.alert('Delivery Recorded', `${netWeight} kg from ${selectedFarm.farm_name || 'the farm'} has been recorded.`, [
                { text: 'Record Another', onPress: () => {
                    setSelectedFarmer(null); setSelectedFarm(null);
                    setGrossWeight(''); setTareWeight('0');
                    setQualityGrade(null); setMoisture(''); setCherryType(null);
                    setPickingDate(''); setNotes('');
                }},
                { text: 'Done', onPress: () => navigation.goBack() },
              ]);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to record delivery.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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
            <Text style={s.stepHint}>Search by name, phone or cooperative membership number</Text>

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
                      {[selectedFarmer.phone, selectedFarmer.coop_member_no || selectedFarmer.membership_number].filter(Boolean).join(' · ')}
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
                                {[f.phone, f.coop_member_no||f.membership_number].filter(Boolean).join(' · ')}
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
                  {farmerFarms.map(f => (
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
                          <Text style={s.farmOptionSub} numberOfLines={1}>
                            {[f.county, f.total_area_ha ? `${Number(f.total_area_ha).toFixed(2)} ha` : null].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="radio-button-off-outline" size={18} color={C.subtle} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* STEP 3: Weight & Quality (only if farm selected) */}
          {selectedFarm && (
            <>
              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>3</Text></View>
                  <Text style={s.stepTitle}>Weight</Text>
                </View>
                <View style={s.weightRow}>
                  <View style={{ flex: 1 }}>
                    <Lbl text="Gross Weight (kg)" required />
                    <TextInput style={s.input} value={grossWeight} onChangeText={setGrossWeight}
                      keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={C.subtle} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Lbl text="Tare Weight (kg)" />
                    <TextInput style={s.input} value={tareWeight} onChangeText={setTareWeight}
                      keyboardType="decimal-pad" placeholder="0.0" placeholderTextColor={C.subtle} />
                  </View>
                </View>
                {parseFloat(grossWeight) > 0 && (
                  <View style={s.netRow}>
                    <Ionicons name="scale-outline" size={16} color="#15803d" />
                    <Text style={s.netText}>Net Weight: <Text style={{ fontWeight: '900' }}>{netWeight} kg</Text></Text>
                  </View>
                )}
              </View>

              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>4</Text></View>
                  <Text style={s.stepTitle}>Quality</Text>
                </View>
                <Lbl text="Quality Grade" />
                <Chips options={QUALITY_GRADES} value={qualityGrade} onChange={setQualityGrade} />
                <View style={{ height: 14 }} />
                <Lbl text="Cherry Type" />
                <Chips options={CHERRY_TYPES} value={cherryType} onChange={setCherryType} />
                <View style={{ height: 14 }} />
                <Lbl text="Moisture Content (%)" />
                <TextInput style={s.input} value={moisture} onChangeText={setMoisture}
                  keyboardType="decimal-pad" placeholder="e.g. 11.5" placeholderTextColor={C.subtle} />
              </View>

              <View style={s.section}>
                <View style={s.stepHeader}>
                  <View style={s.stepBadge}><Text style={s.stepBadgeText}>5</Text></View>
                  <Text style={s.stepTitle}>Harvest Details</Text>
                </View>
                <Lbl text="Picking Date (YYYY-MM-DD)" />
                <TextInput style={s.input} value={pickingDate} onChangeText={setPickingDate}
                  placeholder={new Date().toISOString().slice(0,10)} placeholderTextColor={C.subtle}
                  keyboardType="numbers-and-punctuation" />
                <View style={{ height: 14 }} />
                <Lbl text="Notes" />
                <TextInput
                  style={[s.input, s.textarea]}
                  value={notes} onChangeText={setNotes}
                  placeholder="Quality notes, visual observations at intake…"
                  placeholderTextColor={C.subtle}
                  multiline numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[s.submitBtn, (submitting || !grossWeight) && s.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting || !parseFloat(grossWeight)}
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

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
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

  label: { fontSize: 11, fontWeight: '700', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: C.steel100, borderRadius: 12, height: 48, paddingHorizontal: 14, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.steel100, borderWidth: 1, borderColor: C.steel200 },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText: { fontSize: 13, fontWeight: '700', color: C.steel700 },
  chipTextActive: { color: C.white },

  weightRow: { flexDirection: 'row', gap: 12 },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  netText: { fontSize: 13, color: '#15803d' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.c700, borderRadius: 18, paddingVertical: 18, marginTop: 8, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  submitText: { color: C.white, fontSize: 16, fontWeight: '800' },
});
