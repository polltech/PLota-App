import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform,
  ScrollView, Animated, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { C } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login, loginWithOtp } = useAuth();

  // ── shared ────────────────────────────────────────────────────────────────
  const [mode,        setMode]        = useState('farmer'); // 'farmer' | 'staff'
  const [staffMethod, setStaffMethod] = useState('otp');    // 'otp' | 'password'
  const [isOnline,    setIsOnline]    = useState(true);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // ── password mode ─────────────────────────────────────────────────────────
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [focusId,    setFocusId]    = useState(false);
  const [focusPwd,   setFocusPwd]   = useState(false);

  // ── otp mode ──────────────────────────────────────────────────────────────
  const [otpPhone,   setOtpPhone]   = useState('');
  const [otpCode,    setOtpCode]    = useState('');
  const [otpStep,    setOtpStep]    = useState(1); // 1=enter phone  2=enter code
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError,   setOtpError]   = useState('');
  const [resendSecs, setResendSecs] = useState(0);
  const resendTimer = useRef(null);
  const [focusPhone, setFocusPhone] = useState(false);
  const [focusCode,  setFocusCode]  = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (mounted) setIsOnline(!!net.isConnected && net.isInternetReachable !== false);
      } catch (_) {}
    };
    check();
    const iv = setInterval(check, 5000);
    return () => { mounted = false; clearInterval(iv); clearInterval(resendTimer.current); };
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const switchMode = (m) => {
    setMode(m);
    setStaffMethod('otp');
    setOtpStep(1); setOtpError(''); setOtpCode(''); setOtpPhone(''); setResendSecs(0);
    clearInterval(resendTimer.current);
    setIdentifier(''); setPassword('');
  };

  // ── Password login ────────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!identifier.trim() || !password) return;
    setPwdLoading(true);
    const result = await login(identifier.trim(), password);
    setPwdLoading(false);
    if (!result.success) shake();
  };

  // ── OTP: send ─────────────────────────────────────────────────────────────
  const startResendTimer = () => {
    setResendSecs(60);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendSecs(s => {
        if (s <= 1) { clearInterval(resendTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    if (!otpPhone.trim()) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await authAPI.sendOtp(otpPhone.trim());
      // DEV: print full response so the OTP is visible during testing
      Alert.alert(
        '[DEV] OTP Response',
        JSON.stringify(res.data, null, 2),
        [{ text: 'OK' }]
      );
      setOtpStep(2);
      startResendTimer();
    } catch (e) {
      const detail = e.response?.data?.detail;
      setOtpError(typeof detail === 'string' ? detail : 'Could not send OTP. Check the phone number and try again.');
      shake();
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP: verify ───────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length < 4) return;
    setOtpLoading(true);
    setOtpError('');
    const result = await loginWithOtp(otpPhone.trim(), otpCode.trim());
    setOtpLoading(false);
    if (!result.success) {
      setOtpError(result.error || 'Invalid or expired OTP. Try again.');
      shake();
    }
  };

  const handleResend = async () => {
    if (resendSecs > 0) return;
    setOtpCode('');
    await handleSendOtp();
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand header */}
            <View style={s.brandWrap}>
              <View style={s.logoCircle}>
                <Image source={require('../../assets/plotra-logo.png')} style={s.logo} resizeMode="contain" />
              </View>
              <Text style={s.brandName}>PLOTRA</Text>
              <Text style={s.brandTag}>Traceable Farms</Text>
            </View>

            <Animated.View style={[s.form, { transform: [{ translateX: shakeAnim }] }]}>

              {/* Mode toggle */}
              <View style={s.modeRow}>
                <TouchableOpacity
                  style={[s.modeBtn, mode === 'farmer' && s.modeBtnActive]}
                  onPress={() => switchMode('farmer')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="leaf-outline" size={14} color={mode === 'farmer' ? C.c700 : C.muted} />
                  <Text style={[s.modeBtnText, mode === 'farmer' && s.modeBtnTextActive]}>Farmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modeBtn, mode === 'staff' && s.modeBtnActive]}
                  onPress={() => switchMode('staff')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="people-outline" size={14} color={mode === 'staff' ? C.c700 : C.muted} />
                  <Text style={[s.modeBtnText, mode === 'staff' && s.modeBtnTextActive]}>Staff</Text>
                </TouchableOpacity>
              </View>

              {mode === 'farmer' ? (
                // ── FARMER PASSWORD LOGIN ───────────────────────────────────
                <>
                  <Text style={s.heading}>Farmer Sign in</Text>
                  <Text style={s.subheading}>
                    {isOnline
                      ? 'Enter your email or phone number to continue.'
                      : 'No internet — using cached credentials from last online session.'}
                  </Text>

                  {!isOnline && (
                    <View style={s.offlineBanner}>
                      <Ionicons name="wifi-outline" size={16} color={C.c700} />
                      <Text style={s.offlineText}>Offline mode</Text>
                    </View>
                  )}

                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Email or phone number</Text>
                    <View style={[s.inputWrap, focusId && s.inputWrapFocused]}>
                      <TextInput
                        style={s.input}
                        value={identifier}
                        onChangeText={setIdentifier}
                        placeholder="you@example.com or +254 7XX..."
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        returnKeyType="next"
                        textContentType="username"
                        autoComplete="username"
                        onFocus={() => setFocusId(true)}
                        onBlur={() => setFocusId(false)}
                      />
                    </View>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Password</Text>
                    <View style={[s.inputWrap, focusPwd && s.inputWrapFocused]}>
                      <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Password"
                        placeholderTextColor="rgba(255,255,255,0.38)"
                        secureTextEntry={!showPwd}
                        returnKeyType="done"
                        onSubmitEditing={handlePasswordLogin}
                        textContentType="password"
                        autoComplete="current-password"
                        onFocus={() => setFocusPwd(true)}
                        onBlur={() => setFocusPwd(false)}
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
                        <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={s.coopHintRow}>
                    <Ionicons name="information-circle-outline" size={13} color="rgba(255,255,255,0.55)" />
                    <Text style={s.coopHintText}>Cooperative officer or staff? Use the </Text>
                    <TouchableOpacity onPress={() => switchMode('staff')} activeOpacity={0.7}>
                      <Text style={s.coopHintLink}>Staff tab</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={s.forgotRow} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                    <Text style={s.forgotText}>Forgot password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.primaryBtn, (!identifier.trim() || !password || pwdLoading) && s.primaryBtnDisabled]}
                    onPress={handlePasswordLogin}
                    disabled={pwdLoading || !identifier.trim() || !password}
                    activeOpacity={0.85}
                  >
                    {pwdLoading
                      ? <ActivityIndicator color={C.white} size="small" />
                      : <Text style={s.primaryBtnText}>Sign in</Text>
                    }
                  </TouchableOpacity>

                  <View style={s.divider}>
                    <View style={s.divLine} />
                    <Text style={s.divText}>No account?</Text>
                    <View style={s.divLine} />
                  </View>

                  <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
                    <Text style={s.outlineBtnText}>Create account</Text>
                  </TouchableOpacity>
                </>
              ) : (
                // ── STAFF LOGIN ─────────────────────────────────────────────
                <>
                  <Text style={s.heading}>Staff Sign in</Text>

                  {/* Method sub-toggle */}
                  <View style={s.methodRow}>
                    <TouchableOpacity
                      style={[s.methodBtn, staffMethod === 'otp' && s.methodBtnActive]}
                      onPress={() => { setStaffMethod('otp'); setOtpError(''); }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={13} color={staffMethod === 'otp' ? C.c700 : C.muted} />
                      <Text style={[s.methodBtnText, staffMethod === 'otp' && s.methodBtnTextActive]}>Phone OTP</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.methodBtn, staffMethod === 'password' && s.methodBtnActive]}
                      onPress={() => setStaffMethod('password')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="lock-closed-outline" size={13} color={staffMethod === 'password' ? C.c700 : C.muted} />
                      <Text style={[s.methodBtnText, staffMethod === 'password' && s.methodBtnTextActive]}>Password</Text>
                    </TouchableOpacity>
                  </View>

                  {staffMethod === 'otp' ? (
                    // ── OTP flow ──────────────────────────────────────────────
                    <>
                      <Text style={s.subheading}>
                        {otpStep === 1
                          ? 'Cooperative officers and staff sign in using a one-time code sent to their phone.'
                          : `Enter the code sent to ${otpPhone}.`}
                      </Text>

                      {!!otpError && (
                        <View style={s.errorBanner}>
                          <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
                          <Text style={s.errorText}>{otpError}</Text>
                        </View>
                      )}

                      {otpStep === 1 ? (
                        <>
                          <View style={s.fieldGroup}>
                            <Text style={s.label}>Phone number</Text>
                            <View style={[s.inputWrap, focusPhone && s.inputWrapFocused]}>
                              <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.55)" style={{ marginRight: 8 }} />
                              <TextInput
                                style={[s.input, { flex: 1 }]}
                                value={otpPhone}
                                onChangeText={setOtpPhone}
                                placeholder="+254 7XX XXX XXX"
                                placeholderTextColor="rgba(255,255,255,0.38)"
                                keyboardType="phone-pad"
                                returnKeyType="done"
                                onSubmitEditing={handleSendOtp}
                                onFocus={() => setFocusPhone(true)}
                                onBlur={() => setFocusPhone(false)}
                              />
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[s.primaryBtn, (!otpPhone.trim() || otpLoading) && s.primaryBtnDisabled]}
                            onPress={handleSendOtp}
                            disabled={!otpPhone.trim() || otpLoading}
                            activeOpacity={0.85}
                          >
                            {otpLoading
                              ? <ActivityIndicator color={C.white} size="small" />
                              : <><Ionicons name="send-outline" size={16} color={C.white} /><Text style={s.primaryBtnText}>Send OTP</Text></>
                            }
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <View style={s.otpPhoneRow}>
                            <Text style={s.otpPhoneLabel}>Code sent to</Text>
                            <Text style={s.otpPhoneVal}>{otpPhone}</Text>
                            <TouchableOpacity onPress={() => { setOtpStep(1); setOtpCode(''); setOtpError(''); }}>
                              <Text style={s.otpChangeLink}>Change</Text>
                            </TouchableOpacity>
                          </View>
                          <View style={s.fieldGroup}>
                            <Text style={s.label}>OTP Code</Text>
                            <View style={[s.otpInputWrap, focusCode && s.inputWrapFocused]}>
                              <TextInput
                                style={s.otpInput}
                                value={otpCode}
                                onChangeText={v => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                                placeholder="· · · · · ·"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                keyboardType="number-pad"
                                maxLength={6}
                                returnKeyType="done"
                                onSubmitEditing={handleVerifyOtp}
                                onFocus={() => setFocusCode(true)}
                                onBlur={() => setFocusCode(false)}
                                autoFocus
                              />
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[s.primaryBtn, (otpCode.length < 4 || otpLoading) && s.primaryBtnDisabled]}
                            onPress={handleVerifyOtp}
                            disabled={otpCode.length < 4 || otpLoading}
                            activeOpacity={0.85}
                          >
                            {otpLoading
                              ? <ActivityIndicator color={C.white} size="small" />
                              : <><Ionicons name="checkmark-circle-outline" size={16} color={C.white} /><Text style={s.primaryBtnText}>Verify & Sign In</Text></>
                            }
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.resendBtn, resendSecs > 0 && { opacity: 0.4 }]}
                            onPress={handleResend}
                            disabled={resendSecs > 0}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="refresh-outline" size={14} color={C.c700} />
                            <Text style={s.resendText}>
                              {resendSecs > 0 ? `Resend code in ${resendSecs}s` : 'Resend OTP'}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  ) : (
                    // ── Password flow ─────────────────────────────────────────
                    <>
                      <Text style={s.subheading}>Sign in with your email or phone number and password.</Text>
                      <View style={s.fieldGroup}>
                        <Text style={s.label}>Email or phone number</Text>
                        <View style={[s.inputWrap, focusId && s.inputWrapFocused]}>
                          <TextInput
                            style={s.input}
                            value={identifier}
                            onChangeText={setIdentifier}
                            placeholder="you@example.com or +254 7XX..."
                            placeholderTextColor="rgba(255,255,255,0.38)"
                            autoCapitalize="none"
                            keyboardType="email-address"
                            returnKeyType="next"
                            textContentType="username"
                            autoComplete="username"
                            onFocus={() => setFocusId(true)}
                            onBlur={() => setFocusId(false)}
                          />
                        </View>
                      </View>
                      <View style={s.fieldGroup}>
                        <Text style={s.label}>Password</Text>
                        <View style={[s.inputWrap, focusPwd && s.inputWrapFocused]}>
                          <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Password"
                            placeholderTextColor="rgba(255,255,255,0.38)"
                            secureTextEntry={!showPwd}
                            returnKeyType="done"
                            onSubmitEditing={handlePasswordLogin}
                            textContentType="password"
                            autoComplete="current-password"
                            onFocus={() => setFocusPwd(true)}
                            onBlur={() => setFocusPwd(false)}
                          />
                          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color="rgba(255,255,255,0.55)" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <TouchableOpacity style={s.forgotRow} onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
                        <Text style={s.forgotText}>Forgot password?</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.primaryBtn, (!identifier.trim() || !password || pwdLoading) && s.primaryBtnDisabled]}
                        onPress={handlePasswordLogin}
                        disabled={pwdLoading || !identifier.trim() || !password}
                        activeOpacity={0.85}
                      >
                        {pwdLoading
                          ? <ActivityIndicator color={C.white} size="small" />
                          : <Text style={s.primaryBtnText}>Sign in</Text>
                        }
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </Animated.View>

            <Text style={s.version}>Plotra · v1.1.0</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.c800 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingVertical: 44 },

  brandWrap: { alignItems: 'center', marginBottom: 28 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.white, padding: 3, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  logo: { width: '100%', height: '100%', borderRadius: 33 },
  brandName: { fontSize: 22, fontWeight: '900', color: C.white, letterSpacing: 6, marginBottom: 5 },
  brandTag: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500', letterSpacing: 2, textTransform: 'uppercase' },

  form: { paddingHorizontal: 2 },

  // Mode toggle
  modeRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10, padding: 3, marginBottom: 20, gap: 3 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 8 },
  modeBtnActive: { backgroundColor: 'rgba(255,255,255,0.16)' },
  modeBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.48)' },
  modeBtnTextActive: { color: C.white },

  heading: { fontSize: 18, fontWeight: '800', color: C.white, marginBottom: 4, textAlign: 'center' },
  subheading: { fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 18, marginBottom: 16, textAlign: 'center' },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7,
    marginBottom: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)',
  },
  offlineText: { fontSize: 12, fontWeight: '600', color: C.white },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: 'rgba(220,38,38,0.12)', borderRadius: 8, paddingHorizontal: 11, paddingVertical: 9,
    marginBottom: 13, borderWidth: 1, borderColor: 'rgba(220,38,38,0.28)',
  },
  errorText: { flex: 1, fontSize: 12, color: '#fca5a5', fontWeight: '500', lineHeight: 17 },

  fieldGroup: { marginBottom: 13 },
  label: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.09)', paddingHorizontal: 13, height: 44,
  },
  inputWrapFocused: { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.13)' },
  input: { flex: 1, fontSize: 14, color: C.white, height: 44, fontWeight: '400' },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },

  methodRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 9, padding: 3, marginBottom: 15, gap: 3 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: 7 },
  methodBtnActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
  methodBtnText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.43)' },
  methodBtnTextActive: { color: C.white },

  coopHintRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 10, marginTop: -3 },
  coopHintText: { fontSize: 11, color: 'rgba(255,255,255,0.52)' },
  coopHintLink: { fontSize: 11, color: '#86efac', fontWeight: '700' },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 16, marginTop: 1 },
  forgotText: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: C.c700, height: 46, borderRadius: 10,
    shadowColor: C.c700, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.38, shadowRadius: 8, elevation: 5,
  },
  primaryBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.13)', shadowOpacity: 0 },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 9 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.13)' },
  divText: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  outlineBtn: {
    height: 46, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: C.white },

  // OTP specific
  otpPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 9, padding: 9, marginBottom: 13 },
  otpPhoneLabel: { fontSize: 11, color: 'rgba(255,255,255,0.52)' },
  otpPhoneVal: { flex: 1, fontSize: 13, fontWeight: '700', color: C.white },
  otpChangeLink: { fontSize: 12, fontWeight: '700', color: '#86efac' },

  otpInputWrap: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.09)', paddingHorizontal: 14, height: 50,
    justifyContent: 'center',
  },
  otpInput: {
    fontSize: 24, fontWeight: '700', color: C.white,
    letterSpacing: 10, textAlign: 'center', height: 50,
  },

  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 13 },
  resendText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },

  version: { textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.28)', fontSize: 11 },
});
