import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ImageBackground, Image, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Animated, FlatList, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STEPS = ['Personal', 'Verify', 'Location', 'Profile', 'Password'];

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

  // ── Step 4: Profile ───────────────────────────────────────────────────────
  const [gender,        setGender]        = useState('');
  const [idType,        setIdType]        = useState('');
  const [idNumber,      setIdNumber]      = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Step 5: Password ──────────────────────────────────────────────────────
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [touched, setTouched] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const fullPhone = `${country.code}${phoneLocal.replace(/^0/, '')}`;

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
      // Dev mode: show code in error area temporarily
      setError(`Dev mode — OTP: ${res.data.dev_code}`);
      setTimeout(() => setError(''), 8000);
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

  // ── Step navigation ───────────────────────────────────────────────────────
  const goBack = () => { setError(''); setTouched(false); setStep(s => s - 1); };

  const handleNext = async () => {
    setTouched(true);
    setError('');

    // ── Step 0: validate then send OTP ─────────────────────────────────────
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim() || !phoneLocal.trim()) {
        return fail('First name, last name and phone are required.');
      }
      setLoading(true);
      try {
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
      setStep(3);
      setTouched(false);
      return;
    }

    // ── Step 3: Profile ────────────────────────────────────────────────────
    if (step === 3) {
      if (!gender) return fail('Please select your gender.');
      if (!termsAccepted) return fail('You must accept the Terms of Use to continue.');
      setStep(4);
      setTouched(false);
      return;
    }

    // ── Step 4: Password → submit ──────────────────────────────────────────
    if (step === 4) {
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
      gender:           gender || undefined,
      id_type:          idType || undefined,
      id_number:        idNumber.trim() || undefined,
      password,
    });
    setLoading(false);
    if (!result.success) {
      shake();
      setError(result.error || 'Registration failed. Please try again.');
      setStep(4);
    }
    // On success AuthContext sets user → AppNavigator routes automatically
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bg}
      >
        <View style={s.overlay} />
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
                  <Image source={require('../../assets/logo-plotra.png')} style={s.logo} resizeMode="contain" />
                </View>
                <Text style={s.brand}>PLOTRA</Text>
                <Text style={s.tagline}>Mapping Sustainability, Empowering Farmers</Text>
              </View>

              <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>

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
                          placeholder="First" placeholderTextColor={C.subtle}
                          autoCapitalize="words" returnKeyType="next"
                        />
                      </View>
                      <View style={{ width: 12 }} />
                      <View style={s.half}>
                        <Text style={s.label}>Last Name *</Text>
                        <TextInput
                          style={[s.input, touched && !lastName.trim() && s.inputError]}
                          value={lastName} onChangeText={setLastName}
                          placeholder="Last" placeholderTextColor={C.subtle}
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
                        style={[s.input, s.phoneInput, touched && !phoneLocal.trim() && s.inputError]}
                        value={phoneLocal} onChangeText={setPhoneLocal}
                        placeholder="712 345 678" placeholderTextColor={C.subtle}
                        keyboardType="phone-pad" maxLength={10}
                      />
                    </View>
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
                      style={s.input} value={email} onChangeText={setEmail}
                      placeholder="email@example.com" placeholderTextColor={C.subtle}
                      autoCapitalize="none" keyboardType="email-address"
                    />
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
                        placeholderTextColor={C.subtle}
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
                          style={s.input} value={idNumber} onChangeText={setIdNumber}
                          placeholder="Enter your ID number" placeholderTextColor={C.subtle}
                        />
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

                {/* ── STEP 4: Password ─────────────────────────────────────── */}
                {step === 4 && (
                  <>
                    <Text style={s.title}>Create Password</Text>
                    <Text style={s.subtitle}>Minimum 8 characters.</Text>

                    <Text style={s.label}>Password *</Text>
                    <View style={[s.pwdRow, { marginBottom: 20 }]}>
                      <TextInput
                        style={[s.input, s.pwdInput, touched && password.length < 8 && s.inputError]}
                        value={password} onChangeText={setPassword}
                        placeholder="Min. 8 characters" placeholderTextColor={C.subtle}
                        secureTextEntry={!showPwd} returnKeyType="next"
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                        <Text style={s.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={s.label}>Confirm Password *</Text>
                    <View style={s.pwdRow}>
                      <TextInput
                        style={[s.input, s.pwdInput, touched && password !== confirmPassword && s.inputError]}
                        value={confirmPassword} onChangeText={setConfirmPassword}
                        placeholder="Re-enter password" placeholderTextColor={C.subtle}
                        secureTextEntry={!showConfirmPwd} returnKeyType="done"
                        onSubmitEditing={handleNext}
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd(v => !v)}>
                        <Text style={s.eyeText}>{showConfirmPwd ? '🙈' : '👁️'}</Text>
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
                        {step === 4 ? 'Create Account ✓'
                          : step === 1 && otpVerified ? 'Next: Location'
                          : 'Next'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

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
      </ImageBackground>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.55)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: C.white, padding: 4, marginBottom: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 12 },
  logo: { width: '100%', height: '100%', borderRadius: 41 },
  brand: { fontSize: 30, fontWeight: '900', color: C.white, letterSpacing: 6, marginBottom: 6 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },

  card: { backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 28, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 16 },

  // Progress
  progressRow: { flexDirection: 'row', marginBottom: 24, gap: 2 },
  progressItem: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.steel200, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.c700 },
  dotDone: { backgroundColor: '#22c55e' },
  dotText: { fontSize: 11, fontWeight: '800', color: C.muted },
  dotTextLight: { color: C.white },
  dotLabel: { fontSize: 9, fontWeight: '700', color: C.subtle, textAlign: 'center' },
  dotLabelActive: { color: C.c700 },

  title: { fontSize: 24, fontWeight: '800', color: C.c900, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 20 },
  phoneHighlight: { color: C.c700, fontWeight: '700' },

  row: { flexDirection: 'row', marginBottom: 0 },
  half: { flex: 1 },

  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  optional: { fontWeight: '500', color: C.subtle, textTransform: 'none' },
  fieldHint: { fontSize: 11, color: C.subtle, fontStyle: 'italic', marginTop: -4, marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200, marginBottom: 16 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fff5f5' },
  errText: { fontSize: 12, color: '#dc2626', fontWeight: '700', marginTop: -10, marginBottom: 12, marginLeft: 2 },

  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.steel200 },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 14, fontWeight: '700', color: C.ink },
  caret: { fontSize: 10, color: C.subtle },
  phoneInput: { flex: 1, marginBottom: 0 },
  countryMenu: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.steel200, marginBottom: 16, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  countryOption: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  countryOptionText: { fontSize: 14, fontWeight: '600', color: C.ink },

  // OTP
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 20 },
  otpBox: { width: 46, height: 58, borderRadius: 14, borderWidth: 2, borderColor: C.steel200, backgroundColor: C.steel100, fontSize: 24, fontWeight: '900', color: C.ink },
  otpBoxFilled: { borderColor: C.c700, backgroundColor: '#fdf8f5' },
  otpBoxVerified: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  verifiedBanner: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  verifiedText: { fontSize: 14, fontWeight: '800', color: '#15803d' },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  verifyingText: { fontSize: 14, color: C.c700, fontWeight: '600' },
  otpActionsRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 8 },
  verifyBtn: { backgroundColor: C.c700, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  verifyBtnDisabled: { backgroundColor: C.steel300 },
  verifyBtnText: { fontSize: 14, fontWeight: '800', color: C.white },
  verifyBtnTextDisabled: { color: C.subtle },
  resendBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.c700 },
  resendBtnDisabled: { borderColor: C.steel300 },
  resendText: { fontSize: 13, fontWeight: '700', color: C.c700 },
  resendTextDisabled: { color: C.subtle },

  // Cooperative search
  coopSearchWrap: { position: 'relative' },
  coopSearchInput: { paddingRight: 44 },
  coopSpinner: { position: 'absolute', right: 16, top: 16 },
  coopDropdown: { backgroundColor: C.white, borderRadius: 16, borderWidth: 1.5, borderColor: C.steel200, marginBottom: 12, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  coopOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.steel100, gap: 12 },
  coopOptionLeft: { flex: 1 },
  coopOptionName: { fontSize: 14, fontWeight: '800', color: C.c900, marginBottom: 2 },
  coopOptionMeta: { fontSize: 12, color: C.muted, fontWeight: '500' },
  coopCodeBadge: { backgroundColor: C.c100, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  coopCodeText: { fontSize: 11, fontWeight: '800', color: C.c700, letterSpacing: 1 },
  coopNoResults: { backgroundColor: C.steel100, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.steel200 },
  coopNoResultsText: { fontSize: 13, color: C.ink, fontWeight: '700', marginBottom: 4 },
  coopNoResultsSub: { fontSize: 12, color: C.muted },
  coopSelectedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderRadius: 16, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#bbf7d0', gap: 12 },
  coopSelectedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  coopSelectedIconText: { fontSize: 20 },
  coopSelectedName: { fontSize: 14, fontWeight: '800', color: '#15803d', marginBottom: 2 },
  coopSelectedMeta: { fontSize: 12, color: '#166534', fontWeight: '500' },
  coopClearBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#bbf7d0', alignItems: 'center', justifyContent: 'center' },
  coopClearText: { fontSize: 12, color: '#15803d', fontWeight: '800' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100 },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText: { fontSize: 13, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: C.c700, borderColor: C.c700 },
  checkmark: { color: C.white, fontSize: 13, fontWeight: '900' },
  termsText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 18 },
  termsLink: { color: C.c700, fontWeight: '700' },

  // Password
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  pwdInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0, marginBottom: 0 },
  eyeBtn: { height: 54, width: 54, backgroundColor: C.steel100, borderWidth: 1.5, borderLeftWidth: 0, borderColor: C.steel200, borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontSize: 18 },

  // Error
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { fontSize: 13, color: '#dc2626', fontWeight: '700' },
  devBox: { backgroundColor: '#fff8e1', borderColor: '#fbbf24' },
  devText: { color: '#92400e' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn: { backgroundColor: C.c700, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 15, fontWeight: '800' },
  backBtn: { flex: 1, height: 58, borderRadius: 16, borderWidth: 2, borderColor: C.steel300, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 15, fontWeight: '800', color: C.steel700 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: C.steel200 },
  divText: { marginHorizontal: 12, fontSize: 10, fontWeight: '800', color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 },
  signInBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.c700 },
  signInText: { color: C.c700, fontSize: 16, fontWeight: '800' },

  version: { textAlign: 'center', marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },

  // Dropdown
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, borderWidth: 1.5, borderColor: C.steel200, marginBottom: 16 },
  dropdownBtnError: { borderColor: '#dc2626', backgroundColor: '#fff5f5' },
  dropdownBtnDisabled: { opacity: 0.5 },
  dropdownBtnText: { fontSize: 15, color: C.ink, fontWeight: '600', flex: 1 },
  dropdownArrow: { fontSize: 12, color: C.subtle, marginLeft: 8 },
  ddOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  ddSheet: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, maxHeight: '70%' },
  ddHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginBottom: 12 },
  ddTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  ddItemActive: { backgroundColor: C.c050, marginHorizontal: -20, paddingHorizontal: 20 },
  ddItemText: { fontSize: 15, color: C.ink, fontWeight: '500' },
  ddItemTextActive: { color: C.c700, fontWeight: '800' },
  ddCheck: { fontSize: 14, color: C.c700, fontWeight: '900' },
});
