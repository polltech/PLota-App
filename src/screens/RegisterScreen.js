import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Animated, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { divisionsForCountry } from '../data/adminDivisions';

// ── Kept only for legacy reference — actual data lives in adminDivisions.js ──
const _UNUSED = {
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
// ── Constants ─────────────────────────────────────────────────────────────────
const COUNTRY_OPTIONS = [
  { flag: '🇰🇪', code: '+254', name: 'Kenya' },
  { flag: '🇺🇬', code: '+256', name: 'Uganda' },
  { flag: '🇹🇿', code: '+255', name: 'Tanzania' },
];

const STEPS = ['Personal', 'Verify', 'Location', 'Profile', 'Labour & Land', 'Password'];

const LAND_DOC_OPTIONS = [
  { value: 'title_deed',      label: 'Title Deed' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'communal',        label: 'Communal / Group' },
  { value: 'inherited',       label: 'Inherited (No Deed)' },
  { value: 'no_document',     label: 'No Documentation' },
];

const LABOUR_TYPE_OPTIONS = [
  { value: 'family_only', label: 'Family Only' },
  { value: 'hired',       label: 'Hired Workers' },
  { value: 'both',        label: 'Family & Hired' },
];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport',    label: 'Passport' },
];

// ── Sub-components ─────────────────────────────────────────────────────────────
function ChipGroup({ options, value, onChange }) {
  return (
    <View style={s.chipRow}>
      {options.map((opt) => {
        const v = opt.value ?? opt;
        const isActive = value === v;
        return (
          <TouchableOpacity
            key={v}
            style={[s.chip, isActive && s.chipActive]}
            onPress={() => onChange(isActive ? '' : v)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, isActive && s.chipTextActive]}>{opt.label ?? opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Dropdown({ value, options, onChange, placeholder, disabled, error }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[s.dropdownBtn, error && s.dropdownBtnError, disabled && s.dropdownBtnDisabled]}
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

// ── Main screen ────────────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  // ── Step 1: Personal ──────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [country,     setCountry]     = useState(COUNTRY_OPTIONS[0]);
  const [phoneLocal,  setPhoneLocal]  = useState('');
  const [email,       setEmail]       = useState('');
  const [showCountry, setShowCountry] = useState(false);

  // ── Step 2: OTP ───────────────────────────────────────────────────────────
  const [otp,          setOtp]          = useState(['', '', '', '', '', '']);
  const [resendTimer,  setResendTimer]  = useState(0);
  const [otpVerified,  setOtpVerified]  = useState(false);
  const [verifying,    setVerifying]    = useState(false);
  const [devCode,      setDevCode]      = useState('');
  const otpRefs = useRef([]);

  // ── Step 3: Location & Cooperative ───────────────────────────────────────
  const [county,       setCounty]       = useState('');
  const [subcounty,    setSubcounty]    = useState('');
  const divisions = divisionsForCountry(country.name);
  const allL1Options = Object.keys(divisions.data).sort();
  const subOptions = county ? (divisions.data[county] || []) : [];
  const [coopQuery,    setCoopQuery]    = useState('');
  const [coopResults,  setCoopResults]  = useState([]);
  const [selectedCoop, setSelectedCoop] = useState(null);  // {id, code, name, county}
  const [coopSearching, setCoopSearching] = useState(false);
  const searchTimer = useRef(null);
  const [coopMemberNo, setCoopMemberNo] = useState('');

  // ── Direct cooperative code entry ─────────────────────────────────────────
  const [directCode,        setDirectCode]        = useState('');
  const [directCodeMode,    setDirectCodeMode]    = useState(false);
  const [directCodeLoading, setDirectCodeLoading] = useState(false);

  // ── Step 4: Profile ───────────────────────────────────────────────────────
  const [gender,        setGender]        = useState('');
  const [idType,        setIdType]        = useState('');
  const [idNumber,      setIdNumber]      = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Step 5: Labour & Land ────────────────────────────────────────────────
  const [landDocType,        setLandDocType]        = useState('');
  const [laborType,          setLaborType]          = useState('');
  const [childrenInvolved,   setChildrenInvolved]   = useState(null);
  const [workersCanLeave,    setWorkersCanLeave]    = useState(null);

  // ── Step 6: Password ──────────────────────────────────────────────────────
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [step,        setStep]        = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [touched,     setTouched]     = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [checking,    setChecking]    = useState({});
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const fullPhone = `${country.code}${phoneLocal.replace(/^0/, '')}`;

  // ── Duplicate field check (on blur) ──────────────────────────────────────
  const checkDuplicate = async (field, value) => {
    if (!value || !value.trim()) return;
    setChecking(prev => ({ ...prev, [field]: true }));
    try {
      const { authAPI } = require('../services/api');
      const res = await authAPI.checkField(field, value.trim());
      if (!res.data?.available) {
        const labels = { email: 'Email', phone: 'Phone number', national_id: 'ID number' };
        setFieldErrors(prev => ({ ...prev, [field]: `${labels[field] || field} is already registered.` }));
      } else {
        setFieldErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
      }
    } catch (_) {
      // silently ignore — server will catch duplicates at submit time
    } finally {
      setChecking(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  // ── Shake animation ───────────────────────────────────────────────────────
  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const fail = (msg) => { setError(msg); shake(); };

  // ── Resend countdown ──────────────────────────────────────────────────────
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── OTP helpers ───────────────────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    setError('');
    if (val && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
    // Auto-verify when all 6 digits entered
    if (val && next.filter(Boolean).length === 6) {
      autoVerifyOtp(next.join(''));
    }
  };

  const handleOtpKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const autoVerifyOtp = async (code) => {
    if (otpVerified || verifying) return;
    setVerifying(true);
    setError('');
    try {
      const { authAPI } = require('../services/api');
      await authAPI.verifyOtp(fullPhone, code);
      setOtpVerified(true);
      setDevCode('');
      // Short delay so user sees the success state, then advance
      setTimeout(() => {
        setStep(2);
        setTouched(false);
      }, 600);
    } catch (e) {
      fail(e.response?.data?.detail || 'Invalid or expired code.');
      // Clear the OTP so user can retry
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = () => {
    const code = otp.join('');
    if (code.length < 6) return fail('Enter all 6 digits.');
    autoVerifyOtp(code);
  };

  const sendOtp = async () => {
    const { authAPI } = require('../services/api');
    const res = await authAPI.sendOtp(fullPhone);
    setResendTimer(60);
    setOtpVerified(false);
    setOtp(['', '', '', '', '', '']);
    setTimeout(() => otpRefs.current[0]?.focus(), 300);
    if (res.data?.dev_code) {
      setDevCode(res.data.dev_code);
    }
    return res;
  };

  // ── Cooperative search ────────────────────────────────────────────────────
  const handleCoopQueryChange = (text) => {
    setCoopQuery(text);
    setSelectedCoop(null);
    setError('');
    clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setCoopResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setCoopSearching(true);
      try {
        const { authAPI } = require('../services/api');
        const res = await authAPI.searchCooperatives(text.trim());
        setCoopResults(res.data?.cooperatives || []);
      } catch (_) {
        setCoopResults([]);
      } finally {
        setCoopSearching(false);
      }
    }, 350);
  };

  const selectCoop = (coop) => {
    setSelectedCoop(coop);
    setCoopQuery(coop.name);
    setCoopResults([]);
  };

  const lookupByCode = async () => {
    const code = directCode.trim().toUpperCase();
    if (!code) return fail('Enter a cooperative code.');
    setDirectCodeLoading(true);
    setError('');
    try {
      const { authAPI } = require('../services/api');
      const res = await authAPI.searchCooperatives(code);
      const results = res.data?.cooperatives || [];
      const match = results.find(c => c.code?.toUpperCase() === code) || results[0];
      if (match) {
        selectCoop(match);
        setDirectCodeMode(false);
        setDirectCode('');
      } else {
        fail(`No cooperative found with code "${code}". Ask your officer for the correct code.`);
      }
    } catch (_) {
      fail('Could not look up cooperative. Check your connection and try again.');
    } finally {
      setDirectCodeLoading(false);
    }
  };

  // ── Step navigation ───────────────────────────────────────────────────────
  const goBack = () => { setError(''); setTouched(false); setStep(s => s - 1); };

  const handleNext = async () => {
    setTouched(true);
    setError('');

    // ── Step 0: validate → check duplicates → send OTP ────────────────────
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim() || !phoneLocal.trim()) {
        return fail('First name, last name and phone are required.');
      }
      setLoading(true);
      try {
        const { authAPI } = require('../services/api');

        // Always check phone before wasting OTP credits
        const phoneRes = await authAPI.checkField('phone', fullPhone);
        if (!phoneRes.data?.available) {
          setFieldErrors(prev => ({ ...prev, phone: 'Phone number is already registered.' }));
          return fail('This phone number is already registered. Please sign in instead.');
        }

        // Check email only if provided
        if (email.trim()) {
          const emailRes = await authAPI.checkField('email', email.trim().toLowerCase());
          if (!emailRes.data?.available) {
            setFieldErrors(prev => ({ ...prev, email: 'Email is already registered.' }));
            return fail('This email address is already registered.');
          }
        }

        await sendOtp();
        setStep(1);
        setTouched(false);
      } catch (e) {
        fail(e.response?.data?.detail || 'Failed to send verification code. Check your number.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Step 1: OTP already auto-verified, just advance ────────────────────
    if (step === 1) {
      if (!otpVerified) {
        const code = otp.join('');
        if (code.length < 6) return fail('Enter all 6 digits.');
        await handleManualVerify();
        return;
      }
      setStep(2);
      setTouched(false);
      return;
    }

    // ── Step 2: Location & Cooperative ─────────────────────────────────────
    if (step === 2) {
      if (!county.trim() || !subcounty.trim()) return fail('County and sub-county are required.');
      if (!selectedCoop) return fail('Please select a cooperative from the search results.');
      if (!coopMemberNo.trim() && selectedCoop) {
        const rand = Math.floor(Math.random() * 999999) + 1;
        setCoopMemberNo(`${selectedCoop.code}-${rand}`);
      }
      setStep(3);
      setTouched(false);
      return;
    }

    // ── Step 3: Profile ────────────────────────────────────────────────────
    if (step === 3) {
      if (!gender) return fail('Please select your gender.');
      if (fieldErrors.national_id) return fail(fieldErrors.national_id);
      if (!termsAccepted) return fail('You must accept the Terms of Use to continue.');
      setStep(4);
      setTouched(false);
      return;
    }

    // ── Step 4: Labour & Land (all optional — skip or fill freely) ───────────
    if (step === 4) {
      setStep(5);
      setTouched(false);
      return;
    }

    // ── Step 5: Password → submit ──────────────────────────────────────────
    if (step === 5) {
      if (password.length < 8) return fail('Password must be at least 8 characters.');
      if (password !== confirmPassword) return fail('Passwords do not match.');
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const result = await register({
      first_name:       firstName.trim(),
      last_name:        lastName.trim(),
      phone_number:     fullPhone,
      email:            email.trim().toLowerCase() || undefined,
      country:          country.name,
      county:           county.trim(),
      subcounty:        subcounty.trim(),
      cooperative_code: selectedCoop?.code || undefined,
      cooperative_id:   selectedCoop?.id   || undefined,
      membership_number: coopMemberNo.trim() || undefined,
      gender:              gender || undefined,
      id_type:             idType || undefined,
      id_number:           idNumber.trim() || undefined,
      land_doc_type:       landDocType || undefined,
      labour_type:         laborType || undefined,
      children_involved:   childrenInvolved ?? undefined,
      workers_can_leave:   workersCanLeave ?? undefined,
      data_consent:        true,
      password,
    });
    setLoading(false);
    if (!result.success) {
      shake();
      setError(result.error || 'Registration failed. Please try again.');
      setStep(5);
    }
    // On success AuthContext sets user → AppNavigator routes automatically
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={s.bg}>
        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView
              contentContainerStyle={s.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Logo */}
              <View style={s.logoWrap}>
                <View style={s.logoCircle}>
                  <Image source={require('../../assets/plotra-logo.png')} style={s.logo} resizeMode="contain" />
                </View>
                <Text style={s.brand}>PLOTRA</Text>
                <Text style={s.tagline}>Traceable Farms</Text>
              </View>

              <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

                {/* Step progress */}
                <View style={s.progressRow}>
                  {STEPS.map((label, i) => (
                    <View key={label} style={s.progressItem}>
                      <View style={[s.dot, i < step && s.dotDone, i === step && s.dotActive]}>
                        <Text style={[s.dotText, i <= step && s.dotTextLight]}>
                          {i < step ? '✓' : i + 1}
                        </Text>
                      </View>
                      <Text style={[s.dotLabel, i === step && s.dotLabelActive]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* ── STEP 0: Personal Info ────────────────────────────────── */}
                {step === 0 && (
                  <>
                    <Text style={s.title}>Create Account</Text>
                    <Text style={s.subtitle}>Join the Sustainability Mapping Platform</Text>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Text style={s.label}>First Name *</Text>
                        <TextInput
                          style={[s.input, touched && !firstName.trim() && s.inputError]}
                          value={firstName} onChangeText={setFirstName}
                          placeholder="First" placeholderTextColor="rgba(255,255,255,0.38)"
                          autoCapitalize="words" returnKeyType="next"
                        />
                      </View>
                      <View style={{ width: 12 }} />
                      <View style={s.half}>
                        <Text style={s.label}>Last Name *</Text>
                        <TextInput
                          style={[s.input, touched && !lastName.trim() && s.inputError]}
                          value={lastName} onChangeText={setLastName}
                          placeholder="Last" placeholderTextColor="rgba(255,255,255,0.38)"
                          autoCapitalize="words" returnKeyType="next"
                        />
                      </View>
                    </View>

                    <Text style={s.label}>Phone Number *</Text>
                    <View style={s.phoneRow}>
                      <TouchableOpacity style={s.countryBtn} onPress={() => setShowCountry(v => !v)} activeOpacity={0.8}>
                        <Text style={s.countryFlag}>{country.flag}</Text>
                        <Text style={s.countryCode}>{country.code}</Text>
                        <Text style={s.caret}>▾</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[s.input, s.phoneInput, (touched && !phoneLocal.trim() || fieldErrors.phone) && s.inputError]}
                        value={phoneLocal}
                        onChangeText={(v) => { setPhoneLocal(v); setFieldErrors(prev => { const n = { ...prev }; delete n.phone; return n; }); }}
                        onBlur={() => { if (phoneLocal.trim().length >= 7) checkDuplicate('phone', `${country.code}${phoneLocal.replace(/^0/, '')}`); }}
                        placeholder="712 345 678" placeholderTextColor="rgba(255,255,255,0.38)"
                        keyboardType="phone-pad" maxLength={10}
                      />
                    </View>
                    {!!fieldErrors.phone && <Text style={s.errText}>{fieldErrors.phone}</Text>}
                    {showCountry && (
                      <View style={s.countryMenu}>
                        {COUNTRY_OPTIONS.map(c => (
                          <TouchableOpacity key={c.name} style={s.countryOption}
                            onPress={() => { setCountry(c); setShowCountry(false); }} activeOpacity={0.8}>
                            <Text style={s.countryOptionText}>{c.flag}  {c.name}  {c.code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text style={s.label}>Email <Text style={s.optional}>(optional)</Text></Text>
                    <TextInput
                      style={[s.input, fieldErrors.email && s.inputError]}
                      value={email}
                      onChangeText={(v) => { setEmail(v); setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n; }); }}
                      onBlur={() => { if (email.trim()) checkDuplicate('email', email.trim().toLowerCase()); }}
                      placeholder="email@example.com" placeholderTextColor="rgba(255,255,255,0.38)"
                      autoCapitalize="none" keyboardType="email-address"
                    />
                    {!!fieldErrors.email && <Text style={[s.errText, { marginTop: -10, marginBottom: 12 }]}>{fieldErrors.email}</Text>}
                  </>
                )}

                {/* ── STEP 1: OTP Verification ─────────────────────────────── */}
                {step === 1 && (
                  <>
                    <Text style={s.title}>Verify Phone</Text>
                    <Text style={s.subtitle}>
                      We sent a 6-digit code to <Text style={s.phoneHighlight}>{fullPhone}</Text>
                    </Text>

                    {/* OTP boxes */}
                    <View style={s.otpRow}>
                      {otp.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={ref => { otpRefs.current[i] = ref; }}
                          style={[
                            s.otpBox,
                            digit && s.otpBoxFilled,
                            otpVerified && s.otpBoxVerified,
                          ]}
                          value={digit}
                          onChangeText={v => handleOtpChange(v, i)}
                          onKeyPress={e => handleOtpKey(e, i)}
                          keyboardType="numeric"
                          maxLength={1}
                          textAlign="center"
                          selectTextOnFocus
                          editable={!otpVerified}
                        />
                      ))}
                    </View>

                    {/* Dev-mode OTP banner — stays until verified */}
                    {!!devCode && !otpVerified && (
                      <View style={s.devCodeBanner}>
                        <Text style={s.devCodeLabel}>DEV MODE — Your OTP code:</Text>
                        <Text style={s.devCodeValue}>{devCode}</Text>
                      </View>
                    )}

                    {/* Verified banner */}
                    {otpVerified && (
                      <View style={s.verifiedBanner}>
                        <Text style={s.verifiedText}>✓ Phone verified</Text>
                      </View>
                    )}

                    {/* Verifying spinner */}
                    {verifying && (
                      <View style={s.verifyingRow}>
                        <ActivityIndicator size="small" color={C.c700} />
                        <Text style={s.verifyingText}>Verifying…</Text>
                      </View>
                    )}

                    {/* Manual verify + resend */}
                    {!otpVerified && !verifying && (
                      <View style={s.otpActionsRow}>
                        <TouchableOpacity
                          style={[s.verifyBtn, otp.join('').length < 6 && s.verifyBtnDisabled]}
                          onPress={handleManualVerify}
                          disabled={otp.join('').length < 6}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.verifyBtnText, otp.join('').length < 6 && s.verifyBtnTextDisabled]}>
                            Verify
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[s.resendBtn, resendTimer > 0 && s.resendBtnDisabled]}
                          onPress={async () => {
                            if (resendTimer > 0 || loading) return;
                            setLoading(true);
                            try { await sendOtp(); } catch (e) { fail('Failed to resend.'); }
                            finally { setLoading(false); }
                          }}
                          disabled={resendTimer > 0 || loading}
                          activeOpacity={0.7}
                        >
                          <Text style={[s.resendText, resendTimer > 0 && s.resendTextDisabled]}>
                            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {/* ── STEP 2: Location & Cooperative ──────────────────────── */}
                {step === 2 && (
                  <>
                    <Text style={s.title}>Your Location</Text>
                    <Text style={s.subtitle}>Enter your location and find your cooperative.</Text>

                    <Text style={s.label}>{divisions.l1} *</Text>
                    <Dropdown
                      value={county}
                      options={allL1Options}
                      onChange={(val) => { setCounty(val); setSubcounty(''); }}
                      placeholder={`Select ${divisions.l1}`}
                      error={touched && !county.trim()}
                    />
                    {touched && !county.trim() && <Text style={s.errText}>{divisions.l1} is required</Text>}

                    <Text style={s.label}>{divisions.l2} *</Text>
                    <Dropdown
                      value={subcounty}
                      options={subOptions}
                      onChange={setSubcounty}
                      placeholder={county ? `Select ${divisions.l2}` : `Select ${divisions.l1} first`}
                      disabled={!county}
                      error={touched && !subcounty.trim()}
                    />
                    {touched && !subcounty.trim() && <Text style={s.errText}>{divisions.l2} is required</Text>}

                    {/* Cooperative search */}
                    <Text style={s.label}>Cooperative *</Text>
                    <Text style={s.fieldHint}>Type your cooperative name or code to search</Text>

                    <View style={s.coopSearchWrap}>
                      <TextInput
                        style={[s.input, s.coopSearchInput, touched && !selectedCoop && s.inputError]}
                        value={coopQuery}
                        onChangeText={handleCoopQueryChange}
                        placeholder="Search cooperative…"
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        returnKeyType="search"
                        autoCapitalize="none"
                      />
                      {coopSearching && (
                        <ActivityIndicator size="small" color={C.c700} style={s.coopSpinner} />
                      )}
                    </View>

                    {/* Search results dropdown */}
                    {coopResults.length > 0 && !selectedCoop && (
                      <View style={s.coopDropdown}>
                        {coopResults.map((coop) => (
                          <TouchableOpacity
                            key={coop.id}
                            style={s.coopOption}
                            onPress={() => selectCoop(coop)}
                            activeOpacity={0.8}
                          >
                            <View style={s.coopOptionLeft}>
                              <Text style={s.coopOptionName}>{coop.name}</Text>
                              <Text style={s.coopOptionMeta}>
                                {coop.code}{coop.county ? `  ·  ${coop.county}` : ''}
                              </Text>
                            </View>
                            <View style={s.coopCodeBadge}>
                              <Text style={s.coopCodeText}>{coop.code}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* No results */}
                    {coopQuery.length >= 2 && !coopSearching && coopResults.length === 0 && !selectedCoop && (
                      <View style={s.coopNoResults}>
                        <Text style={s.coopNoResultsText}>No cooperatives found for "{coopQuery}"</Text>
                        <Text style={s.coopNoResultsSub}>Ask your cooperative officer for the exact code</Text>
                      </View>
                    )}

                    {/* Direct code entry toggle */}
                    {!selectedCoop && (
                      <>
                        <View style={s.orDivider}>
                          <View style={s.orLine} />
                          <TouchableOpacity
                            style={s.orBtn}
                            onPress={() => { setDirectCodeMode(v => !v); setError(''); }}
                            activeOpacity={0.75}
                          >
                            <Ionicons name={directCodeMode ? 'search-outline' : 'keypad-outline'} size={13} color="rgba(255,255,255,0.75)" />
                            <Text style={s.orBtnText}>
                              {directCodeMode ? 'Search by name instead' : 'Enter code directly'}
                            </Text>
                          </TouchableOpacity>
                          <View style={s.orLine} />
                        </View>

                        {directCodeMode && (
                          <View style={s.directCodeWrap}>
                            <View style={s.directCodeRow}>
                              <TextInput
                                style={[s.input, s.directCodeInput]}
                                value={directCode}
                                onChangeText={v => setDirectCode(v.toUpperCase())}
                                placeholder="e.g. KAPCOOP"
                                placeholderTextColor="rgba(255,255,255,0.38)"
                                autoCapitalize="characters"
                                returnKeyType="done"
                                onSubmitEditing={lookupByCode}
                              />
                              <TouchableOpacity
                                style={[s.directCodeBtn, (!directCode.trim() || directCodeLoading) && s.directCodeBtnDisabled]}
                                onPress={lookupByCode}
                                disabled={!directCode.trim() || directCodeLoading}
                                activeOpacity={0.85}
                              >
                                {directCodeLoading
                                  ? <ActivityIndicator size="small" color={C.white} />
                                  : <Text style={s.directCodeBtnText}>Find</Text>
                                }
                              </TouchableOpacity>
                            </View>
                            <Text style={s.directCodeHint}>Enter the exact cooperative code your officer gave you</Text>
                          </View>
                        )}
                      </>
                    )}

                    {/* Selected cooperative card */}
                    {selectedCoop && (
                      <View style={s.coopSelectedCard}>
                        <View style={s.coopSelectedIcon}>
                          <Text style={s.coopSelectedIconText}>🤝</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.coopSelectedName}>{selectedCoop.name}</Text>
                          <Text style={s.coopSelectedMeta}>
                            Code: {selectedCoop.code}{selectedCoop.county ? `  ·  ${selectedCoop.county}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => { setSelectedCoop(null); setCoopQuery(''); setCoopResults([]); }}
                          style={s.coopClearBtn}
                          activeOpacity={0.7}
                        >
                          <Text style={s.coopClearText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {touched && !selectedCoop && <Text style={s.errText}>Please select a cooperative</Text>}

                    {/* Member number */}
                    <Text style={[s.label, { marginTop: 20 }]}>
                      Member Number <Text style={s.optional}>(optional)</Text>
                    </Text>
                    <Text style={s.fieldHint}>Your cooperative membership number — leave blank to auto-generate</Text>
                    <TextInput
                      style={s.input}
                      value={coopMemberNo}
                      onChangeText={v => setCoopMemberNo(v.toUpperCase())}
                      placeholder={selectedCoop ? `e.g. ${selectedCoop.code}-0001` : 'e.g. KAPCOOP-0001'}
                      placeholderTextColor="rgba(255,255,255,0.38)"
                      autoCapitalize="characters"
                      returnKeyType="done"
                    />
                  </>
                )}

                {/* ── STEP 3: Gender & ID ──────────────────────────────────── */}
                {step === 3 && (
                  <>
                    <Text style={s.title}>Personal Details</Text>
                    <Text style={s.subtitle}>Required for gender-inclusive programs and identity verification.</Text>

                    <Text style={s.label}>Gender *</Text>
                    <ChipGroup options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                    {touched && !gender && <Text style={s.errText}>Required</Text>}

                    <Text style={[s.label, { marginTop: 20 }]}>ID Type <Text style={s.optional}>(optional)</Text></Text>
                    <ChipGroup options={ID_TYPES} value={idType} onChange={setIdType} />

                    {idType && (
                      <>
                        <Text style={[s.label, { marginTop: 16 }]}>ID Number</Text>
                        <TextInput
                          style={[s.input, fieldErrors.national_id && s.inputError]}
                          value={idNumber}
                          onChangeText={(v) => { setIdNumber(v); setFieldErrors(prev => { const n = { ...prev }; delete n.national_id; return n; }); }}
                          onBlur={() => { if (idNumber.trim()) checkDuplicate('national_id', idNumber.trim()); }}
                          placeholder="Enter your ID number" placeholderTextColor="rgba(255,255,255,0.38)"
                        />
                        {!!fieldErrors.national_id && <Text style={[s.errText, { marginTop: -10, marginBottom: 12 }]}>{fieldErrors.national_id}</Text>}
                      </>
                    )}

                    <TouchableOpacity style={s.termsRow} onPress={() => setTermsAccepted(v => !v)} activeOpacity={0.8}>
                      <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
                        {termsAccepted && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.termsText}>
                        I agree to the <Text style={s.termsLink}>Terms of Use</Text> and consent to data collection & processing *
                      </Text>
                    </TouchableOpacity>
                    {touched && !termsAccepted && <Text style={s.errText}>You must accept the terms</Text>}
                  </>
                )}

                {/* ── STEP 4: Labour & Land ────────────────────────────────── */}
                {step === 4 && (
                  <>
                    <Text style={s.title}>Labour & Land</Text>
                    <Text style={s.subtitle}>All fields are optional — answer what applies to you, or skip the entire step.</Text>

                    <Text style={s.label}>Land Documentation</Text>
                    <Text style={s.fieldHint}>What type of land rights documentation do you have?</Text>
                    <ChipGroup options={LAND_DOC_OPTIONS} value={landDocType} onChange={setLandDocType} />

                    <Text style={[s.label, { marginTop: 16 }]}>Labour System</Text>
                    <Text style={s.fieldHint}>Who carries out work on your farm?</Text>
                    <ChipGroup options={LABOUR_TYPE_OPTIONS} value={laborType} onChange={setLaborType} />

                    <Text style={[s.label, { marginTop: 16 }]}>Child Labour</Text>
                    <Text style={s.fieldHint}>Are children under 15 years involved in farm work?</Text>
                    <View style={s.yesNoRow}>
                      {[['Yes', true], ['No', false]].map(([label, val]) => (
                        <TouchableOpacity
                          key={label}
                          style={[s.yesNoBtn, childrenInvolved === val && s.yesNoBtnActive]}
                          onPress={() => setChildrenInvolved(childrenInvolved === val ? null : val)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.yesNoBtnText, childrenInvolved === val && s.yesNoBtnTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {childrenInvolved && (
                      <View style={s.warningBox}>
                        <Text style={s.warningText}>Note: Children may participate only in light, non-hazardous tasks outside school hours, as permitted by ILO Convention 138.</Text>
                      </View>
                    )}

                    <Text style={[s.label, { marginTop: 16 }]}>Freedom to Leave</Text>
                    <Text style={s.fieldHint}>Are all workers free to leave employment at any time?</Text>
                    <View style={s.yesNoRow}>
                      {[['Yes', true], ['No', false]].map(([label, val]) => (
                        <TouchableOpacity
                          key={label}
                          style={[s.yesNoBtn, workersCanLeave === val && s.yesNoBtnActive]}
                          onPress={() => setWorkersCanLeave(workersCanLeave === val ? null : val)}
                          activeOpacity={0.8}
                        >
                          <Text style={[s.yesNoBtnText, workersCanLeave === val && s.yesNoBtnTextActive]}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                {/* ── STEP 5: Password ─────────────────────────────────────── */}
                {step === 5 && (
                  <>
                    <Text style={s.title}>Create Password</Text>
                    <Text style={s.subtitle}>Minimum 8 characters.</Text>

                    <Text style={s.label}>Password *</Text>
                    <View style={[s.pwdRow, { marginBottom: 20 }]}>
                      <TextInput
                        style={[s.input, s.pwdInput, touched && password.length < 8 && s.inputError]}
                        value={password} onChangeText={setPassword}
                        placeholder="Min. 8 characters" placeholderTextColor="rgba(255,255,255,0.38)"
                        secureTextEntry={!showPwd} returnKeyType="next"
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
                        <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
                      </TouchableOpacity>
                    </View>

                    <Text style={s.label}>Confirm Password *</Text>
                    <View style={s.pwdRow}>
                      <TextInput
                        style={[s.input, s.pwdInput, touched && password !== confirmPassword && s.inputError]}
                        value={confirmPassword} onChangeText={setConfirmPassword}
                        placeholder="Re-enter password" placeholderTextColor="rgba(255,255,255,0.38)"
                        secureTextEntry={!showConfirmPwd} returnKeyType="done"
                        onSubmitEditing={handleNext}
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd(v => !v)} activeOpacity={0.7}>
                        <Ionicons name={showConfirmPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
                      </TouchableOpacity>
                    </View>
                  </>
                )}


                {/* Error */}
                {!!error && (
                  <View style={[s.errorBox, error.startsWith('Dev mode') && s.devBox]}>
                    <Text style={[s.errorText, error.startsWith('Dev mode') && s.devText]}>{error}</Text>
                  </View>
                )}

                {/* Buttons */}
                <View style={s.btnRow}>
                  {step > 0 && (
                    <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
                      <Text style={s.backBtnText}>Back</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.btn, { flex: step > 0 ? 2 : 1 }, (loading || verifying) && s.btnDisabled]}
                    onPress={handleNext}
                    disabled={loading || verifying}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color={C.white} />
                    ) : (
                      <Text style={s.btnText}>
                        {step === 5 ? 'Create Account ✓'
                          : step === 1 && otpVerified ? 'Next: Location'
                          : 'Next'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Skip Step — Labour & Land only */}
                {step === 4 && (
                  <TouchableOpacity
                    style={s.skipBtn}
                    onPress={() => {
                      setLandDocType('');
                      setLaborType('');
                      setChildrenInvolved(null);
                      setWorkersCanLeave(null);
                      setError('');
                      setTouched(false);
                      setStep(5);
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={s.skipBtnText}>Skip this step  →</Text>
                  </TouchableOpacity>
                )}

                {/* Sign in link — only on first step */}
                {step === 0 && (
                  <>
                    <View style={s.divider}>
                      <View style={s.line} />
                      <Text style={s.divText}>Already have an account?</Text>
                      <View style={s.line} />
                    </View>
                    <TouchableOpacity style={s.signInBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                      <Text style={s.signInText}>Sign In</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>

              <Text style={s.version}>Plotra Agent App • v1.1.0</Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.c800 },
  bg: { flex: 1, backgroundColor: C.c800 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingTop: 44, paddingBottom: 36 },

  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logoCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: C.white, padding: 3, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  logo: { width: '100%', height: '100%', borderRadius: 32 },
  brand: { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: 6, marginBottom: 4 },
  tagline: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },

  form: { paddingHorizontal: 2 },

  // Progress
  progressRow: { flexDirection: 'row', marginBottom: 18, gap: 2 },
  progressItem: { flex: 1, alignItems: 'center', gap: 3 },
  dot: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.c700 },
  dotDone: { backgroundColor: '#22c55e' },
  dotText: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.5)' },
  dotTextLight: { color: C.white },
  dotLabel: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },
  dotLabelActive: { color: '#86efac' },

  title: { fontSize: 19, fontWeight: '800', color: C.white, marginBottom: 4 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 17, marginBottom: 16 },
  phoneHighlight: { color: '#86efac', fontWeight: '700' },

  row: { flexDirection: 'row', marginBottom: 0 },
  half: { flex: 1 },

  label: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 6, marginLeft: 1 },
  optional: { fontWeight: '500', color: 'rgba(255,255,255,0.38)', textTransform: 'none' },
  fieldHint: { fontSize: 10, color: 'rgba(255,255,255,0.42)', fontStyle: 'italic', marginTop: -3, marginBottom: 6, marginLeft: 1 },
  input: { backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, height: 44, paddingHorizontal: 13, fontSize: 14, color: C.white, fontWeight: '500', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginBottom: 12 },
  inputError: { borderColor: '#f87171', backgroundColor: 'rgba(220,38,38,0.1)' },
  errText: { fontSize: 11, color: '#fca5a5', fontWeight: '700', marginTop: -8, marginBottom: 10, marginLeft: 1 },

  phoneRow: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, height: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  countryFlag: { fontSize: 16 },
  countryCode: { fontSize: 13, fontWeight: '700', color: C.white },
  caret: { fontSize: 9, color: 'rgba(255,255,255,0.4)' },
  phoneInput: { flex: 1, marginBottom: 0 },
  countryMenu: { backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.steel200, marginBottom: 12, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  countryOption: { paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  countryOptionText: { fontSize: 13, fontWeight: '600', color: C.ink },

  // OTP
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 16 },
  otpBox: { width: 42, height: 50, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.09)', fontSize: 20, fontWeight: '900', color: C.white },
  otpBoxFilled: { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.14)' },
  otpBoxVerified: { borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.14)' },
  verifiedBanner: { backgroundColor: 'rgba(74,222,128,0.13)', borderRadius: 9, padding: 10, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#4ade80' },
  verifiedText: { fontSize: 13, fontWeight: '800', color: '#86efac' },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 10 },
  verifyingText: { fontSize: 13, color: '#86efac', fontWeight: '600' },
  otpActionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 6 },
  verifyBtn: { backgroundColor: C.c700, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  verifyBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.13)' },
  verifyBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  verifyBtnTextDisabled: { color: 'rgba(255,255,255,0.33)' },
  resendBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
  resendBtnDisabled: { borderColor: 'rgba(255,255,255,0.1)' },
  resendText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.78)' },
  resendTextDisabled: { color: 'rgba(255,255,255,0.28)' },

  // Cooperative search
  coopSearchWrap: { position: 'relative' },
  coopSearchInput: { paddingRight: 40 },
  coopSpinner: { position: 'absolute', right: 13, top: 12 },
  coopDropdown: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.steel200, marginBottom: 10, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  coopOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: C.steel100, gap: 10 },
  coopOptionLeft: { flex: 1 },
  coopOptionName: { fontSize: 13, fontWeight: '800', color: C.c900, marginBottom: 1 },
  coopOptionMeta: { fontSize: 11, color: C.muted, fontWeight: '500' },
  coopCodeBadge: { backgroundColor: C.c100, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  coopCodeText: { fontSize: 10, fontWeight: '800', color: C.c700, letterSpacing: 0.8 },
  coopNoResults: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: 11, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  coopNoResultsText: { fontSize: 12, color: C.white, fontWeight: '700', marginBottom: 3 },
  coopNoResultsSub: { fontSize: 11, color: 'rgba(255,255,255,0.52)' },
  coopSelectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 10, padding: 11, marginBottom: 6, borderWidth: 1, borderColor: '#4ade80', gap: 10 },
  coopSelectedIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(74,222,128,0.18)', alignItems: 'center', justifyContent: 'center' },
  coopSelectedIconText: { fontSize: 17 },
  coopSelectedName: { fontSize: 13, fontWeight: '800', color: '#86efac', marginBottom: 1 },
  coopSelectedMeta: { fontSize: 11, color: 'rgba(134,239,172,0.75)', fontWeight: '500' },
  coopClearBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(74,222,128,0.18)', alignItems: 'center', justifyContent: 'center' },
  coopClearText: { fontSize: 11, color: '#86efac', fontWeight: '800' },

  // Direct code entry
  orDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 7 },
  orLine:    { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.13)' },
  orBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  orBtnText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  directCodeWrap: { marginBottom: 6 },
  directCodeRow:  { flexDirection: 'row', gap: 7, alignItems: 'center' },
  directCodeInput: { flex: 1, marginBottom: 0, letterSpacing: 1.5, fontWeight: '700' },
  directCodeBtn:  { height: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  directCodeBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.13)' },
  directCodeBtnText: { fontSize: 13, fontWeight: '800', color: C.white },
  directCodeHint: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginTop: 5, marginLeft: 1 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 3 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.07)' },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  chipTextActive: { color: C.white },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 16, marginBottom: 3 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: C.c700, borderColor: C.c700 },
  checkmark: { color: C.white, fontSize: 12, fontWeight: '900' },
  termsText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.62)', lineHeight: 17 },
  termsLink: { color: '#86efac', fontWeight: '700' },

  // Password
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  pwdInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0, marginBottom: 0 },
  eyeBtn: { height: 44, width: 44, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderLeftWidth: 0, borderColor: 'rgba(255,255,255,0.18)', borderTopRightRadius: 10, borderBottomRightRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Error
  errorBox: { backgroundColor: 'rgba(220,38,38,0.1)', borderRadius: 9, padding: 10, marginTop: 12, borderWidth: 1, borderColor: 'rgba(220,38,38,0.28)' },
  errorText: { fontSize: 12, color: '#fca5a5', fontWeight: '700' },
  devBox: { backgroundColor: '#fff8e1', borderColor: '#fbbf24' },
  devCodeBanner: { backgroundColor: '#fffbeb', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 2, borderColor: '#f59e0b', alignItems: 'center' },
  devCodeLabel: { fontSize: 10, fontWeight: '800', color: '#92400e', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  devCodeValue: { fontSize: 28, fontWeight: '900', color: '#92400e', letterSpacing: 7 },
  devText: { color: '#92400e' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 9, marginTop: 16 },
  btn: { backgroundColor: C.c700, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 5 },
  btnDisabled: { backgroundColor: 'rgba(255,255,255,0.13)', shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 14, fontWeight: '800' },
  backBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  skipBtn: { marginTop: 10, height: 40, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  skipBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.13)' },
  divText: { marginHorizontal: 10, fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: 0.9 },
  signInBtn: { height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  signInText: { color: C.white, fontSize: 14, fontWeight: '700' },

  version: { textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.32)', fontSize: 11, fontWeight: '500' },

  yesNoRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  yesNoBtn: { flex: 1, height: 40, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  yesNoBtnActive: { backgroundColor: C.c700, borderColor: C.c700 },
  yesNoBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.72)' },
  yesNoBtnTextActive: { color: C.white },
  warningBox: { backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 9, padding: 10, marginTop: 7, borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' },
  warningText: { fontSize: 11, color: '#fde68a', lineHeight: 16, fontWeight: '500' },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.09)', borderRadius: 10, height: 44, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', marginBottom: 12 },
  dropdownBtnError: { borderColor: '#f87171', backgroundColor: 'rgba(220,38,38,0.1)' },
  dropdownBtnDisabled: { opacity: 0.5 },
  dropdownBtnText: { fontSize: 14, color: C.white, fontWeight: '500', flex: 1 },
  dropdownArrow: { fontSize: 11, color: 'rgba(255,255,255,0.42)', marginLeft: 6 },
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  ddSheet: { backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 38, maxHeight: '70%' },
  ddHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginBottom: 10 },
  ddTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  ddItemActive: { backgroundColor: C.c050, marginHorizontal: -18, paddingHorizontal: 18 },
  ddItemText: { fontSize: 14, color: C.ink, fontWeight: '500' },
  ddItemTextActive: { color: C.c700, fontWeight: '800' },
  ddCheck: { fontSize: 13, color: C.c700, fontWeight: '900' },
});
