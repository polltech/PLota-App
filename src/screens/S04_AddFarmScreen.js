import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { mobileAPI, farmerAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { divisionsForCountry } from '../data/adminDivisions';

const _UNUSED2 = {
  'Mombasa':        ['Changamwe','Jomvu','Kisauni','Likoni','Mvita','Nyali'],
  'Kwale':          ['Kinango','Lungalunga','Matuga','Msambweni'],
  'Kilifi':         ['Ganze','Kaloleni','Kilifi North','Kilifi South','Magarini','Malindi','Rabai'],
  'Tana River':     ['Bura','Garsen','Galole'],
  'Lamu':           ['Lamu East','Lamu West'],
  'Taita-Taveta':   ['Mwatate','Taveta','Voi','Wundanyi'],
  'Garissa':        ['Balambala','Dadaab','Fafi','Garissa Township','Hulugho','Ijara','Lagdera'],
  'Wajir':          ['Eldas','Tarbaj','Wajir East','Wajir North','Wajir South','Wajir West'],
  'Mandera':        ['Banissa','Lafey','Mandera East','Mandera North','Mandera South','Mandera West'],
  'Marsabit':       ['Laisamis','Moyale','North Horr','Saku'],
  'Isiolo':         ['Garbatulla','Isiolo','Merti'],
  'Meru':           ['Buuri','Igembe Central','Igembe North','Igembe South','Imenti Central','Imenti North','Imenti South','Tigania East','Tigania West'],
  'Tharaka-Nithi':  ['Chuka/Igambang\'ombe','Maara','Tharaka North','Tharaka South'],
  'Embu':           ['Manyatta','Mbeere North','Mbeere South','Runyenjes'],
  'Kitui':          ['Kitui Central','Kitui East','Kitui Rural','Kitui South','Kitui West','Mwingi Central','Mwingi North','Mwingi West'],
  'Machakos':       ['Kathiani','Machakos Town','Masinga','Matungulu','Mavoko','Mwala','Yatta'],
  'Makueni':        ['Kaiti','Kibwezi East','Kibwezi West','Kilome','Makueni','Mbooni'],
  'Nyandarua':      ['Kipipiri','Kinangop','Ndaragwa','Ol Kalou','Ol Joro Orok'],
  'Nyeri':          ['Kieni East','Kieni West','Mathira East','Mathira West','Mukurwe-ini','Nyeri Town','Othaya','Tetu'],
  'Kirinyaga':      ['Gichugu','Kirinyaga Central','Mwea East','Mwea West','Ndia'],
  'Murang\'a':      ['Gatanga','Kahuro','Kandara','Kangema','Kigumo','Kiharu','Mathioya','Murang\'a South'],
  'Kiambu':         ['Gatundu North','Gatundu South','Githunguri','Juja','Kabete','Kiambaa','Kiambu','Kikuyu','Lari','Limuru','Ruiru','Thika Town'],
  'Turkana':        ['Kibish','Loima','Turkana Central','Turkana East','Turkana North','Turkana South','Turkana West'],
  'West Pokot':     ['Central Pokot','Kacheliba','Pokot North','Pokot South'],
  'Samburu':        ['Samburu Central','Samburu East','Samburu North'],
  'Trans-Nzoia':    ['Cherangany','Endebess','Kiminini','Kwanza','Trans-Nzoia East'],
  'Uasin Gishu':    ['Ainabkoi','Kapseret','Kesses','Moiben','Soy','Turbo'],
  'Elgeyo-Marakwet':['Keiyo North','Keiyo South','Marakwet East','Marakwet West'],
  'Nandi':          ['Aldai','Chesumei','Emgwen','Mosop','Nandi Hills','Tindiret'],
  'Baringo':        ['Baringo Central','Baringo North','Baringo South','Eldama Ravine','Mogotio','Tiaty'],
  'Laikipia':       ['Laikipia Central','Laikipia East','Laikipia North','Laikipia West','Nyahururu'],
  'Nakuru':         ['Bahati','Gilgil','Kuresoi North','Kuresoi South','Molo','Naivasha','Nakuru Town East','Nakuru Town West','Njoro','Rongai','Subukia'],
  'Narok':          ['Narok East','Narok North','Narok South','Narok West','Transmara East','Transmara West'],
  'Kajiado':        ['Kajiado Central','Kajiado East','Kajiado North','Kajiado South','Kajiado West'],
  'Kericho':        ['Ainamoi','Belgut','Bureti','Kipkelion East','Kipkelion West','Soin/Sigowet'],
  'Bomet':          ['Bomet Central','Bomet East','Chepalungu','Konoin','Sotik'],
  'Kakamega':       ['Butere','Ikolomani','Khwisero','Likuyani','Lugari','Lurambi','Malava','Matungu','Mumias East','Mumias West','Navakholo','Shinyalu'],
  'Vihiga':         ['Emuhaya','Hamisi','Luanda','Sabatia','Vihiga'],
  'Bungoma':        ['Bumula','Kabuchai','Kanduyi','Kimilili','Mt Elgon','Sirisia','Tongaren','Webuye East','Webuye West'],
  'Busia':          ['Budalang\'i','Butula','Funyula','Nambale','Samia','Teso North','Teso South'],
  'Siaya':          ['Alego Usonga','Bondo','Gem','Rarieda','Ugenya','Ugunja'],
  'Kisumu':         ['Kisumu Central','Kisumu East','Kisumu West','Muhoroni','Nyakach','Nyando','Seme'],
  'Homa Bay':       ['Kabondo Kasipul','Karachuonyo','Kasipul','Mbita','Ndhiwa','Rangwe','Suba North','Suba South'],
  'Migori':         ['Awendo','Kuria East','Kuria West','Mabera','Ntimaru','Rongo','Suna East','Suna West','Uriri'],
  'Kisii':          ['Bomachoge Borabu','Bomachoge Chache','Bonchari','Kitutu Chache North','Kitutu Chache South','Kitutu Masaba','Nyaribari Chache','Nyaribari Masaba','South Mugirango'],
  'Nyamira':        ['Borabu','Manga','Masaba North','Nyamira North','Nyamira South'],
  'Nairobi':        ['Dagoretti North','Dagoretti South','Embakasi Central','Embakasi East','Embakasi North','Embakasi South','Embakasi West','Kamukunji','Kasarani','Kibra','Lang\'ata','Makadara','Mathare','Roysambu','Ruaraka','Starehe','Westlands'],
};

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
const INTERCROP_SPECIES = ['Avocado','Macadamia','Banana','Tea','Citrus','Other'];
const PREVIOUS_LAND_USE = [
  { value: 'Forest', label: 'Forest' },
  { value: 'Pasture', label: 'Pasture' },
  { value: 'Cropland', label: 'Cropland' },
  { value: 'Other', label: 'Other' },
];
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STEPS = [
  { key: 'farmer',   label: 'Farmer',    icon: 'person-outline' },
  { key: 'land',     label: 'Land',      icon: 'leaf-outline' },
  { key: 'coffee',   label: 'Coffee',    icon: 'cafe-outline' },
  { key: 'capture',  label: 'Capture',   icon: 'location-outline' },
  { key: 'advanced', label: 'Advanced',  icon: 'options-outline' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, required, hint, error, children }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}{required && <Text style={f.req}> *</Text>}</Text>
      {children}
      {error ? <Text style={f.errText}>{error}</Text> : hint ? <Text style={f.hint}>{hint}</Text> : null}
    </View>
  );
}

function FInput({ error, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[f.input, focused && f.inputFocused, error && f.inputError, style]}
      placeholderTextColor={C.subtle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

function ChipGroup({ options, value, onChange, multi }) {
  const selected = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <View style={f.chipRow}>
      {options.map((opt) => {
        const v = opt.value ?? opt;
        const label = opt.label ?? opt;
        const isActive = multi ? selected.includes(v) : selected === v;
        return (
          <TouchableOpacity
            key={v}
            style={[f.chip, isActive && f.chipActive]}
            onPress={() => {
              if (multi) onChange(isActive ? selected.filter(x => x !== v) : [...selected, v]);
              else onChange(isActive ? '' : v);
            }}
            activeOpacity={0.75}
          >
            <Text style={[f.chipText, isActive && f.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function YesNo({ value, onChange }) {
  return (
    <View style={f.yesNoRow}>
      {[{ v: true, label: 'Yes' }, { v: false, label: 'No' }].map(({ v, label }) => (
        <TouchableOpacity
          key={label}
          style={[f.yesNoBtn, value === v && f.yesNoBtnActive]}
          onPress={() => onChange(v)}
          activeOpacity={0.8}
        >
          {value === v && <Ionicons name="checkmark" size={14} color={C.white} />}
          <Text style={[f.yesNoText, value === v && f.yesNoTextActive]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Dropdown({ value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[f.dropdown, disabled && { opacity: 0.45 }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[f.dropdownText, !value && { color: C.subtle }]} numberOfLines={1}>
          {value || placeholder || 'Select…'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.muted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={f.sheetOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={f.sheet}>
            <View style={f.sheetHandle} />
            <Text style={f.sheetTitle}>{placeholder || 'Select'}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[f.sheetItem, item === value && f.sheetItemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[f.sheetItemText, item === value && f.sheetItemTextActive]}>{item}</Text>
                  {item === value && <Ionicons name="checkmark" size={16} color={C.c700} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function PreviewRow({ label, value }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(', ') : String(value);
  return (
    <View style={f.previewRow}>
      <Text style={f.previewLabel}>{label}</Text>
      <Text style={f.previewValue}>{display}</Text>
    </View>
  );
}


// ── Step wizard ───────────────────────────────────────────────────────────────
function StepWizard({ current, total }) {
  return (
    <View style={wz.row}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
            <View style={wz.stepItem}>
              <View style={[wz.circle, active && wz.circleActive, done && wz.circleDone]}>
                {done
                  ? <Ionicons name="checkmark" size={13} color={C.white} />
                  : <Text style={[wz.circleText, (active || done) && wz.circleTextLight]}>{i + 1}</Text>
                }
              </View>
              <Text style={[wz.stepLabel, active && wz.stepLabelActive, done && wz.stepLabelDone]} numberOfLines={1}>
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[wz.connector, done && wz.connectorDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AddFarmScreen({ route }) {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();

  // Capture-on-behalf params (set when navigated from SelectFarmerForCaptureScreen or FarmerDetailScreen)
  const targetFarmerId   = route?.params?.targetFarmerId || null;
  const targetFarmerName = route?.params?.targetFarmerName || null;
  const targetMemberNo   = route?.params?.targetMemberNo || null;
  const targetFarmer     = route?.params?.targetFarmer || null;
  const isCapturingForFarmer = !!targetFarmerId;
  const [step, setStep] = useState(0);

  // Step 1 — Farmer (pre-fill from targetFarmer when capturing on behalf; own profile otherwise)
  const [firstName,   setFirstName]   = useState(isCapturingForFarmer ? (targetFarmer?.first_name  || '') : (user?.first_name  || ''));
  const [lastName,    setLastName]    = useState(isCapturingForFarmer ? (targetFarmer?.last_name   || '') : (user?.last_name   || ''));
  const [phone,       setPhone]       = useState(isCapturingForFarmer ? (targetFarmer?.phone       || '') : (user?.phone       || ''));
  const [nationalId,  setNationalId]  = useState(isCapturingForFarmer ? (targetFarmer?.national_id || '') : (user?.national_id || ''));
  const [gender,      setGender]      = useState(isCapturingForFarmer ? (targetFarmer?.gender      || '') : (user?.gender      || ''));
  const [county,      setCounty]      = useState(isCapturingForFarmer ? (targetFarmer?.county      || '') : (user?.county      || ''));
  const [subCounty,   setSubCounty]   = useState(isCapturingForFarmer ? (targetFarmer?.sub_county || targetFarmer?.subcounty || '') : (user?.sub_county || ''));
  const [dataConsent,    setDataConsent]    = useState(isCapturingForFarmer); // farmer already consented on registration
  const [coopMemberNo,   setCoopMemberNo]   = useState(
    targetMemberNo || targetFarmer?.coop_member_no || targetFarmer?.membership_number ||
    user?.cooperative_member_no || user?.coop_member_no || ''
  );

  const divisions    = divisionsForCountry(user?.country || 'Kenya');
  const allL1Options = Object.keys(divisions.data).sort();
  const subOptions   = county ? (divisions.data[county] || []) : [];

  useEffect(() => {
    if (isCapturingForFarmer) return; // don't overwrite farmer fields with the officer's own profile
    authAPI.me().then(res => {
      const fresh = res.data;
      updateUser(fresh);
      if (fresh.first_name)  setFirstName(fresh.first_name);
      if (fresh.last_name)   setLastName(fresh.last_name);
      if (fresh.phone)       setPhone(fresh.phone);
      if (fresh.national_id) setNationalId(fresh.national_id);
      if (fresh.gender)      setGender(fresh.gender);
      if (fresh.county)      setCounty(fresh.county);
      if (fresh.subcounty || fresh.sub_county) setSubCounty(fresh.subcounty || fresh.sub_county);
    }).catch(() => {
      farmerAPI.getProfile().then(res => {
        const p = res.data;
        updateUser(p);
        if (p.first_name)  setFirstName(p.first_name);
        if (p.last_name)   setLastName(p.last_name);
        if (p.phone)       setPhone(p.phone);
        if (p.national_id) setNationalId(p.national_id);
        if (p.gender)      setGender(p.gender);
        if (p.county)      setCounty(p.county);
        if (p.subcounty || p.sub_county) setSubCounty(p.subcounty || p.sub_county);
      }).catch(() => {});
    });
  }, []);

  // Step 2 — Land & Farm
  const [farmName,      setFarmName]      = useState('');
  const [farmCode,      setFarmCode]      = useState('');
  const [farmType,      setFarmType]      = useState('');
  const [landRegNumber, setLandRegNumber] = useState('');
  const [totalArea,     setTotalArea]     = useState('');
  const [landUse,       setLandUse]       = useState('agroforestry');

  // Step 3 — Coffee
  const [varieties,      setVarieties]      = useState([]);
  const [yearPlanted,    setYearPlanted]    = useState('');
  const [coffeeTrees,    setCoffeeTrees]    = useState('');
  const [farmStatus,     setFarmStatus]     = useState('active');
  const [plantingMethod, setPlantingMethod] = useState('');
  const [irrigationUsed, setIrrigationUsed] = useState(null);
  const [irrigationType, setIrrigationType] = useState('');
  const [annualYield,    setAnnualYield]    = useState('');

  // Step 5 — Advanced
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

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState(null);

  const stepValid = [
    !!firstName.trim() && !!phone.trim() && !!county.trim() && dataConsent,
    !!farmName.trim() && !!totalArea,
    varieties.length > 0,
    true,
    true,
  ];

  const handleNext = () => {
    setTouched(true);
    if (!stepValid[step]) return;
    setTouched(false);
    setError(null);
    setStep(s => s + 1);
  };

  const handleBack = () => { setError(null); setTouched(false); setStep(s => s - 1); };

  const isLastStep = step === STEPS.length - 1;

  const handleSubmit = async () => {
    setTouched(true);
    setError(null);
    setLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      if (!net.isConnected || net.isInternetReachable === false) {
        setError('No internet connection. Connect and try again.');
        setLoading(false);
        return;
      }
      const farmPayload = {
        farmer_first_name:    firstName.trim() || null,
        farmer_last_name:     lastName.trim() || null,
        farmer_phone:         phone.trim() || null,
        national_id:          nationalId.trim() || null,
        gender:               gender || null,
        county:               county.trim(),
        sub_county:           subCounty.trim() || null,
        cooperative_name:     user?.cooperative_name || null,
        cooperative_member_no: coopMemberNo.trim() || null,
        data_consent:         dataConsent,
        farm_name:            farmName.trim(),
        farm_code:            farmCode.trim() || null,
        farm_type:            farmType || null,
        land_reg_number:      landRegNumber.trim() || null,
        total_area_hectares:  totalArea ? parseFloat(totalArea) : null,
        land_use_type:        landUse,
        coffee_varieties:     varieties.length > 0 ? varieties : null,
        year_coffee_planted:  yearPlanted ? parseInt(yearPlanted) : null,
        coffee_trees:         coffeeTrees ? parseInt(coffeeTrees) : null,
        farm_status:          farmStatus || null,
        planting_method:      plantingMethod || null,
        irrigation_used:      irrigationUsed,
        irrigation_type:      irrigationUsed ? irrigationType || null : null,
        average_annual_production_kg: annualYield ? parseFloat(annualYield) : null,
        satellite_consent:          dataConsent,
        historical_imagery_consent: dataConsent,
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
      };

      if (isCapturingForFarmer) {
        const res = await farmerAPI.captureFarmForFarmer(targetFarmerId, farmPayload);
        setCreated({ ...(res.data || {}), _forFarmer: true, _farmerName: targetFarmerName });
      } else {
        const res = await mobileAPI.createFarm(farmPayload);
        setCreated(res.data);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to add farm.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // ── Success view (coop staff capturing on behalf) ────────────────────────────
  if (created && created._forFarmer) {
    const farmId = created.farm_id || created.id;
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
        <SafeAreaView style={s.safe}>
          <View style={s.topBar}>
            <View style={{ width: 40 }} />
            <Text style={s.topTitle}>Farm Captured</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle" size={64} color={C.c700} />
            </View>
            <Text style={s.successHeading}>{created.farm_name || farmName}</Text>
            <Text style={s.successSub}>
              Farm captured successfully for{'\n'}
              <Text style={{ fontWeight: '700' }}>{created._farmerName || targetFarmerName}</Text>
            </Text>

            <View style={s.card}>
              <Text style={s.cardSectionLabel}>Farm Details</Text>
              <PreviewRow label="Farm Code"  value={created.farm_code} />
              <PreviewRow label="County"     value={created.county || county} />
              <PreviewRow label="Land Use"   value={created.land_use_type || landUse} />
              <PreviewRow label="Total Area" value={(created.total_area_hectares || totalArea) ? `${created.total_area_hectares || totalArea} ha` : null} />
              <PreviewRow label="Varieties"  value={(created.coffee_varieties || varieties)?.join?.(', ') || null} />
            </View>

            {!!created.farm_code && (
              <View style={s.codeCard}>
                <Text style={s.codeLabel}>Farm code</Text>
                <Text style={s.codeValue}>{created.farm_code}</Text>
              </View>
            )}

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('CaptureMode', {
                farmId,
                farm: { id: farmId, farm_code: created.farm_code, farm_name: created.farm_name || farmName },
                formData: {
                  firstName, lastName, phone, nationalId, gender, county, subCounty,
                  farmName: created.farm_name || farmName, farmCode: created.farm_code,
                  targetFarmerId,
                },
              })}
              activeOpacity={0.85}
            >
              <Ionicons name="location-outline" size={18} color={C.white} />
              <Text style={s.primaryBtnText}>Capture Boundary Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.outlineBtn}
              onPress={() => navigation.navigate('CoopFarmsList')}
              activeOpacity={0.7}
            >
              <Text style={s.outlineBtnText}>Done — Back to Farm List</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Success view (farmer self-registration) ───────────────────────────────────
  if (created) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
        <SafeAreaView style={s.safe}>
          <View style={s.topBar}>
            <View style={{ width: 40 }} />
            <Text style={s.topTitle}>Farm Registered</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={s.successIconWrap}>
              <Ionicons name="checkmark-circle" size={64} color={C.c700} />
            </View>
            <Text style={s.successHeading}>{created.farm_name}</Text>
            <Text style={s.successSub}>Farm registered successfully — ready for boundary capture.</Text>

            <View style={s.card}>
              <Text style={s.cardSectionLabel}>Farmer</Text>
              <PreviewRow label="Name" value={[created.farmer_first_name, created.farmer_last_name].filter(Boolean).join(' ') || created.farmer} />
              <PreviewRow label="Phone" value={created.farmer_phone} />
              <PreviewRow label="National ID" value={created.national_id} />
              <PreviewRow label="Cooperative" value={created.cooperative_name || created.cooperative} />

              <View style={s.cardDivider} />
              <Text style={s.cardSectionLabel}>Farm</Text>
              <PreviewRow label="Farm Code" value={created.farm_code} />
              <PreviewRow label="County" value={created.county} />
              <PreviewRow label="Sub-County" value={created.sub_county} />
              <PreviewRow label="Land Use" value={created.land_use_type} />
              <PreviewRow label="Total Area" value={created.total_area_hectares ? `${created.total_area_hectares} ha` : null} />
              <PreviewRow label="Varieties" value={created.coffee_varieties} />
            </View>

            <View style={s.codeCard}>
              <Text style={s.codeLabel}>Farm code for boundary capture</Text>
              <Text style={s.codeValue}>{created.farm_code}</Text>
            </View>

            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => navigation.navigate('CaptureMode', {
                farmId: created.farm_id || created.id,
                farm: { id: created.farm_id || created.id, farm_code: created.farm_code, farm_name: created.farm_name },
              })}
              activeOpacity={0.85}
            >
              <Ionicons name="location-outline" size={18} color={C.white} />
              <Text style={s.primaryBtnText}>Capture Boundary Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate('FarmsList')} activeOpacity={0.7}>
              <Text style={s.outlineBtnText}>Done — Capture Later</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Form view ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
      <SafeAreaView style={s.safe}>

{/* Top bar */}
         <View style={s.topBar}>
           <TouchableOpacity
             style={s.backBtn}
             onPress={step === 0 ? () => navigation.goBack() : handleBack}
             activeOpacity={0.7}
           >
             <Ionicons name="chevron-back" size={20} color={C.ink} />
           </TouchableOpacity>
          <Text style={s.topTitle}>{isCapturingForFarmer ? 'Capture Farm' : 'Add Farm'}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Capture-on-behalf banner */}
        {isCapturingForFarmer && (
          <View style={s.captureBanner}>
            <Ionicons name="person" size={14} color="#166534" style={{ marginRight: 6 }} />
            <Text style={s.captureBannerText}>
              Capturing for: <Text style={{ fontWeight: '700' }}>{targetFarmerName}</Text>
              {targetMemberNo ? `  ·  Member #${targetMemberNo}` : ''}
            </Text>
          </View>
        )}

        {/* Step wizard */}
        <View style={s.wizardWrap}>
          <StepWizard current={step} total={STEPS.length} />
        </View>

        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── STEP 1: FARMER ────────────────────────────────────────────── */}
            {step === 0 && (
              <>
                <SectionBlock icon="person-outline" title="Farmer's Personal Details">
                  <View style={s.row}>
                    <View style={s.half}>
                      <Field label="First Name" required error={touched && !firstName.trim() ? 'Required' : ''}>
                        <FInput value={firstName} onChangeText={setFirstName} placeholder="e.g. James"
                          error={touched && !firstName.trim()} returnKeyType="next" />
                      </Field>
                    </View>
                    <View style={s.rowGap} />
                    <View style={s.half}>
                      <Field label="Last Name">
                        <FInput value={lastName} onChangeText={setLastName} placeholder="e.g. Kamau" returnKeyType="next" />
                      </Field>
                    </View>
                  </View>
                  <Field label="Phone Number" required error={touched && !phone.trim() ? 'Required' : ''}>
                    <FInput value={phone} onChangeText={setPhone} placeholder="+254700000000"
                      keyboardType="phone-pad" error={touched && !phone.trim()} returnKeyType="next" />
                  </Field>
                  <Field label="National ID">
                    <FInput value={nationalId} onChangeText={setNationalId} placeholder="e.g. 12345678"
                      keyboardType="numeric" returnKeyType="next" />
                  </Field>
                  <Field label="Gender">
                    <ChipGroup options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                  </Field>
                </SectionBlock>

                <SectionBlock icon="location-outline" title="Address">
                  <Field label={divisions.l1} required error={touched && !county.trim() ? 'Required' : ''}>
                    <Dropdown
                      value={county}
                      options={allL1Options}
                      onChange={val => { setCounty(val); setSubCounty(''); }}
                      placeholder={`Select ${divisions.l1}`}
                    />
                  </Field>
                  <Field label={divisions.l2}>
                    <Dropdown
                      value={subCounty}
                      options={subOptions}
                      onChange={setSubCounty}
                      placeholder={county ? `Select ${divisions.l2}` : `Select ${divisions.l1} first`}
                      disabled={!county}
                    />
                  </Field>
                </SectionBlock>

                {!!user?.cooperative_name && (
                  <View style={s.coopCard}>
                    <Ionicons name="people-outline" size={18} color={C.c700} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.coopCardLabel}>Linked Cooperative</Text>
                      <Text style={s.coopCardName}>{user.cooperative_name}</Text>
                    </View>
                    <View style={s.coopBadge}><Text style={s.coopBadgeText}>Linked</Text></View>
                  </View>
                )}

                {/* Cooperative Member Number */}
                <Field
                  label="Cooperative Member Number"
                  hint="Auto-generated (PCFNO format) if left blank"
                >
                  <View style={s.memberNoRow}>
                    <FInput
                      value={coopMemberNo}
                      onChangeText={setCoopMemberNo}
                      placeholder="e.g. PCFNO-1183 or your coop's format"
                      autoCapitalize="characters"
                      style={{ flex: 1 }}
                    />
                    {!coopMemberNo.trim() && (
                      <TouchableOpacity
                        style={s.memberNoGenBtn}
                        onPress={() => setCoopMemberNo(`PCFNO-${String(Math.floor(1000 + Math.random() * 9000))}`)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={14} color={C.c700} />
                        <Text style={s.memberNoGenText}>Generate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Field>

                {isCapturingForFarmer ? (
                  <View style={[s.consentRow, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[s.consentTitle, { color: '#166534' }]}>Farmer consent confirmed</Text>
                      <Text style={s.consentDesc}>The farmer consented to data collection when they registered. Capturing this farm on their behalf.</Text>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={s.consentRow} onPress={() => setDataConsent(v => !v)} activeOpacity={0.8}>
                    <View style={[s.checkbox, dataConsent && s.checkboxOn]}>
                      {dataConsent && <Ionicons name="checkmark" size={14} color={C.white} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.consentTitle}>I consent to data collection & processing *</Text>
                      <Text style={s.consentDesc}>Required to register and link this farm to the sustainability platform.</Text>
                    </View>
                  </TouchableOpacity>
                )}
                {touched && !dataConsent && !isCapturingForFarmer && <Text style={s.errGlobal}>Data consent is required to continue.</Text>}
              </>
            )}

            {/* ── STEP 2: LAND & FARM ──────────────────────────────────────── */}
            {step === 1 && (
              <>
                <SectionBlock icon="leaf-outline" title="Land & Farm Information">
                  <Field label="Farm / Parcel Name" required error={touched && !farmName.trim() ? 'Required' : ''}>
                    <FInput value={farmName} onChangeText={setFarmName} placeholder="e.g. Kibaki Coffee Farm"
                      error={touched && !farmName.trim()} returnKeyType="next" />
                  </Field>
                  <Field label="Farm Code" hint="Auto-generated if left blank">
                    <FInput value={farmCode} onChangeText={t => setFarmCode(t.toUpperCase())}
                      placeholder="e.g. KIR-001" autoCapitalize="characters" returnKeyType="next" />
                  </Field>
                  <Field label="Farm / Land Type">
                    <ChipGroup options={FARM_TYPES} value={farmType} onChange={setFarmType} />
                  </Field>
                  <Field label="Land Registration Number" hint="Title deed or government-issued ID">
                    <FInput value={landRegNumber} onChangeText={setLandRegNumber}
                      placeholder="e.g. KIRINYAGA/23456" returnKeyType="next" />
                  </Field>
                  <Field label="Total Area (ha)" required error={touched && !totalArea ? 'Required' : ''}>
                    <FInput value={totalArea} onChangeText={setTotalArea} placeholder="e.g. 2.5"
                      keyboardType="decimal-pad" error={touched && !totalArea} returnKeyType="next" />
                  </Field>
                  <Field label="Land Use Type">
                    <ChipGroup options={LAND_USE} value={landUse} onChange={setLandUse} />
                  </Field>
                </SectionBlock>
              </>
            )}

            {/* ── STEP 3: COFFEE ───────────────────────────────────────────── */}
            {step === 2 && (
              <>
                <SectionBlock icon="cafe-outline" title="Coffee Farming Details">
                  <Field label="Coffee Varieties" required hint="Select all that apply"
                    error={touched && varieties.length === 0 ? 'Select at least one variety' : ''}>
                    <ChipGroup options={COFFEE_VARIETIES} value={varieties} onChange={setVarieties} multi />
                  </Field>
                  <View style={s.row}>
                    <View style={s.half}>
                      <Field label="Year First Planted" hint="Satellite baseline">
                        <FInput value={yearPlanted} onChangeText={setYearPlanted} placeholder="e.g. 2010"
                          keyboardType="numeric" returnKeyType="next" />
                      </Field>
                    </View>
                    <View style={s.rowGap} />
                    <View style={s.half}>
                      <Field label="Coffee Trees">
                        <FInput value={coffeeTrees} onChangeText={setCoffeeTrees} placeholder="e.g. 500"
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
                    <FInput value={annualYield} onChangeText={setAnnualYield} placeholder="e.g. 800"
                      keyboardType="decimal-pad" returnKeyType="done" />
                  </Field>
                </SectionBlock>
              </>
            )}

            {/* ── STEP 4: CAPTURE ──────────────────────────────────────────── */}
            {step === 3 && (
              <>
                <SectionBlock icon="location-outline" title="Capture Farm Boundary">
                  <View style={s.captureNote}>
                    <Ionicons name="information-circle-outline" size={16} color="#1d4ed8" />
                    <Text style={s.captureNoteText}>
                      Your data consent covers satellite monitoring and historical imagery analysis.
                      You are ready to capture the farm boundary.
                    </Text>
                  </View>

                  {[
                    { icon: 'walk-outline', color: C.c700, bg: C.c050, border: C.c200, title: 'Walk the Farm Boundary', desc: 'Go to your farm and walk along its edges. The app records your GPS path to map the boundary.' },
                    { icon: 'wifi-outline', color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', title: 'Works Offline', desc: 'Boundary capture works without internet. Data syncs automatically when you reconnect.' },
                    { icon: 'time-outline', color: C.c700, bg: C.c050, border: C.c200, title: 'Capture Later', desc: "You can skip now and capture the boundary later from My Farms using the Capture button." },
                  ].map(item => (
                    <View key={item.title} style={[s.captureInfoCard, { backgroundColor: item.bg, borderColor: item.border }]}>
                      <View style={[s.captureIconBox, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.captureInfoTitle}>{item.title}</Text>
                        <Text style={s.captureInfoDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={s.captureNowBtn}
                    onPress={() => navigation.navigate('CaptureMode', {
                      farmId: farmCode.trim() || farmName.trim(),
                      formData: {
                        firstName, lastName, phone, nationalId, gender, county, subCounty, dataConsent,
                        farmName, farmCode, farmType, landRegNumber, totalArea, landUse,
                        varieties, yearPlanted, coffeeTrees, farmStatus, plantingMethod,
                        irrigationUsed, irrigationType, annualYield,
                        cooperativeName: user?.cooperative_name || null,
                        cooperativeMemberNo: coopMemberNo.trim() || null,
                        targetFarmerId: targetFarmerId || null,
                      },
                    })}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="location-outline" size={16} color={C.c700} />
                    <Text style={s.captureNowBtnText}>Start Capture Now</Text>
                  </TouchableOpacity>
                  <Text style={s.captureSkipHint}>Or press Next to fill optional details first.</Text>
                </SectionBlock>
              </>
            )}

            {/* ── STEP 5: ADVANCED ─────────────────────────────────────────── */}
            {step === 4 && (
              <>
                <View style={s.optionalNote}>
                  <Ionicons name="information-circle-outline" size={15} color="#1d4ed8" />
                  <Text style={s.optionalNoteText}>All fields on this step are optional but improve your compliance score.</Text>
                </View>

                <SectionBlock icon="leaf-outline" title="Agroforestry & Intercropping">
                  <Field label="Intercropped Species" hint="Select all that apply">
                    <ChipGroup options={INTERCROP_SPECIES} value={intercroppedSpecies} onChange={setIntercroppedSpecies} multi />
                  </Field>
                  <Field label="Shade Trees Present?">
                    <YesNo value={shadeTrees} onChange={setShadeTrees} />
                  </Field>
                  {shadeTrees && (
                    <Field label="Shade Canopy (%)">
                      <FInput value={shadeCanopy} onChangeText={setShadeCanopy} placeholder="e.g. 30"
                        keyboardType="numeric" returnKeyType="next" />
                    </Field>
                  )}
                  <Field label="Agroforestry Start Year">
                    <FInput value={agroforestryYear} onChangeText={setAgroforestryYear} placeholder="e.g. 2018"
                      keyboardType="numeric" returnKeyType="done" />
                  </Field>
                </SectionBlock>

                <SectionBlock icon="clipboard-outline" title="Practice Log">
                  <View style={s.row}>
                    <View style={s.half}>
                      <Field label="Last Pruning Date" hint="YYYY-MM-DD">
                        <FInput value={lastPruning} onChangeText={setLastPruning} placeholder="2025-03-15"
                          keyboardType="numbers-and-punctuation" returnKeyType="next" />
                      </Field>
                    </View>
                    <View style={s.rowGap} />
                    <View style={s.half}>
                      <Field label="Last Harvesting Date" hint="YYYY-MM-DD">
                        <FInput value={lastHarvesting} onChangeText={setLastHarvesting} placeholder="2025-01-10"
                          keyboardType="numbers-and-punctuation" returnKeyType="next" />
                      </Field>
                    </View>
                  </View>
                  <Field label="Recent Planting Event" hint="What was planted and when">
                    <FInput value={recentPlanting} onChangeText={setRecentPlanting}
                      placeholder="e.g. 50 Grevillea trees, March 2025" returnKeyType="done" />
                  </Field>
                </SectionBlock>

                <SectionBlock icon="business-outline" title="Farm History">
                  <View style={s.row}>
                    <View style={s.half}>
                      <Field label="Year Farm Established">
                        <FInput value={farmEstYear} onChangeText={setFarmEstYear} placeholder="e.g. 1998"
                          keyboardType="numeric" returnKeyType="next" />
                      </Field>
                    </View>
                  </View>
                  <Field label="Previous Land Use" hint="What was here before coffee?">
                    <ChipGroup options={PREVIOUS_LAND_USE} value={previousLandUse} onChange={setPreviousLandUse} />
                  </Field>
                  <Field label="NGO / Programme Support" hint="Name of programme and years active">
                    <FInput value={ngoSupport} onChangeText={setNgoSupport}
                      placeholder="e.g. TechnoServe, 2020-2023" returnKeyType="done" />
                  </Field>
                </SectionBlock>
              </>
            )}

            {error && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Footer navigation */}
        <View style={s.footer}>
          {step > 0 && (
            <TouchableOpacity style={s.outlineBtn} onPress={handleBack} activeOpacity={0.8}>
              <Ionicons name="chevron-back" size={16} color={C.steel700} />
              <Text style={s.outlineBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          {!isLastStep ? (
            <TouchableOpacity
              style={[s.primaryBtn, { flex: step > 0 ? 2 : 1 }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Next: {STEPS[step + 1].label}</Text>
              <Ionicons name="chevron-forward" size={16} color={C.white} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.primaryBtn, { flex: 2 }, loading && s.primaryBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={C.white} size="small" />
                : <>
                    <Ionicons name="checkmark" size={16} color={C.white} />
                    <Text style={s.primaryBtnText}>{isCapturingForFarmer ? 'Submit Farm' : 'Add Farm'}</Text>
                  </>
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  safe: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 56, paddingRight: 20, paddingVertical: 12,
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  topTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  captureBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#dcfce7', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#bbf7d0',
  },
  captureBannerText: { fontSize: 13, color: '#166534', flex: 1 },

  wizardWrap: { backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },

  scrollContent: { padding: 16, paddingBottom: 32 },

  row: { flexDirection: 'row' },
  half: { flex: 1 },
  rowGap: { width: 12 },

  // Success
  successIconWrap: { alignItems: 'center', marginTop: 32, marginBottom: 12 },
  successHeading: { fontSize: 22, fontWeight: '700', color: C.ink, textAlign: 'center', marginBottom: 6 },
  successSub: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  card: {
    backgroundColor: C.white, borderRadius: 8, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardSectionLabel: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  cardDivider: { height: 1, backgroundColor: C.steel200, marginVertical: 14 },

  codeCard: {
    backgroundColor: C.c050, borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 20,
    borderWidth: 1.5, borderColor: C.c200,
  },
  codeLabel: { fontSize: 11, color: C.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  codeValue: { fontSize: 28, fontWeight: '900', color: C.c700, letterSpacing: 3 },

  memberNoRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberNoGenBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.c050, borderWidth: 1, borderColor: C.c200 },
  memberNoGenText: { fontSize: 11, fontWeight: '700', color: C.c700 },

  primaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.c700, height: 44, borderRadius: 6,
  },
  primaryBtnDisabled: { backgroundColor: C.steel300 },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    height: 44, borderRadius: 6, borderWidth: 1.5, borderColor: C.steel300, backgroundColor: C.white,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: C.steel700 },

  coopCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.c050, borderRadius: 8,
    padding: 14, borderWidth: 1, borderColor: C.c200, marginBottom: 16,
  },
  coopCardLabel: { fontSize: 10, fontWeight: '700', color: C.c700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  coopCardName: { fontSize: 14, fontWeight: '700', color: C.c800 },
  coopBadge: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  coopBadgeText: { fontSize: 11, fontWeight: '700', color: '#15803d' },

  consentRow: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: C.white, borderRadius: 8, padding: 14,
    borderWidth: 1.5, borderColor: C.steel200, marginBottom: 4,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: C.steel300,
    backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: C.c700, borderColor: C.c700 },
  consentTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 2 },
  consentDesc: { fontSize: 12, color: C.muted, lineHeight: 16 },

  errGlobal: { fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 6, marginBottom: 8, marginLeft: 2 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#fecaca', marginTop: 8,
  },
  errorText: { flex: 1, color: '#dc2626', fontSize: 13, fontWeight: '600', lineHeight: 18 },

  captureNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 14,
  },
  captureNoteText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18, fontWeight: '500' },

  captureInfoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    borderRadius: 8, padding: 14, marginBottom: 10, borderWidth: 1,
  },
  captureIconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  captureInfoTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 3 },
  captureInfoDesc: { fontSize: 12, color: C.muted, lineHeight: 17 },
  captureNowBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 6, paddingVertical: 12, marginTop: 4, borderWidth: 1.5, borderColor: C.c700,
    backgroundColor: C.white,
  },
  captureNowBtnText: { fontSize: 14, fontWeight: '600', color: C.c700 },
  captureSkipHint: { fontSize: 12, color: C.subtle, textAlign: 'center', marginTop: 10, lineHeight: 17 },

  optionalNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#eff6ff', borderRadius: 6, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 14,
  },
  optionalNoteText: { flex: 1, fontSize: 13, color: '#1e40af', lineHeight: 18, fontWeight: '500' },

  footer: {
    flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 16,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel200,
  },
});

// ── Form field styles ─────────────────────────────────────────────────────────
const f = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.steel700, marginBottom: 6 },
  req: { color: '#dc2626' },
  hint: { fontSize: 11, color: C.subtle, marginTop: 5, lineHeight: 15 },
  errText: { fontSize: 12, color: '#dc2626', fontWeight: '600', marginTop: 5 },

  input: {
    borderWidth: 1, borderColor: C.steel300, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: C.ink, backgroundColor: C.white, fontWeight: '400',
  },
  inputFocused: { borderColor: C.c700, borderWidth: 1.5 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 4,
    borderWidth: 1, borderColor: C.steel300, backgroundColor: C.white,
  },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText: { fontSize: 13, fontWeight: '600', color: C.steel700 },
  chipTextActive: { color: C.white },

  yesNoRow: { flexDirection: 'row', gap: 8 },
  yesNoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    height: 40, borderRadius: 6, borderWidth: 1, borderColor: C.steel300,
    backgroundColor: C.white,
  },
  yesNoBtnActive: { backgroundColor: C.c700, borderColor: C.c700 },
  yesNoText: { fontSize: 14, fontWeight: '600', color: C.steel700 },
  yesNoTextActive: { color: C.white },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.steel300, borderRadius: 6,
    paddingHorizontal: 12, height: 40, backgroundColor: C.white,
  },
  dropdownText: { flex: 1, fontSize: 14, color: C.ink, fontWeight: '400' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 36, maxHeight: '70%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  sheetItemActive: { backgroundColor: C.c050, marginHorizontal: -20, paddingHorizontal: 20 },
  sheetItemText: { fontSize: 15, color: C.ink },
  sheetItemTextActive: { color: C.c700, fontWeight: '700' },

  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  previewLabel: { fontSize: 13, color: C.muted, fontWeight: '500', flex: 1 },
  previewValue: { fontSize: 13, color: C.ink, fontWeight: '600', flex: 1.5, textAlign: 'right' },
});

// ── Step wizard styles ─────────────────────────────────────────────────────────
const wz = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', flex: 1 },
  circle: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    borderColor: C.steel300, backgroundColor: C.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 5,
  },
  circleActive: { borderColor: C.c700, backgroundColor: C.white },
  circleDone: { borderColor: C.c700, backgroundColor: C.c700 },
  circleText: { fontSize: 12, fontWeight: '700', color: C.steel400 },
  circleTextLight: { color: C.c700 },
  stepLabel: { fontSize: 9, fontWeight: '600', color: C.subtle, textAlign: 'center' },
  stepLabelActive: { color: C.c700, fontWeight: '700' },
  stepLabelDone: { color: C.muted },
  connector: {
    flex: 1, height: 1.5, backgroundColor: C.steel300,
    marginTop: 13, marginHorizontal: -2,
  },
  connectorDone: { backgroundColor: C.c700 },
});

// ── Section block styles ───────────────────────────────────────────────────────
const f2 = StyleSheet.create({
  block: { backgroundColor: C.white, borderRadius: 8, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.steel200 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  iconBox: { width: 32, height: 32, borderRadius: 6, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 14, fontWeight: '700', color: C.ink },
});

function SectionBlock({ icon, title, children }) {
  return (
    <View style={f2.block}>
      <View style={f2.header}>
        <View style={f2.iconBox}>
          <Ionicons name={icon} size={16} color={C.c700} />
        </View>
        <Text style={f2.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
