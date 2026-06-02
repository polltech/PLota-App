import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, ImageBackground, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { mobileAPI, farmerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

// ── Static data ───────────────────────────────────────────────────────────────
const COUNTIES = [
  'Nairobi','Kiambu','Nakuru','Nyandarua','Nyeri','Muranga','Kisii',
  'Kericho','Bomet','Elgeyo-Marakwet','Uasin-Gishu','Trans-Nzoia','Meru',
  'Embu','Tharaka-Nithi','Kirinyaga','Machakos','Makueni','Other',
];
const LAND_USE = [
  { value: 'agroforestry', label: 'Agroforestry' },
  { value: 'monocrop', label: 'Monocrop' },
  { value: 'mixed_cropping', label: 'Mixed Cropping' },
  { value: 'forest_reserve', label: 'Forest Reserve' },
  { value: 'buffer_zone', label: 'Buffer Zone' },
];
const FARM_TYPES = [
  { value: 'owned', label: 'Owned' },
  { value: 'leased', label: 'Leased' },
  { value: 'communal', label: 'Communal' },
  { value: 'inherited', label: 'Inherited' },
];
const SOIL_TYPES = [
  { value: 'red_volcanic', label: 'Red Volcanic' },
  { value: 'loam', label: 'Loam' },
  { value: 'clay', label: 'Clay' },
  { value: 'sandy_loam', label: 'Sandy Loam' },
  { value: 'black_cotton', label: 'Black Cotton' },
];
const TERRAIN_OPTIONS = [
  { value: 'flat', label: 'Flat' },
  { value: 'gentle', label: 'Gentle Slope' },
  { value: 'steep', label: 'Steep' },
  { value: 'undulating', label: 'Undulating' },
];
const COFFEE_VARIETIES = ['SL28','SL34','Ruiru 11','Batian','K7','Blue Mountain','Robusta','Other'];
const FARM_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'rehabilitating', label: 'Rehabilitating' },
  { value: 'abandoned', label: 'Abandoned' },
];
const PLANTING_METHODS = [
  { value: 'monoculture', label: 'Monoculture' },
  { value: 'intercropped', label: 'Intercropped' },
  { value: 'agroforestry', label: 'Agroforestry' },
];
const IRRIGATION_TYPES = [
  { value: 'drip', label: 'Drip' },
  { value: 'furrow', label: 'Furrow' },
  { value: 'rain_fed', label: 'Rain-fed' },
];
const OTHER_CROPS = ['Maize','Banana','Beans','Vegetables','Tea','Avocado','Other'];
const LIVESTOCK_TYPES = ['Cattle','Goats','Poultry','Sheep','Pigs'];
const TREE_SPECIES = ['Grevillea','Macadamia','Eucalyptus','Indigenous','Avocado','Other'];
const TREE_REASONS = ['Shade','Windbreak','Timber','Soil health','Compliance','Income'];
const CLEARING_REASONS = [
  { value: 'expanding_farmland', label: 'Expanding Farmland' },
  { value: 'disease', label: 'Disease' },
  { value: 'construction', label: 'Construction' },
  { value: 'other', label: 'Other' },
];
const CANOPY_COVER = [
  { value: 'none', label: 'None (0%)' },
  { value: 'less_than_10', label: '< 10%' },
  { value: '10_to_30', label: '10–30%' },
  { value: 'more_than_30', label: '> 30%' },
];
const CERTIFICATIONS = ['Fairtrade','Rainforest Alliance','Organic','UTZ','4C','None'];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['Farmer', 'Land & Farm', 'Coffee', 'Compliance', 'Consent', 'Advanced'];

const INTERCROP_SPECIES = ['Avocado','Macadamia','Banana','Tea','Citrus','Other'];
const PREVIOUS_LAND_USE = [
  { value: 'Forest', label: 'Forest' },
  { value: 'Pasture', label: 'Pasture' },
  { value: 'Cropland', label: 'Cropland' },
  { value: 'Other', label: 'Other' },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <View style={s.fieldWrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}{required && <Text style={s.req}> *</Text>}</Text>
      </View>
      {children}
      {hint ? <Text style={s.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function Input({ error, ...props }) {
  return (
    <TextInput
      style={[s.input, error && s.inputError]}
      placeholderTextColor={C.subtle}
      {...props}
    />
  );
}

function ChipGroup({ options, value, onChange, multi }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const v = opt.value ?? opt;
        const label = opt.label ?? opt;
        const isActive = multi ? selected.includes(v) : selected === v;
        return (
          <TouchableOpacity
            key={v}
            style={[s.chip, isActive && s.chipActive]}
            onPress={() => {
              if (multi) {
                onChange(isActive ? selected.filter(x => x !== v) : [...selected, v]);
              } else {
                onChange(isActive ? '' : v);
              }
            }}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, isActive && s.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function YesNo({ value, onChange }) {
  return (
    <View style={s.yesNoRow}>
      <TouchableOpacity
        style={[s.yesNoBtn, value === true && s.yesNoBtnActive]}
        onPress={() => onChange(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.yesNoText, value === true && s.yesNoTextActive]}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.yesNoBtn, value === false && s.yesNoBtnActive]}
        onPress={() => onChange(false)}
        activeOpacity={0.8}
      >
        <Text style={[s.yesNoText, value === false && s.yesNoTextActive]}>No</Text>
      </TouchableOpacity>
    </View>
  );
}

function PreviewRow({ label, value }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <View style={s.previewRow}>
      <Text style={s.previewLabel}>{label}</Text>
      <Text style={s.previewValue}>{display}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AddFarmScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);

  // ── Step 1: Farmer Details — pre-filled from registration ─────────────────
  const [firstName,    setFirstName]    = useState(user?.first_name  || '');
  const [lastName,     setLastName]     = useState(user?.last_name   || '');
  const [phone,        setPhone]        = useState(user?.phone       || '');
  const [nationalId,   setNationalId]   = useState(user?.national_id || '');
  const [gender,       setGender]       = useState(user?.gender      || '');
  const [dob,          setDob]          = useState(user?.date_of_birth ? String(user.date_of_birth).split('T')[0] : '');
  const [county,       setCounty]       = useState(user?.county      || '');
  const [subCounty,    setSubCounty]    = useState(user?.sub_county  || '');
  const [ward,         setWard]         = useState(user?.ward        || '');
  const [inCoop,       setInCoop]       = useState(user?.cooperative_name ? true : null);
  const [coopName,     setCoopName]     = useState(user?.cooperative_name || '');
  const [coopMemberNo, setCoopMemberNo] = useState(user?.cooperative_member_no || user?.coop_member_no || '');
  const [dataConsent,  setDataConsent]  = useState(false);

  // Fetch full profile on mount to fill any fields not in the auth token
  useEffect(() => {
    farmerAPI.getProfile().then(res => {
      const p = res.data;
      if (!firstName && p.first_name)             setFirstName(p.first_name);
      if (!lastName  && p.last_name)              setLastName(p.last_name);
      if (!phone     && p.phone)                  setPhone(p.phone);
      if (!nationalId && p.national_id)           setNationalId(p.national_id);
      if (!gender    && p.gender)                 setGender(p.gender);
      if (!dob       && p.date_of_birth)          setDob(String(p.date_of_birth).split('T')[0]);
      if (!county    && p.county)                 setCounty(p.county);
      if (!subCounty && p.sub_county)             setSubCounty(p.sub_county);
      if (!ward      && p.ward)                   setWard(p.ward);
      if (!coopName  && p.cooperative_name) {
        setCoopName(p.cooperative_name);
        setInCoop(true);
      }
      if (!coopMemberNo && (p.cooperative_member_no || p.coop_member_no))
        setCoopMemberNo(p.cooperative_member_no || p.coop_member_no);
    }).catch(() => {});
  }, []);

  // ── Step 2: Land & Farm ────────────────────────────────────────────────────
  const [farmName,        setFarmName]        = useState('');
  const [farmCode,        setFarmCode]        = useState('');
  const [farmType,        setFarmType]        = useState('');
  const [landRegNumber,   setLandRegNumber]   = useState('');
  const [totalArea,       setTotalArea]       = useState('');
  const [altitude,        setAltitude]        = useState('');
  const [landUse,         setLandUse]         = useState('agroforestry');
  const [soilType,        setSoilType]        = useState('');
  const [terrain,         setTerrain]         = useState('');

  // ── Step 3: Coffee ─────────────────────────────────────────────────────────
  const [varieties,       setVarieties]       = useState([]);
  const [yearPlanted,     setYearPlanted]     = useState('');
  const [coffeeTrees,     setCoffeeTrees]     = useState('');
  const [farmStatus,      setFarmStatus]      = useState('active');
  const [plantingMethod,  setPlantingMethod]  = useState('');
  const [irrigationUsed,  setIrrigationUsed]  = useState(null);
  const [irrigationType,  setIrrigationType]  = useState('');
  const [annualYield,     setAnnualYield]     = useState('');

  // ── Step 4: Sustainability Declarations ────────────────────────────────────
  const [mixedFarming,      setMixedFarming]      = useState(null);
  const [otherCrops,        setOtherCrops]        = useState([]);
  const [livestock,         setLivestock]         = useState(null);
  const [livestockTypes,    setLivestockTypes]    = useState([]);
  const [cropRotation,      setCropRotation]      = useState(null);
  const [treesPlanted,      setTreesPlanted]      = useState(null);
  const [treeSpecies,       setTreeSpecies]       = useState([]);
  const [treesPlantedCount, setTreesPlantedCount] = useState('');
  const [treePlantReasons,  setTreePlantReasons]  = useState([]);
  const [treesCleared,      setTreesCleared]      = useState(null);
  const [clearingReason,    setClearingReason]    = useState('');
  const [canopyCover,       setCanopyCover]       = useState('');

  // ── Step 5: Consent & Certs ────────────────────────────────────────────────
  const [satelliteConsent,  setSatelliteConsent]  = useState(false);
  const [historicalConsent, setHistoricalConsent] = useState(false);
  const [certifications,    setCertifications]    = useState([]);
  const [prevViolations,    setPrevViolations]    = useState(null);
  const [violationDetails,  setViolationDetails]  = useState('');
  const [notes,             setNotes]             = useState('');

  // ── Step 6: Advanced (optional) ──────────────────────────────────────────
  const [intercroppedSpecies, setIntercroppedSpecies] = useState([]);
  const [shadeTrees,          setShadeTrees]          = useState(null);
  const [shadeCanopy,         setShadeCanopy]         = useState('');
  const [agroforestryYear,    setAgroforestryYear]    = useState('');
  const [lastPruning,         setLastPruning]         = useState('');
  const [lastHarvesting,      setLastHarvesting]      = useState('');
  const [recentPlanting,      setRecentPlanting]      = useState('');
  const [farmEstYear,         setFarmEstYear]         = useState('');
  const [previousLandUse,     setPreviousLandUse]     = useState('');
  const [ngoSupport,          setNgoSupport]          = useState('');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [touched,  setTouched]  = useState(false);
  const [created,  setCreated]  = useState(null);

  // ── Validation ─────────────────────────────────────────────────────────────
  const stepValid = [
    !!firstName.trim() && !!phone.trim() && !!county.trim() && dataConsent,  // step 0
    !!farmName.trim() && !!totalArea,                                         // step 1
    varieties.length > 0,                                                     // step 2
    canopyCover !== '',                                                        // step 3
    satelliteConsent && historicalConsent,                                    // step 4
    true,                                                                     // step 5 (advanced, all optional)
  ];

  const handleNext = () => {
    setTouched(true);
    if (!stepValid[step]) return;
    setTouched(false);
    setError(null);
    setStep(s => s + 1);
  };

  const isLastStep = step === STEPS.length - 1;

  const handleBack = () => {
    setError(null);
    setTouched(false);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!stepValid[4] || !stepValid[5]) {
      setError('Please confirm both satellite consent checkboxes.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected || net.isInternetReachable === false) {
        setError('No internet connection. Connect and try again.');
        setLoading(false);
        return;
      }

      const res = await mobileAPI.createFarm({
        // Step 1
        farmer_first_name:    firstName.trim() || null,
        farmer_last_name:     lastName.trim() || null,
        farmer_phone:         phone.trim() || null,
        national_id:          nationalId.trim() || null,
        gender:               gender || null,
        date_of_birth:        dob.trim() || null,
        county:               county.trim(),
        sub_county:           subCounty.trim() || null,
        ward:                 ward.trim() || null,
        cooperative_name:     inCoop ? coopName.trim() || null : null,
        cooperative_member_no: inCoop && coopMemberNo.trim() ? coopMemberNo.trim() : null,
        data_consent:         dataConsent,
        // Step 2
        farm_name:         farmName.trim(),
        farm_code:         farmCode.trim() || null,
        farm_type:         farmType || null,
        land_reg_number:   landRegNumber.trim() || null,
        total_area_hectares: totalArea ? parseFloat(totalArea) : null,
        altitude_m:        altitude ? parseFloat(altitude) : null,
        land_use_type:     landUse,
        soil_type:         soilType || null,
        terrain:           terrain || null,
        // Step 3
        coffee_varieties:  varieties.length > 0 ? varieties : null,
        year_coffee_planted: yearPlanted ? parseInt(yearPlanted) : null,
        coffee_trees:      coffeeTrees ? parseInt(coffeeTrees) : null,
        farm_status:       farmStatus || null,
        planting_method:   plantingMethod || null,
        irrigation_used:   irrigationUsed,
        irrigation_type:   irrigationUsed ? irrigationType || null : null,
        average_annual_production_kg: annualYield ? parseFloat(annualYield) : null,
        // Step 4
        mixed_farming:     mixedFarming,
        other_crops:       mixedFarming ? otherCrops : null,
        livestock:         mixedFarming ? livestock : null,
        livestock_types:   mixedFarming && livestock ? livestockTypes : null,
        crop_rotation:     mixedFarming ? cropRotation : null,
        trees_planted_last_5y:  treesPlanted,
        tree_species:      treesPlanted ? treeSpecies : null,
        trees_planted_count: treesPlanted && treesPlantedCount ? parseInt(treesPlantedCount) : null,
        tree_planting_reasons: treesPlanted ? treePlantReasons : null,
        trees_cleared_last_5y: treesCleared,
        reason_for_clearing:   treesCleared ? clearingReason || null : null,
        current_canopy_cover:  canopyCover || null,
        // Step 5
        satellite_consent:          satelliteConsent,
        historical_imagery_consent: historicalConsent,
        certifications:    certifications.length > 0 ? certifications : null,
        previous_violations: prevViolations,
        violation_details:  prevViolations ? violationDetails.trim() || null : null,
        notes:             notes.trim() || null,
        // Step 6 — Advanced (all optional)
        intercropped_species:  intercroppedSpecies.length > 0 ? intercroppedSpecies : null,
        shade_trees:           shadeTrees,
        shade_canopy_percent:  shadeTrees && shadeCanopy ? parseInt(shadeCanopy) : null,
        agroforestry_start_year: agroforestryYear ? parseInt(agroforestryYear) : null,
        last_pruning_date:     lastPruning.trim() || null,
        last_harvesting_date:  lastHarvesting.trim() || null,
        recent_planting:       recentPlanting.trim() || null,
        farm_established_year: farmEstYear ? parseInt(farmEstYear) : null,
        previous_land_use:     previousLandUse || null,
        ngo_support:           ngoSupport.trim() || null,
      });

      setCreated(res.data);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to add farm.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureBoundary = () => {
    navigation.navigate('WalkBoundary', {
      farmId: created.farm_id || created.id,
      farm: {
        id: created.farm_id || created.id,
        farm_code: created.farm_code,
        farm_name: created.farm_name,
        status: 'admin_approved',
      },
    });
  };

  // ── Success view ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
          style={s.bgImage}
        >
          <View style={s.overlay} />
          <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={s.topBar}>
                <View style={{ width: 60 }} />
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                <View style={s.successBadge}>
                  <Text style={s.successBadgeText}>✓ Farm Registered</Text>
                </View>
                <Text style={s.title}>{created.farm_name}</Text>
                <Text style={s.previewSubtitle}>Farm registered and ready for boundary capture</Text>

                <View style={s.divider} />
                <Text style={s.previewSection}>Farmer</Text>
                <PreviewRow label="Name"        value={[created.farmer_first_name, created.farmer_last_name].filter(Boolean).join(' ') || created.farmer} />
                <PreviewRow label="Phone"       value={created.farmer_phone} />
                <PreviewRow label="National ID" value={created.national_id} />
                <PreviewRow label="Cooperative" value={created.cooperative_name || created.cooperative} />

                <View style={s.divider} />
                <Text style={s.previewSection}>Farm</Text>
                <PreviewRow label="Farm Code"   value={created.farm_code} />
                <PreviewRow label="County"      value={created.county} />
                <PreviewRow label="Sub-County"  value={created.sub_county} />
                <PreviewRow label="Land Use"    value={created.land_use_type} />
                <PreviewRow label="Total Area"  value={created.total_area_hectares ? `${created.total_area_hectares} ha` : null} />
                <PreviewRow label="Soil Type"   value={created.soil_type} />
                <PreviewRow label="Varieties"   value={created.coffee_varieties} />

                <View style={s.divider} />
                <Text style={s.previewSection}>Compliance</Text>
                <PreviewRow label="Certifications"  value={created.certifications} />
                <PreviewRow label="Satellite Consent" value={created.satellite_consent ? 'Granted' : 'Not granted'} />
                {created.trees_cleared_last_5y && (
                  <View style={s.riskBadge}>
                    <Text style={s.riskText}>⚠ Trees cleared declared — satellite review will be triggered</Text>
                  </View>
                )}

                <View style={s.divider} />
                <View style={s.codeBox}>
                  <Text style={s.codeBoxLabel}>Farm code for boundary capture</Text>
                  <Text style={s.codeBoxCode}>{created.farm_code}</Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleCaptureBoundary} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>Capture Boundary Now →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('FarmsList')} activeOpacity={0.7}>
                  <Text style={s.secondaryBtnText}>Done — Capture Later</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Top bar */}
              <View style={s.topBar}>
                <TouchableOpacity onPress={step === 0 ? () => navigation.goBack() : handleBack} style={s.backBtn}>
                  <Text style={s.backText}>← {step === 0 ? 'Back' : STEPS[step - 1]}</Text>
                </TouchableOpacity>
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                <Text style={s.title}>Register Farm</Text>

                {/* Step progress */}
                <View style={s.progressRow}>
                  {STEPS.map((label, i) => {
                    const done = i < step;
                    const active = i === step;
                    return (
                      <View key={label} style={s.progressItem}>
                        <View style={[s.progressDot, active && s.progressDotActive, done && s.progressDotDone]}>
                          <Text style={[s.progressDotText, (active || done) && s.progressDotTextLight]}>
                            {done ? '✓' : i + 1}
                          </Text>
                        </View>
                        <Text style={[s.progressLabel, active && s.progressLabelActive]} numberOfLines={1}>{label}</Text>
                      </View>
                    );
                  })}
                </View>

                {/* ── STEP 1: FARMER DETAILS ─────────────────────────────── */}
                {step === 0 && (
                  <>
                    <SectionHeader icon="👤" title="Farmer's Personal Details" />

                    <View style={s.row}>
                      <View style={s.half}>
                        <Field label="First Name" required>
                          <Input value={firstName} onChangeText={setFirstName} placeholder="e.g. James"
                            error={touched && !firstName.trim()} returnKeyType="next" />
                          {touched && !firstName.trim() && <Text style={s.errText}>Required</Text>}
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={s.half}>
                        <Field label="Last Name">
                          <Input value={lastName} onChangeText={setLastName} placeholder="e.g. Kamau" returnKeyType="next" />
                        </Field>
                      </View>
                    </View>

                    <Field label="Phone Number" required>
                      <Input value={phone} onChangeText={setPhone} placeholder="+254700000000"
                        keyboardType="phone-pad" error={touched && !phone.trim()} returnKeyType="next" />
                      {touched && !phone.trim() && <Text style={s.errText}>Required</Text>}
                    </Field>

                    <Field label="National ID">
                      <Input value={nationalId} onChangeText={setNationalId} placeholder="e.g. 12345678"
                        keyboardType="numeric" returnKeyType="next" />
                    </Field>

                    <Field label="Gender">
                      <ChipGroup options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                    </Field>

                    <Field label="Date of Birth" hint="Format: YYYY-MM-DD">
                      <Input value={dob} onChangeText={setDob} placeholder="e.g. 1980-06-15"
                        keyboardType="numbers-and-punctuation" returnKeyType="next" />
                    </Field>

                    <View style={s.subHeader}><Text style={s.subHeaderText}>📍 Address</Text></View>

                    <Field label="County" required>
                      <ChipGroup options={COUNTIES} value={county} onChange={setCounty} />
                      {touched && !county.trim() && <Text style={s.errText}>Required</Text>}
                    </Field>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Field label="Sub-County">
                          <Input value={subCounty} onChangeText={setSubCounty} placeholder="e.g. Mwea" returnKeyType="next" />
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={s.half}>
                        <Field label="Ward">
                          <Input value={ward} onChangeText={setWard} placeholder="e.g. Tebere" returnKeyType="next" />
                        </Field>
                      </View>
                    </View>

                    <View style={s.subHeader}><Text style={s.subHeaderText}>🤝 Cooperative Membership</Text></View>

                    <Field label="Member of a Cooperative?">
                      <YesNo value={inCoop} onChange={setInCoop} />
                    </Field>

                    {inCoop && (
                      <>
                        <Field label="Cooperative Name">
                          <Input value={coopName} onChangeText={setCoopName} placeholder="e.g. Mwea Coffee Coop" returnKeyType="next" />
                        </Field>
                        <Field label="Cooperative Membership No." hint="Your member number from the cooperative">
                          <Input value={coopMemberNo} onChangeText={setCoopMemberNo} placeholder="e.g. MCW-0042" returnKeyType="done" />
                        </Field>
                      </>
                    )}

                    <TouchableOpacity style={s.consentCard} onPress={() => setDataConsent(v => !v)} activeOpacity={0.8}>
                      <View style={[s.checkbox, dataConsent && s.checkboxChecked]}>
                        {dataConsent && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={s.consentText}>
                        <Text style={s.consentTitle}>I consent to data collection & processing *</Text>
                        <Text style={s.consentDesc}>Required to register and link this farm to the sustainability platform.</Text>
                      </View>
                    </TouchableOpacity>
                    {touched && !dataConsent && <Text style={s.errText}>Data consent is required</Text>}
                  </>
                )}

                {/* ── STEP 2: LAND & FARM ────────────────────────────────── */}
                {step === 1 && (
                  <>
                    <SectionHeader icon="🌱" title="Land & Farm Information" />

                    <Field label="Farm / Parcel Name" required>
                      <Input value={farmName} onChangeText={setFarmName} placeholder="e.g. Kibaki Coffee Farm"
                        error={touched && !farmName.trim()} returnKeyType="next" />
                      {touched && !farmName.trim() && <Text style={s.errText}>Required</Text>}
                    </Field>

                    <Field label="Farm Code" hint="Auto-generated if left blank">
                      <Input value={farmCode} onChangeText={t => setFarmCode(t.toUpperCase())}
                        placeholder="e.g. KIR-001" autoCapitalize="characters" returnKeyType="next" />
                    </Field>

                    <Field label="Farm / Land Type">
                      <ChipGroup options={FARM_TYPES} value={farmType} onChange={setFarmType} />
                    </Field>

                    <Field label="Land Registration Number" hint="Title deed or government-issued ID">
                      <Input value={landRegNumber} onChangeText={setLandRegNumber}
                        placeholder="e.g. KIRINYAGA/23456" returnKeyType="next" />
                    </Field>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Field label="Total Area (ha)" required>
                          <Input value={totalArea} onChangeText={setTotalArea} placeholder="e.g. 2.5"
                            keyboardType="decimal-pad" error={touched && !totalArea} returnKeyType="next" />
                          {touched && !totalArea && <Text style={s.errText}>Required</Text>}
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={s.half}>
                        <Field label="Altitude (m)">
                          <Input value={altitude} onChangeText={setAltitude} placeholder="e.g. 1600"
                            keyboardType="numeric" returnKeyType="next" />
                        </Field>
                      </View>
                    </View>

                    <Field label="Land Use Type">
                      <ChipGroup options={LAND_USE} value={landUse} onChange={setLandUse} />
                    </Field>

                    <Field label="Terrain / Slope">
                      <ChipGroup options={TERRAIN_OPTIONS} value={terrain} onChange={setTerrain} />
                    </Field>

                    <Field label="Soil Type">
                      <ChipGroup options={SOIL_TYPES} value={soilType} onChange={setSoilType} />
                    </Field>
                  </>
                )}

                {/* ── STEP 3: COFFEE FARMING ─────────────────────────────── */}
                {step === 2 && (
                  <>
                    <SectionHeader icon="☕" title="Coffee Farming Details" />

                    <Field label="Coffee Varieties" required hint="Select all that apply">
                      <ChipGroup options={COFFEE_VARIETIES} value={varieties} onChange={setVarieties} multi />
                      {touched && varieties.length === 0 && <Text style={s.errText}>Select at least one variety</Text>}
                    </Field>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Field label="Year First Planted" hint="Satellite baseline">
                          <Input value={yearPlanted} onChangeText={setYearPlanted} placeholder="e.g. 2010"
                            keyboardType="numeric" returnKeyType="next" />
                        </Field>
                      </View>
                      <View style={s.rowSpacer} />
                      <View style={s.half}>
                        <Field label="Coffee Trees">
                          <Input value={coffeeTrees} onChangeText={setCoffeeTrees} placeholder="e.g. 500"
                            keyboardType="numeric" returnKeyType="next" />
                        </Field>
                      </View>
                    </View>

                    <Field label="Farm Status">
                      <ChipGroup options={FARM_STATUS} value={farmStatus} onChange={setFarmStatus} />
                    </Field>

                    <Field label="Planting Method">
                      <ChipGroup options={PLANTING_METHODS} value={plantingMethod} onChange={setPlantingMethod} />
                    </Field>

                    <Field label="Irrigation Used?">
                      <YesNo value={irrigationUsed} onChange={setIrrigationUsed} />
                    </Field>

                    {irrigationUsed && (
                      <Field label="Irrigation Type">
                        <ChipGroup options={IRRIGATION_TYPES} value={irrigationType} onChange={setIrrigationType} />
                      </Field>
                    )}

                    <Field label="Avg Annual Yield (kg)">
                      <Input value={annualYield} onChangeText={setAnnualYield} placeholder="e.g. 800"
                        keyboardType="decimal-pad" returnKeyType="done" />
                    </Field>
                  </>
                )}

                {/* ── STEP 4: SUSTAINABILITY DECLARATIONS ──────────────────────────── */}
                {step === 3 && (
                  <>
                    <SectionHeader icon="⚠️" title="Sustainability Declarations" />
                    <Text style={s.eudrNote}>Your answers are required for sustainability compliance verification.</Text>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>🌾 Mixed Farming</Text>
                      <Field label="Do you practice mixed farming on this parcel?">
                        <YesNo value={mixedFarming} onChange={setMixedFarming} />
                      </Field>

                      {mixedFarming && (
                        <>
                          <Field label="Other Crops Grown" hint="Select all that apply">
                            <ChipGroup options={OTHER_CROPS} value={otherCrops} onChange={setOtherCrops} multi />
                          </Field>
                          <Field label="Livestock on Parcel?">
                            <YesNo value={livestock} onChange={setLivestock} />
                          </Field>
                          {livestock && (
                            <Field label="Livestock Types">
                              <ChipGroup options={LIVESTOCK_TYPES} value={livestockTypes} onChange={setLivestockTypes} multi />
                            </Field>
                          )}
                          <Field label="Crop Rotation Practiced?">
                            <YesNo value={cropRotation} onChange={setCropRotation} />
                          </Field>
                        </>
                      )}
                    </View>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>🌳 Tree Cover</Text>
                      <Field label="Trees planted in last 5 years?" hint="Triggers satellite cross-check">
                        <YesNo value={treesPlanted} onChange={setTreesPlanted} />
                      </Field>

                      {treesPlanted && (
                        <>
                          <Field label="Tree Species Planted">
                            <ChipGroup options={TREE_SPECIES} value={treeSpecies} onChange={setTreeSpecies} multi />
                          </Field>
                          <View style={s.row}>
                            <View style={s.half}>
                              <Field label="Number of Trees">
                                <Input value={treesPlantedCount} onChangeText={setTreesPlantedCount}
                                  placeholder="Approx." keyboardType="numeric" returnKeyType="next" />
                              </Field>
                            </View>
                          </View>
                          <Field label="Reason for Planting">
                            <ChipGroup options={TREE_REASONS} value={treePlantReasons} onChange={setTreePlantReasons} multi />
                          </Field>
                        </>
                      )}
                    </View>

                    <View style={[s.eudrSection, s.eudrHighRisk]}>
                      <Text style={s.eudrSectionTitle}>🔴 Land Stewardship Declaration</Text>
                      <Text style={s.riskNote}>Trees cleared in last 5 years? — Action Required</Text>
                      <Field label="Did you clear trees in the last 5 years?">
                        <YesNo value={treesCleared} onChange={setTreesCleared} />
                      </Field>
                      {treesCleared && (
                        <>
                          <View style={s.riskAlert}>
                            <Text style={s.riskAlertText}>⚠ Your answer will flag this farm for mandatory compliance review before approval.</Text>
                          </View>
                          <Field label="Reason for Clearing">
                            <ChipGroup options={CLEARING_REASONS} value={clearingReason} onChange={setClearingReason} />
                          </Field>
                        </>
                      )}
                    </View>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>🌿 Current Tree Canopy Cover</Text>
                      <Field label="Select canopy coverage" required>
                        <ChipGroup options={CANOPY_COVER} value={canopyCover} onChange={setCanopyCover} />
                        {touched && !canopyCover && <Text style={s.errText}>Required</Text>}
                      </Field>
                    </View>
                  </>
                )}

                {/* ── STEP 5: CONSENT & CERTIFICATIONS ───────────────────── */}
                {step === 4 && (
                  <>
                    <SectionHeader icon="🛰️" title="Satellite Consent" />

                    <TouchableOpacity style={s.consentCard} onPress={() => setSatelliteConsent(v => !v)} activeOpacity={0.8}>
                      <View style={[s.checkbox, satelliteConsent && s.checkboxChecked]}>
                        {satelliteConsent && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={s.consentText}>
                        <Text style={s.consentTitle}>I consent to Parcel Satellite Monitoring *</Text>
                        <Text style={s.consentDesc}>Required to proceed with sustainability compliance verification.</Text>
                      </View>
                    </TouchableOpacity>
                    {touched && !satelliteConsent && <Text style={s.errText}>Required</Text>}

                    <TouchableOpacity style={s.consentCard} onPress={() => setHistoricalConsent(v => !v)} activeOpacity={0.8}>
                      <View style={[s.checkbox, historicalConsent && s.checkboxChecked]}>
                        {historicalConsent && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <View style={s.consentText}>
                        <Text style={s.consentTitle}>I consent to Historical Imagery Analysis (2020–present) *</Text>
                        <Text style={s.consentDesc}>Aligns with sustainable farming deforestation baseline of December 31, 2020.</Text>
                      </View>
                    </TouchableOpacity>
                    {touched && !historicalConsent && <Text style={s.errText}>Required</Text>}

                    <SectionHeader icon="🏆" title="Certifications" />

                    <Field label="Existing Certifications" hint="Select all that apply">
                      <ChipGroup options={CERTIFICATIONS} value={certifications} onChange={setCertifications} multi />
                    </Field>

                    <Field label="Previously Flagged for Violations?">
                      <YesNo value={prevViolations} onChange={setPrevViolations} />
                    </Field>

                    {prevViolations && (
                      <Field label="Violation Details">
                        <TextInput
                          style={[s.input, s.textarea, { borderColor: '#dc2626' }]}
                          value={violationDetails}
                          onChangeText={setViolationDetails}
                          placeholder="Please describe the violations..."
                          placeholderTextColor={C.subtle}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                      </Field>
                    )}

                    <Field label="Additional Notes">
                      <TextInput
                        style={[s.input, s.textarea]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Any additional observations..."
                        placeholderTextColor={C.subtle}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </Field>
                  </>
                )}

                {/* ── STEP 6: ADVANCED (optional) ────────────────────────── */}
                {step === 5 && (
                  <>
                    <SectionHeader icon="🌿" title="Advanced Details" />
                    <Text style={s.eudrNote}>All fields on this step are optional but improve your compliance score.</Text>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>🌳 Agroforestry & Intercropping</Text>

                      <Field label="Intercropped Species" hint="Select all that apply">
                        <ChipGroup options={INTERCROP_SPECIES} value={intercroppedSpecies} onChange={setIntercroppedSpecies} multi />
                      </Field>

                      <Field label="Shade Trees Present?">
                        <YesNo value={shadeTrees} onChange={setShadeTrees} />
                      </Field>

                      {shadeTrees && (
                        <Field label="Shade Canopy (%)">
                          <Input value={shadeCanopy} onChangeText={setShadeCanopy}
                            placeholder="e.g. 30" keyboardType="numeric" returnKeyType="next" />
                        </Field>
                      )}

                      <Field label="Agroforestry Start Year">
                        <Input value={agroforestryYear} onChangeText={setAgroforestryYear}
                          placeholder="e.g. 2018" keyboardType="numeric" returnKeyType="done" />
                      </Field>
                    </View>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>📋 Practice Log</Text>

                      <View style={s.row}>
                        <View style={s.half}>
                          <Field label="Last Pruning Date" hint="YYYY-MM-DD">
                            <Input value={lastPruning} onChangeText={setLastPruning}
                              placeholder="2025-03-15" keyboardType="numbers-and-punctuation" returnKeyType="next" />
                          </Field>
                        </View>
                        <View style={s.rowSpacer} />
                        <View style={s.half}>
                          <Field label="Last Harvesting Date" hint="YYYY-MM-DD">
                            <Input value={lastHarvesting} onChangeText={setLastHarvesting}
                              placeholder="2025-01-10" keyboardType="numbers-and-punctuation" returnKeyType="next" />
                          </Field>
                        </View>
                      </View>

                      <Field label="Recent Planting Event" hint="What was planted and when">
                        <Input value={recentPlanting} onChangeText={setRecentPlanting}
                          placeholder="e.g. 50 Grevillea trees, March 2025" returnKeyType="done" />
                      </Field>
                    </View>

                    <View style={s.eudrSection}>
                      <Text style={s.eudrSectionTitle}>🏛 Farm History</Text>

                      <View style={s.row}>
                        <View style={s.half}>
                          <Field label="Year Farm Established">
                            <Input value={farmEstYear} onChangeText={setFarmEstYear}
                              placeholder="e.g. 1998" keyboardType="numeric" returnKeyType="next" />
                          </Field>
                        </View>
                      </View>

                      <Field label="Previous Land Use" hint="What was here before coffee?">
                        <ChipGroup options={PREVIOUS_LAND_USE} value={previousLandUse} onChange={setPreviousLandUse} />
                      </Field>

                      <Field label="NGO / Programme Support" hint="Name of programme and years active">
                        <Input value={ngoSupport} onChangeText={setNgoSupport}
                          placeholder="e.g. TechnoServe, 2020-2023" returnKeyType="done" />
                      </Field>
                    </View>
                  </>
                )}

                {error ? <Text style={s.globalError}>{error}</Text> : null}

                {/* Navigation buttons */}
                <View style={s.btnRow}>
                  {step > 0 && (
                    <TouchableOpacity style={s.outlineBtn} onPress={handleBack} activeOpacity={0.8}>
                      <Text style={s.outlineBtnText}>← Back</Text>
                    </TouchableOpacity>
                  )}
                  {!isLastStep ? (
                    <TouchableOpacity
                      style={[s.primaryBtn, { flex: step > 0 ? 2 : 1 }]}
                      onPress={handleNext}
                      activeOpacity={0.8}
                    >
                      <Text style={s.primaryBtnText}>Next: {STEPS[step + 1]} →</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[s.primaryBtn, { flex: 2 }, loading && s.btnDisabled]}
                      onPress={handleSubmit}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading
                        ? <ActivityIndicator color={C.white} />
                        : <Text style={s.primaryBtnText}>Register Farm ✓</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={s.hint}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage:   { flex: 1, width: '100%', height: '100%' },
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.50)' },
  safe:      { flex: 1 },
  flex:      { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 10 },

  topBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 16 },
  backBtn:  { padding: 8, width: 60 },
  backText: { color: C.white, fontSize: 16, fontWeight: '700' },
  appTitle: { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 2 },

  card: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 12, marginBottom: 20 },

  title: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 },

  // Progress
  progressRow:   { flexDirection: 'row', marginBottom: 24, gap: 4 },
  progressItem:  { flex: 1, alignItems: 'center', gap: 4 },
  progressDot:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#E8DDD5', alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: C.c700 },
  progressDotDone:   { backgroundColor: '#22c55e' },
  progressDotText:   { fontSize: 11, fontWeight: '800', color: '#9E9E9E' },
  progressDotTextLight: { color: '#fff' },
  progressLabel: { fontSize: 9, fontWeight: '700', color: '#9E9E9E', textAlign: 'center' },
  progressLabelActive: { color: C.c700 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: 4 },
  sectionIcon:   { fontSize: 20 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: C.c800 },
  subHeader:     { marginTop: 8, marginBottom: 4 },
  subHeaderText: { fontSize: 13, fontWeight: '700', color: C.c700 },

  row: { flexDirection: 'row' },
  half: { flex: 1 },
  rowSpacer: { width: 12 },

  fieldWrap: { marginBottom: 18 },
  labelRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1.2 },
  req:   { color: '#dc2626' },
  eudrBadge: { fontSize: 9, fontWeight: '800', color: '#dc2626', backgroundColor: '#fef2f2', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  input: { backgroundColor: '#F5F0EC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8DDD5', paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1a1a1a', fontWeight: '600' },
  textarea: { height: 80, paddingTop: 12 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#FFF5F5' },
  errText:    { fontSize: 12, color: '#dc2626', fontWeight: '700', marginTop: 6, marginLeft: 2 },
  fieldHint:  { fontSize: 11, color: '#9E9E9E', marginTop: 6, marginLeft: 2, fontStyle: 'italic' },

  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#E8DDD5', backgroundColor: '#F5F0EC' },
  chipActive:     { backgroundColor: C.c700, borderColor: C.c700 },
  chipText:       { fontSize: 12, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  yesNoRow:       { flexDirection: 'row', gap: 10 },
  yesNoBtn:       { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#E8DDD5', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F0EC' },
  yesNoBtnActive: { backgroundColor: C.c700, borderColor: C.c700 },
  yesNoText:      { fontSize: 14, fontWeight: '700', color: C.c700 },
  yesNoTextActive:{ color: C.white },

  // EUDR sections
  eudrNote: { fontSize: 13, color: '#9a3412', backgroundColor: '#fff7ed', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#fed7aa' },
  eudrSection: { backgroundColor: '#fafaf9', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e8e0da' },
  eudrSectionTitle: { fontSize: 13, fontWeight: '800', color: C.c800, marginBottom: 12 },
  eudrHighRisk: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  riskNote: { fontSize: 12, color: '#dc2626', fontWeight: '700', marginBottom: 10 },
  riskAlert: { backgroundColor: '#dc2626', borderRadius: 10, padding: 10, marginBottom: 12 },
  riskAlertText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Consent
  consentCard:   { flexDirection: 'row', backgroundColor: '#F5F0EC', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: '#E8DDD5', gap: 12, alignItems: 'flex-start' },
  checkbox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: C.c700, borderColor: C.c700 },
  checkmark:     { color: C.white, fontSize: 14, fontWeight: '900' },
  consentText:   { flex: 1 },
  consentTitle:  { fontSize: 13, fontWeight: '800', color: C.c800, marginBottom: 4 },
  consentDesc:   { fontSize: 12, color: C.muted, lineHeight: 16 },

  globalError: { fontSize: 13, color: '#dc2626', fontWeight: '700', marginBottom: 14, backgroundColor: '#FFF5F5', padding: 12, borderRadius: 12 },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryBtn: { flex: 1, backgroundColor: C.c700, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8 },
  btnDisabled: { backgroundColor: '#D1C4BC', shadowOpacity: 0 },
  primaryBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  outlineBtn: { flex: 1, height: 60, borderRadius: 18, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 15, fontWeight: '800', color: C.steel700 },
  hint: { fontSize: 12, color: '#9E9E9E', textAlign: 'center', marginTop: 12, fontWeight: '500' },

  // Success
  successBadge: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14, borderWidth: 1, borderColor: '#A5D6A7' },
  successBadgeText: { fontSize: 13, fontWeight: '800', color: '#2E7D32' },
  previewSubtitle: { fontSize: 13, color: '#6B6B6B', marginBottom: 18 },
  previewSection: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 6 },
  divider: { height: 1, backgroundColor: '#F0E8E2', marginVertical: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F5F0EC' },
  previewLabel: { fontSize: 13, color: '#9E9E9E', fontWeight: '600', flex: 1 },
  previewValue: { fontSize: 13, color: '#1a1a1a', fontWeight: '700', flex: 2, textAlign: 'right' },
  riskBadge: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginTop: 8, borderWidth: 1, borderColor: '#fecaca' },
  riskText:  { fontSize: 12, color: '#dc2626', fontWeight: '700' },
  codeBox:   { backgroundColor: '#F5F0EC', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: '#E8DDD5' },
  codeBoxLabel: { fontSize: 11, color: '#9E9E9E', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeBoxCode:  { fontSize: 26, fontWeight: '900', color: C.c700, letterSpacing: 3 },
  secondaryBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E8DDD5', marginTop: 10 },
  secondaryBtnText: { color: '#6B6B6B', fontSize: 15, fontWeight: '700' },
});
