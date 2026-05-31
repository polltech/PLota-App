import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ImageBackground, Image, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const COUNTRY_OPTIONS = [
  { flag: '🇰🇪', code: '+254', name: 'Kenya',    iso: 'ke' },
  { flag: '🇺🇬', code: '+256', name: 'Uganda',   iso: 'ug' },
  { flag: '🇹🇿', code: '+255', name: 'Tanzania', iso: 'tz' },
];

const STEPS = ['Personal', 'Verify', 'Location', 'Profile', 'Password'];

const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const ID_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
];

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

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  // ── Step 1: Personal Info ──────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [country,     setCountry]     = useState(COUNTRY_OPTIONS[0]);
  const [phoneLocal,  setPhoneLocal]  = useState('');
  const [email,       setEmail]       = useState('');
  const [showCountry, setShowCountry] = useState(false);

  // ── Step 2: OTP ────────────────────────────────────────────────────────────
  const [otp,         setOtp]         = useState(['', '', '', '', '', '']);
  const [otpSent,     setOtpSent]     = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // ── Step 3: Location & Cooperative ────────────────────────────────────────
  const [county,      setCounty]      = useState('');
  const [subcounty,   setSubcounty]   = useState('');
  const [coopCode,    setCoopCode]    = useState('');

  // ── Step 4: Profile Details ────────────────────────────────────────────────
  const [gender,      setGender]      = useState('');
  const [idType,      setIdType]      = useState('');
  const [idNumber,    setIdNumber]    = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ── Step 5: Password ───────────────────────────────────────────────────────
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd,         setShowPwd]         = useState(false);
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [touched, setTouched] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const fullPhone = `${country.code}${phoneLocal.replace(/^0/, '')}`;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const fail = (msg) => { setError(msg); shake(); };

  // OTP resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  // ── OTP input helpers ─────────────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKey = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ── Step navigation ────────────────────────────────────────────────────────
  const goBack = () => { setError(''); setTouched(false); setStep(s => s - 1); };

  const handleNext = async () => {
    setTouched(true);
    setError('');

    if (step === 0) {
      if (!firstName.trim() || !lastName.trim() || !phoneLocal.trim()) {
        return fail('First name, last name and phone are required.');
      }
      // Send OTP
      setLoading(true);
      try {
        const { authAPI } = require('../services/api');
        const res = await authAPI.sendOtp(fullPhone);
        setOtpSent(true);
        setResendTimer(60);
        setOtp(['', '', '', '', '', '']);
        setStep(1);
        setTouched(false);
        // DEV: show OTP if returned
        if (res.data?.dev_code) {
          Alert.alert('Dev OTP', `Code: ${res.data.dev_code}`);
        }
      } catch (e) {
        fail(e.response?.data?.detail || 'Failed to send OTP. Check your phone number.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 1) {
      const code = otp.join('');
      if (code.length < 6) return fail('Enter the 6-digit code sent to your phone.');
      setLoading(true);
      try {
        const { authAPI } = require('../services/api');
        await authAPI.verifyOtp(fullPhone, code);
        setStep(2);
        setTouched(false);
      } catch (e) {
        fail(e.response?.data?.detail || 'Invalid or expired code.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step === 2) {
      if (!county.trim() || !subcounty.trim() || !coopCode.trim()) {
        return fail('County, sub-county and cooperative code are required.');
      }
      setStep(3);
      setTouched(false);
      return;
    }

    if (step === 3) {
      if (!gender) return fail('Please select your gender.');
      if (!termsAccepted) return fail('You must agree to the Terms of Use.');
      setStep(4);
      setTouched(false);
      return;
    }

    if (step === 4) {
      if (password.length < 8) return fail('Password must be at least 8 characters.');
      if (password !== confirmPassword) return fail('Passwords do not match.');
      await handleSubmit();
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      const { authAPI } = require('../services/api');
      const res = await authAPI.sendOtp(fullPhone);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      if (res.data?.dev_code) Alert.alert('Dev OTP', `Code: ${res.data.dev_code}`);
    } catch (e) {
      fail('Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const result = await register({
      first_name:       firstName.trim(),
      last_name:        lastName.trim(),
      phone_number:     fullPhone,
      email:            email.trim().toLowerCase() || undefined,
      county:           county.trim(),
      subcounty:        subcounty.trim(),
      cooperative_code: coopCode.trim().toUpperCase(),
      gender:           gender || undefined,
      id_type:          idType || undefined,
      id_number:        idNumber.trim() || undefined,
      password,
    });
    setLoading(false);
    if (!result.success) {
      shake();
      setError(result.error || 'Registration failed.');
      setStep(4);
    }
    // On success AuthContext sets user → AppNavigator navigates automatically
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
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Logo */}
              <View style={s.logoWrap}>
                <View style={s.logoCircle}>
                  <Image source={require('../../assets/logo.jpeg')} style={s.logo} resizeMode="cover" />
                </View>
                <Text style={s.brand}>PLOTRA</Text>
                <Text style={s.tagline}>Mapping Sustainability, Empowering Farmers</Text>
              </View>

              <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>

                {/* Progress dots */}
                <View style={s.progressRow}>
                  {STEPS.map((label, i) => (
                    <View key={label} style={s.progressItem}>
                      <View style={[s.dot, i < step && s.dotDone, i === step && s.dotActive]}>
                        <Text style={[s.dotText, (i <= step) && s.dotTextLight]}>
                          {i < step ? '✓' : i + 1}
                        </Text>
                      </View>
                      <Text style={[s.dotLabel, i === step && s.dotLabelActive]} numberOfLines={1}>{label}</Text>
                    </View>
                  ))}
                </View>

                {/* ── STEP 0: Personal Info ──────────────────────────────── */}
                {step === 0 && (
                  <>
                    <Text style={s.title}>Create Account</Text>
                    <Text style={s.subtitle}>Join the EUDR Compliance Platform</Text>

                    <View style={s.row}>
                      <View style={s.half}>
                        <Text style={s.label}>First Name *</Text>
                        <TextInput style={[s.input, touched && !firstName.trim() && s.inputError]}
                          value={firstName} onChangeText={setFirstName} placeholder="First"
                          placeholderTextColor={C.subtle} autoCapitalize="words" returnKeyType="next" />
                      </View>
                      <View style={s.rowGap} />
                      <View style={s.half}>
                        <Text style={s.label}>Last Name *</Text>
                        <TextInput style={[s.input, touched && !lastName.trim() && s.inputError]}
                          value={lastName} onChangeText={setLastName} placeholder="Last"
                          placeholderTextColor={C.subtle} autoCapitalize="words" returnKeyType="next" />
                      </View>
                    </View>

                    <Text style={s.label}>Phone Number *</Text>
                    <View style={s.phoneRow}>
                      <TouchableOpacity style={s.countryBtn} onPress={() => setShowCountry(v => !v)} activeOpacity={0.8}>
                        <Text style={s.countryFlag}>{country.flag}</Text>
                        <Text style={s.countryCode}>{country.code}</Text>
                        <Text style={s.caret}>▾</Text>
                      </TouchableOpacity>
                      <TextInput style={[s.input, s.phoneInput, touched && !phoneLocal.trim() && s.inputError]}
                        value={phoneLocal} onChangeText={setPhoneLocal}
                        placeholder="712 345 678" placeholderTextColor={C.subtle}
                        keyboardType="phone-pad" returnKeyType="next" maxLength={10} />
                    </View>
                    {showCountry && (
                      <View style={s.countryMenu}>
                        {COUNTRY_OPTIONS.map(c => (
                          <TouchableOpacity key={c.iso} style={s.countryOption}
                            onPress={() => { setCountry(c); setShowCountry(false); }} activeOpacity={0.8}>
                            <Text style={s.countryOptionText}>{c.flag}  {c.name}  {c.code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text style={s.label}>Email <Text style={s.optional}>(optional)</Text></Text>
                    <TextInput style={s.input} value={email} onChangeText={setEmail}
                      placeholder="email@example.com" placeholderTextColor={C.subtle}
                      autoCapitalize="none" keyboardType="email-address" returnKeyType="done" />
                  </>
                )}

                {/* ── STEP 1: OTP Verify ─────────────────────────────────── */}
                {step === 1 && (
                  <>
                    <Text style={s.title}>Verify Phone</Text>
                    <Text style={s.subtitle}>Enter the 6-digit code sent to {fullPhone}</Text>

                    <View style={s.otpRow}>
                      {otp.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={ref => otpRefs.current[i] = ref}
                          style={[s.otpBox, digit && s.otpBoxFilled]}
                          value={digit}
                          onChangeText={v => handleOtpChange(v, i)}
                          onKeyPress={e => handleOtpKey(e, i)}
                          keyboardType="numeric"
                          maxLength={1}
                          textAlign="center"
                          selectTextOnFocus
                        />
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[s.resendBtn, resendTimer > 0 && s.resendBtnDisabled]}
                      onPress={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.resendText, resendTimer > 0 && s.resendTextDisabled]}>
                        {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* ── STEP 2: Location & Cooperative ─────────────────────── */}
                {step === 2 && (
                  <>
                    <Text style={s.title}>Your Location</Text>
                    <Text style={s.subtitle}>We use this to link you with your cooperative.</Text>

                    <Text style={s.label}>County *</Text>
                    <TextInput style={[s.input, touched && !county.trim() && s.inputError]}
                      value={county} onChangeText={setCounty} placeholder="e.g. Kirinyaga"
                      placeholderTextColor={C.subtle} returnKeyType="next" />

                    <Text style={s.label}>Sub-County *</Text>
                    <TextInput style={[s.input, touched && !subcounty.trim() && s.inputError]}
                      value={subcounty} onChangeText={setSubcounty} placeholder="e.g. Mwea"
                      placeholderTextColor={C.subtle} returnKeyType="next" />

                    <Text style={s.label}>Cooperative Code *</Text>
                    <TextInput style={[s.input, touched && !coopCode.trim() && s.inputError]}
                      value={coopCode} onChangeText={t => setCoopCode(t.toUpperCase())}
                      placeholder="e.g. POLYCOOP" placeholderTextColor={C.subtle}
                      autoCapitalize="characters" returnKeyType="done" />
                    <Text style={s.hint}>Ask your cooperative officer for the code</Text>
                  </>
                )}

                {/* ── STEP 3: Gender & ID ────────────────────────────────── */}
                {step === 3 && (
                  <>
                    <Text style={s.title}>Personal Details</Text>
                    <Text style={s.subtitle}>Required for gender-inclusive programs and identity verification.</Text>

                    <Text style={s.label}>Gender *</Text>
                    <ChipGroup options={GENDER_OPTIONS} value={gender} onChange={setGender} />
                    {touched && !gender && <Text style={s.errText}>Required</Text>}

                    <Text style={[s.label, { marginTop: 16 }]}>ID Type <Text style={s.optional}>(optional)</Text></Text>
                    <ChipGroup options={ID_TYPES} value={idType} onChange={setIdType} />

                    {idType && (
                      <>
                        <Text style={[s.label, { marginTop: 16 }]}>ID Number</Text>
                        <TextInput style={s.input} value={idNumber} onChangeText={setIdNumber}
                          placeholder="Enter your ID number" placeholderTextColor={C.subtle}
                          returnKeyType="done" />
                      </>
                    )}

                    <TouchableOpacity
                      style={s.termsRow}
                      onPress={() => setTermsAccepted(v => !v)}
                      activeOpacity={0.8}
                    >
                      <View style={[s.checkbox, termsAccepted && s.checkboxChecked]}>
                        {termsAccepted && <Text style={s.checkmark}>✓</Text>}
                      </View>
                      <Text style={s.termsText}>
                        I agree to the <Text style={s.termsLink}>Terms of Use</Text> and consent to data processing *
                      </Text>
                    </TouchableOpacity>
                    {touched && !termsAccepted && <Text style={s.errText}>You must accept the terms</Text>}
                  </>
                )}

                {/* ── STEP 4: Password ───────────────────────────────────── */}
                {step === 4 && (
                  <>
                    <Text style={s.title}>Create Password</Text>
                    <Text style={s.subtitle}>Minimum 8 characters.</Text>

                    <Text style={s.label}>Password *</Text>
                    <View style={s.pwdRow}>
                      <TextInput style={[s.input, s.pwdInput, touched && password.length < 8 && s.inputError]}
                        value={password} onChangeText={setPassword}
                        placeholder="Min. 8 characters" placeholderTextColor={C.subtle}
                        secureTextEntry={!showPwd} returnKeyType="next" />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                        <Text style={s.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[s.label, { marginTop: 16 }]}>Confirm Password *</Text>
                    <View style={s.pwdRow}>
                      <TextInput style={[s.input, s.pwdInput, touched && password !== confirmPassword && s.inputError]}
                        value={confirmPassword} onChangeText={setConfirmPassword}
                        placeholder="Re-enter password" placeholderTextColor={C.subtle}
                        secureTextEntry={!showConfirmPwd} returnKeyType="done"
                        onSubmitEditing={handleNext} />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd(v => !v)}>
                        <Text style={s.eyeText}>{showConfirmPwd ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Error */}
                {!!error && <Text style={s.errorText}>{error}</Text>}

                {/* Buttons */}
                <View style={s.btnRow}>
                  {step > 0 && (
                    <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.8}>
                      <Text style={s.backBtnText}>← Back</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.btn, { flex: step > 0 ? 2 : 1 }, loading && s.btnDisabled]}
                    onPress={handleNext}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading
                      ? <ActivityIndicator color={C.white} />
                      : <Text style={s.btnText}>
                          {step === 0 ? 'Send Verification Code' :
                           step === 4 ? 'Create Account ✓' :
                           `Next: ${STEPS[step + 1]} →`}
                        </Text>
                    }
                  </TouchableOpacity>
                </View>

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
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.steel200, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: C.c700 },
  dotDone: { backgroundColor: '#22c55e' },
  dotText: { fontSize: 10, fontWeight: '800', color: C.muted },
  dotTextLight: { color: C.white },
  dotLabel: { fontSize: 9, fontWeight: '700', color: C.subtle, textAlign: 'center' },
  dotLabelActive: { color: C.c700 },

  title: { fontSize: 24, fontWeight: '800', color: C.c900, marginBottom: 6 },
  subtitle: { fontSize: 13, color: C.muted, lineHeight: 18, marginBottom: 20 },

  row: { flexDirection: 'row', marginBottom: 16 },
  half: { flex: 1 },
  rowGap: { width: 12 },

  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 2 },
  optional: { fontWeight: '500', color: C.subtle, textTransform: 'none' },
  input: { backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, fontSize: 15, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200, marginBottom: 16 },
  inputError: { borderColor: '#dc2626', backgroundColor: '#fff5f5' },
  errText: { fontSize: 12, color: '#dc2626', fontWeight: '700', marginTop: -10, marginBottom: 12, marginLeft: 2 },

  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  countryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 12, borderWidth: 1.5, borderColor: C.steel200 },
  countryFlag: { fontSize: 18 },
  countryCode: { fontSize: 14, fontWeight: '700', color: C.ink },
  caret: { fontSize: 10, color: C.subtle },
  phoneInput: { flex: 1, marginBottom: 0 },
  countryMenu: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.steel200, marginBottom: 16, overflow: 'hidden' },
  countryOption: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  countryOptionText: { fontSize: 14, fontWeight: '600', color: C.ink },

  // OTP
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 24 },
  otpBox: { width: 44, height: 56, borderRadius: 12, borderWidth: 2, borderColor: C.steel200, backgroundColor: C.steel100, fontSize: 22, fontWeight: '800', color: C.ink, textAlign: 'center' },
  otpBoxFilled: { borderColor: C.c700, backgroundColor: C.c050 },
  resendBtn: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  resendBtnDisabled: {},
  resendText: { fontSize: 14, fontWeight: '700', color: C.c700, textDecorationLine: 'underline' },
  resendTextDisabled: { color: C.subtle, textDecorationLine: 'none' },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: C.steel200, backgroundColor: C.steel100 },
  chipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  chipText: { fontSize: 13, fontWeight: '700', color: C.c700 },
  chipTextActive: { color: C.white },

  hint: { fontSize: 12, color: C.subtle, fontStyle: 'italic', marginTop: -10, marginBottom: 16, marginLeft: 2 },

  // Terms
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.steel300, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: C.c700, borderColor: C.c700 },
  checkmark: { color: C.white, fontSize: 13, fontWeight: '900' },
  termsText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 18 },
  termsLink: { color: C.c700, fontWeight: '700' },

  // Password
  pwdRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 0 },
  pwdInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0, marginBottom: 0 },
  eyeBtn: { height: 54, width: 54, backgroundColor: C.steel100, borderWidth: 1.5, borderLeftWidth: 0, borderColor: C.steel200, borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontSize: 18 },

  errorText: { fontSize: 13, color: '#dc2626', fontWeight: '700', backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, marginTop: 12 },

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
});
