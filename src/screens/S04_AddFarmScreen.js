import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StatusBar, ImageBackground, Alert, Switch, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { mobileAPI, farmerAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { divisionsForCountry } from '../data/adminDivisions';

// ── Replaced by shared adminDivisions.js — kept as placeholder ───────────────
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

const STEPS = ['Farmer', 'Land & Farm', 'Coffee', 'Capture', 'Advanced'];

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

function Dropdown({ value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[s.dropdownBtn, disabled && { opacity: 0.5 }]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[s.dropdownBtnText, !value && { color: C.subtle }]} numberOfLines={1}>
          {value || placeholder || 'Select…'}
        </Text>
        <Text style={s.dropdownArrow}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.ddOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.ddSheet}>
            <View style={s.ddHandle} />
            <Text style={s.ddTitle}>{placeholder || 'Select'}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.ddItem, item === value && s.ddItemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.ddItemText, item === value && s.ddItemTextActive]}>{item}</Text>
                  {item === value && <Text style={s.ddCheck}>✓</Text>}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AddFarmScreen() {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(0);

  // ── Step 1: Farmer Details — pre-filled from registration ─────────────────
  const [firstName,   setFirstName]   = useState(user?.first_name  || '');
  const [lastName,    setLastName]    = useState(user?.last_name   || '');
  const [phone,       setPhone]       = useState(user?.phone       || '');
  const [nationalId,  setNationalId]  = useState(user?.national_id || '');
  const [gender,      setGender]      = useState(user?.gender      || '');
  const [county,      setCounty]      = useState(user?.county      || '');
  const [subCounty,   setSubCounty]   = useState(user?.sub_county  || '');
  const [dataConsent, setDataConsent] = useState(false);

  // Location divisions based on user's country
  const divisions    = divisionsForCountry(user?.country || 'Kenya');
  const allL1Options = Object.keys(divisions.data).sort();
  const subOptions   = county ? (divisions.data[county] || []) : [];

  // On mount: refresh /auth/me so cooperative_name is always current,
  // then fill any form fields the cached user object may have missed.
  useEffect(() => {
    authAPI.me().then(res => {
      const fresh = res.data;
      // Update the AuthContext so cooperative_name is available everywhere
      updateUser(fresh);
      // Fill form fields (always overwrite with authoritative server data)
      if (fresh.first_name)  setFirstName(fresh.first_name);
      if (fresh.last_name)   setLastName(fresh.last_name);
      if (fresh.phone)       setPhone(fresh.phone);
      if (fresh.national_id) setNationalId(fresh.national_id);
      if (fresh.gender)      setGender(fresh.gender);
      if (fresh.county)      setCounty(fresh.county);
      if (fresh.subcounty || fresh.sub_county) setSubCounty(fresh.subcounty || fresh.sub_county);
    }).catch(() => {
      // Fallback: try farmer profile endpoint
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

  // ── Step 2: Land & Farm ────────────────────────────────────────────────────
  const [farmName,        setFarmName]        = useState('');
  const [farmCode,        setFarmCode]        = useState('');
  const [farmType,        setFarmType]        = useState('');
  const [landRegNumber,   setLandRegNumber]   = useState('');
  const [totalArea,       setTotalArea]       = useState('');

  const [landUse,         setLandUse]         = useState('agroforestry');

  // ── Step 3: Coffee ─────────────────────────────────────────────────────────
  const [varieties,       setVarieties]       = useState([]);
  const [yearPlanted,     setYearPlanted]     = useState('');
  const [coffeeTrees,     setCoffeeTrees]     = useState('');
  const [farmStatus,      setFarmStatus]      = useState('active');
  const [plantingMethod,  setPlantingMethod]  = useState('');
  const [irrigationUsed,  setIrrigationUsed]  = useState(null);
  const [irrigationType,  setIrrigationType]  = useState('');
  const [annualYield,     setAnnualYield]     = useState('');


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
    !!firstName.trim() && !!phone.trim() && !!county.trim() && dataConsent, // step 0 — Farmer
    !!farmName.trim() && !!totalArea,                                        // step 1 — Land & Farm
    varieties.length > 0,                                                    // step 2 — Coffee
    true,                                                                    // step 3 — Capture (info only)
    true,                                                                    // step 4 — Advanced (all optional)
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
        county:               county.trim(),
        sub_county:           subCounty.trim() || null,
        cooperative_name:     user?.cooperative_name || null,
        cooperative_member_no: user?.cooperative_member_no || user?.coop_member_no || null,
        data_consent:         dataConsent,
        // Step 2
        farm_name:         farmName.trim(),
        farm_code:         farmCode.trim() || null,
        farm_type:         farmType || null,
        land_reg_number:   landRegNumber.trim() || null,
        total_area_hectares: totalArea ? parseFloat(totalArea) : null,

        land_use_type:     landUse,
        // Step 3
        coffee_varieties:  varieties.length > 0 ? varieties : null,
        year_coffee_planted: yearPlanted ? parseInt(yearPlanted) : null,
        coffee_trees:      coffeeTrees ? parseInt(coffeeTrees) : null,
        farm_status:       farmStatus || null,
        planting_method:   plantingMethod || null,
        irrigation_used:   irrigationUsed,
        irrigation_type:   irrigationUsed ? irrigationType || null : null,
        average_annual_production_kg: annualYield ? parseFloat(annualYield) : null,
        satellite_consent:          dataConsent,
        historical_imagery_consent: dataConsent,
        // Step 5 — Advanced (all optional)
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

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      const msg = e.response?.data?.detail || e.message || 'Failed to add farm.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureBoundary = () => {
    const farmParam = {
      id: created.farm_id || created.id,
      farm_code: created.farm_code,
      farm_name: created.farm_name,
    };
    navigation.navigate('CaptureMode', {
      farmId: created.farm_id || created.id,
      farm: farmParam,
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
                <PreviewRow label="Varieties"   value={created.coffee_varieties} />

                <View style={s.divider} />
                <View style={s.codeBox}>
                  <Text style={s.codeBoxLabel}>Farm code for boundary capture</Text>
                  <Text style={s.codeBoxCode}>{created.farm_code}</Text>
                </View>

                <TouchableOpacity style={s.primaryBtn} onPress={handleCaptureBoundary} activeOpacity={0.8}>
                  <Text style={s.primaryBtnText}>Capture Boundary Now</Text>
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
                  <Text style={s.backText}>{step === 0 ? 'Back' : STEPS[step - 1]}</Text>
                </TouchableOpacity>
                <Text style={s.appTitle}>PLOTRA</Text>
                <View style={{ width: 60 }} />
              </View>

              <View style={s.card}>
                <Text style={s.title}>Add Farm</Text>

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

                    <View style={s.subHeader}><Text style={s.subHeaderText}>📍 Address</Text></View>

                    <Field label={divisions.l1} required>
                      <Dropdown
                        value={county}
                        options={allL1Options}
                        onChange={(val) => { setCounty(val); setSubCounty(''); }}
                        placeholder={`Select ${divisions.l1}`}
                      />
                      {touched && !county.trim() && <Text style={s.errText}>Required</Text>}
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

                    {!!user?.cooperative_name && (
                      <View style={s.coopInfoCard}>
                        <Ionicons name="people-outline" size={18} color={C.c700} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={s.coopInfoLabel}>Linked Cooperative</Text>
                          <Text style={s.coopInfoName}>{user.cooperative_name}</Text>
                        </View>
                        <View style={s.coopInfoBadge}>
                          <Text style={s.coopInfoBadgeText}>Linked</Text>
                        </View>
                      </View>
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

                    <Field label="Total Area (ha)" required>
                      <Input value={totalArea} onChangeText={setTotalArea} placeholder="e.g. 2.5"
                        keyboardType="decimal-pad" error={touched && !totalArea} returnKeyType="next" />
                      {touched && !totalArea && <Text style={s.errText}>Required</Text>}
                    </Field>

                    <Field label="Land Use Type">
                      <ChipGroup options={LAND_USE} value={landUse} onChange={setLandUse} />
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

                {/* ── STEP 4: CAPTURE BOUNDARY ────────────────────────────── */}
                {step === 3 && (
                  <>
                    <SectionHeader icon="📍" title="Capture Farm Boundary" />
                    <Text style={s.eudrNote}>
                      Your data consent covers satellite monitoring and historical imagery analysis.
                      You are ready to capture the farm boundary.
                    </Text>

                    <View style={s.captureInfoCard}>
                      <View style={s.captureInfoRow}>
                        <Ionicons name="location-outline" size={22} color={C.c700} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.captureInfoTitle}>Walk the Farm Boundary</Text>
                          <Text style={s.captureInfoDesc}>Go to your farm and walk along its edges. The app records your GPS path to map the boundary.</Text>
                        </View>
                      </View>
                    </View>

                    <View style={s.captureInfoCard}>
                      <View style={s.captureInfoRow}>
                        <Ionicons name="wifi-outline" size={22} color="#10b981" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.captureInfoTitle}>Works Offline</Text>
                          <Text style={s.captureInfoDesc}>Boundary capture works without internet. Data syncs automatically when you reconnect.</Text>
                        </View>
                      </View>
                    </View>

                    <View style={s.captureInfoCard}>
                      <View style={s.captureInfoRow}>
                        <Ionicons name="time-outline" size={22} color="#f59e0b" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={s.captureInfoTitle}>Capture Later</Text>
                          <Text style={s.captureInfoDesc}>You can skip now and capture the boundary later from My Farms using the Capture button on your farm.</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={s.captureNowBtn}
                      onPress={() => navigation.navigate('CaptureMode', {
                        farmId: farmCode.trim() || farmName.trim(),
                        formData: {
                          firstName, lastName, phone, nationalId, gender,
                          county, subCounty, dataConsent,
                          farmName, farmCode, farmType, landRegNumber, totalArea, landUse,
                          varieties, yearPlanted, coffeeTrees, farmStatus,
                          plantingMethod, irrigationUsed, irrigationType, annualYield,
                          cooperativeName: user?.cooperative_name || null,
                          cooperativeMemberNo: user?.cooperative_member_no || user?.coop_member_no || null,
                        },
                      })}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="location-outline" size={18} color={C.c700} />
                      <Text style={s.captureNowBtnText}>Start Capture Now</Text>
                    </TouchableOpacity>
                    <Text style={s.captureSkipHint}>Or press Next to fill advanced details first and capture later from My Farms.</Text>
                  </>
                )}

                {/* ── STEP 5: ADVANCED (optional) ────────────────────────── */}
                {step === 4 && (
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
                      <Text style={s.outlineBtnText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  {!isLastStep ? (
                    <TouchableOpacity
                      style={[s.primaryBtn, { flex: step > 0 ? 2 : 1 }]}
                      onPress={handleNext}
                      activeOpacity={0.8}
                    >
                      <Text style={s.primaryBtnText}>Next: {STEPS[step + 1]}</Text>
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
                        : <Text style={s.primaryBtnText}>Add Farm ✓</Text>
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

  // Capture step
  captureInfoCard:  { backgroundColor: C.steel100, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.steel200 },
  captureInfoRow:   { flexDirection: 'row', alignItems: 'flex-start' },
  captureInfoTitle: { fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 4 },
  captureInfoDesc:  { fontSize: 12, color: C.muted, lineHeight: 17 },
  captureNowBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, paddingVertical: 14, marginTop: 8, borderWidth: 2, borderColor: C.c700, backgroundColor: 'transparent' },
  captureNowBtnText: { fontSize: 15, fontWeight: '800', color: C.c700 },
  captureSkipHint:   { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 10, lineHeight: 16 },

  // Cooperative info (read-only, linked from registration)
  coopInfoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: '#bbf7d0', marginBottom: 18 },
  coopInfoLabel: { fontSize: 10, fontWeight: '700', color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5 },
  coopInfoName: { fontSize: 14, fontWeight: '800', color: '#14532d', marginTop: 2 },
  coopInfoBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  coopInfoBadgeText: { fontSize: 10, fontWeight: '800', color: '#15803d' },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F5F0EC', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8DDD5', paddingHorizontal: 16, paddingVertical: 14 },
  dropdownBtnText: { fontSize: 15, color: '#1a1a1a', fontWeight: '600', flex: 1 },
  dropdownArrow: { fontSize: 14, color: C.c600, marginLeft: 8 },
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  ddSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  ddHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginBottom: 12 },
  ddTitle: { fontSize: 14, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  ddItemActive: { backgroundColor: C.c050, marginHorizontal: -20, paddingHorizontal: 20 },
  ddItemText: { fontSize: 15, color: C.ink, fontWeight: '500' },
  ddItemTextActive: { color: C.c700, fontWeight: '800' },
  ddCheck: { fontSize: 14, color: C.c700, fontWeight: '900' },
});
