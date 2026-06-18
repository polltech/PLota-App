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
      console.log('[DEV] sendOtp response:', JSON.stringify(res.data, null, 2));
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
      <StatusBar barStyle="dark-content" backgroundColor="#f3f2f1" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Brand header */}
            <View style={s.brandWrap}>
              <View style={s.logoBox}>
                <Image source={require('../../assets/icon.png')} style={s.logo} resizeMode="contain" />
              </View>
              <Text style={s.brandName}>PLOTRA</Text>
              <Text style={s.brandTag}>Traceable Farms, Trusted Futures</Text>
            </View>

            <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>

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
                        placeholderTextColor={C.subtle}
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
                        placeholderTextColor={C.subtle}
                        secureTextEntry={!showPwd}
                        returnKeyType="done"
                        onSubmitEditing={handlePasswordLogin}
                        textContentType="password"
                        autoComplete="current-password"
                        onFocus={() => setFocusPwd(true)}
                        onBlur={() => setFocusPwd(false)}
                      />
                      <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
                        <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={s.coopHintRow}>
                    <Ionicons name="information-circle-outline" size={13} color={C.muted} />
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
                              <Ionicons name="call-outline" size={16} color={C.muted} style={{ marginRight: 8 }} />
                              <TextInput
                                style={[s.input, { flex: 1 }]}
                                value={otpPhone}
                                onChangeText={setOtpPhone}
                                placeholder="+254 7XX XXX XXX"
                                placeholderTextColor={C.subtle}
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
                                placeholderTextColor={C.steel300}
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
                            placeholderTextColor={C.subtle}
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
                            placeholderTextColor={C.subtle}
                            secureTextEntry={!showPwd}
                            returnKeyType="done"
                            onSubmitEditing={handlePasswordLogin}
                            textContentType="password"
                            autoComplete="current-password"
                            onFocus={() => setFocusPwd(true)}
                            onBlur={() => setFocusPwd(false)}
                          />
                          <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)} activeOpacity={0.7}>
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
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
  root: { flex: 1, backgroundColor: '#f3f2f1' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingVertical: 48 },

  brandWrap: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 96, height: 96, borderRadius: 48, overflow: 'hidden',
    backgroundColor: C.white, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
    borderWidth: 1, borderColor: C.steel200,
  },
  logo: { width: '100%', height: '100%' },
  brandName: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: 3, marginBottom: 4 },
  brandTag: { fontSize: 12, color: C.muted, fontWeight: '400', letterSpacing: 0.3 },

  card: {
    backgroundColor: C.white, borderRadius: 8, padding: 28,
    borderWidth: 1, borderColor: C.steel200,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },

  // Mode toggle
  modeRow: { flexDirection: 'row', backgroundColor: C.steel100, borderRadius: 10, padding: 3, marginBottom: 24, gap: 3 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 8 },
  modeBtnActive: { backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: C.muted },
  modeBtnTextActive: { color: C.c700 },

  heading: { fontSize: 24, fontWeight: '600', color: C.ink, marginBottom: 6, textAlign: 'center' },
  subheading: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 20, textAlign: 'center' },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.c050, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 16, borderWidth: 1, borderColor: C.c200,
  },
  offlineText: { fontSize: 13, fontWeight: '600', color: C.c800 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 16, borderWidth: 1, borderColor: '#fecaca',
  },
  errorText: { flex: 1, fontSize: 13, color: '#dc2626', fontWeight: '500', lineHeight: 18 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: C.steel700, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.steel300, borderRadius: 6,
    backgroundColor: C.white, paddingHorizontal: 12, height: 44,
  },
  inputWrapFocused: { borderColor: C.c700, borderWidth: 1.5 },
  input: { flex: 1, fontSize: 14, color: C.ink, height: 44 },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },

  methodRow: { flexDirection: 'row', backgroundColor: C.steel100, borderRadius: 8, padding: 3, marginBottom: 18, gap: 3 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 6 },
  methodBtnActive: { backgroundColor: C.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
  methodBtnText: { fontSize: 12, fontWeight: '700', color: C.muted },
  methodBtnTextActive: { color: C.c700 },

  coopHintRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12, marginTop: -4 },
  coopHintText: { fontSize: 12, color: C.muted },
  coopHintLink: { fontSize: 12, color: C.c700, fontWeight: '700' },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 0 },
  forgotText: { fontSize: 13, color: C.c700, fontWeight: '500' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.c700, height: 44, borderRadius: 6,
  },
  primaryBtnDisabled: { backgroundColor: C.steel300 },
  primaryBtnText: { color: C.white, fontSize: 14, fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: C.steel200 },
  divText: { fontSize: 12, color: C.subtle, fontWeight: '500' },

  outlineBtn: {
    height: 44, borderRadius: 6, borderWidth: 1.5, borderColor: C.c700,
    alignItems: 'center', justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: C.c700 },

  // OTP specific
  otpPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.c050, borderRadius: 8, padding: 10, marginBottom: 16 },
  otpPhoneLabel: { fontSize: 12, color: C.muted },
  otpPhoneVal: { flex: 1, fontSize: 13, fontWeight: '700', color: C.ink },
  otpChangeLink: { fontSize: 13, fontWeight: '700', color: C.c700 },

  otpInputWrap: {
    borderWidth: 1, borderColor: C.steel300, borderRadius: 6,
    backgroundColor: C.white, paddingHorizontal: 16, height: 52,
    justifyContent: 'center',
  },
  otpInput: {
    fontSize: 26, fontWeight: '800', color: C.ink,
    letterSpacing: 10, textAlign: 'center', height: 52,
  },

  resendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  resendText: { fontSize: 13, fontWeight: '600', color: C.c700 },

  version: { textAlign: 'center', marginTop: 24, color: C.subtle, fontSize: 12 },
});
