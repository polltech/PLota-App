import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const STEPS = { PHONE: 'phone', OTP: 'otp', PASSWORD: 'password' };

export default function ForgotPasswordScreen({ navigation }) {
  const { login } = useAuth();

  const [step,      setStep]      = useState(STEPS.PHONE);
  const [phone,     setPhone]     = useState('');
  const [otp,       setOtp]       = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [loading,   setLoading]   = useState(false);

  const otpRef = useRef(null);

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const p = phone.trim();
    if (!p) { Alert.alert('Required', 'Enter your phone number.'); return; }
    setLoading(true);
    try {
      await authAPI.forgotPasswordOtp(p);
      setStep(STEPS.OTP);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Phone number not found.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (otp.trim().length < 4) { Alert.alert('Required', 'Enter the OTP code.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.verifyOtp(phone.trim(), otp.trim());
      const token = res.data?.reset_token;
      if (!token) throw new Error('No reset token returned.');
      setResetToken(token);
      setStep(STEPS.PASSWORD);
    } catch (e) {
      Alert.alert('Invalid OTP', e.response?.data?.detail || 'Code is wrong or expired. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: set new password ──────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (newPwd.length < 8) { Alert.alert('Too short', 'Password must be at least 8 characters.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword(resetToken, newPwd, confirmPwd);
      // Auto-login — setUser fires in AuthContext → AppNavigator switches to dashboard
      const loginRes = await login(phone.trim(), newPwd);
      if (!loginRes.success) {
        // Reset succeeded but auto-login failed; send to login screen
        Alert.alert('Password Set', 'Your password has been updated. Please sign in.', [
          { text: 'Sign In', onPress: () => navigation.replace('Login') },
        ]);
      }
      // On success: no setStep needed — AppNavigator unmounts this screen automatically
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Reset failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = {
    [STEPS.PHONE]:    'Reset Password',
    [STEPS.OTP]:      'Enter OTP Code',
    [STEPS.PASSWORD]: 'Set New Password',
  }[step];

  const stepSubtitle = {
    [STEPS.PHONE]:    'Enter the phone number linked to your account.',
    [STEPS.OTP]:      `We sent a code to ${phone}. Enter it below.`,
    [STEPS.PASSWORD]: 'Choose a new password for your account.',
  }[step];

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back button */}
            {(
              <TouchableOpacity style={s.back} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color={C.c700} />
                <Text style={s.backText}>Back to Sign In</Text>
              </TouchableOpacity>
            )}

            {/* Icon */}
            <View style={s.iconWrap}>
              <View style={s.iconCircle}>
                <Ionicons
                  name={step === STEPS.OTP ? 'keypad' : step === STEPS.PASSWORD ? 'lock-closed' : 'phone-portrait'}
                  size={36}
                  color={C.c700}
                />
              </View>
            </View>

            <Text style={s.title}>{stepTitle}</Text>
            <Text style={s.subtitle}>{stepSubtitle}</Text>

            {/* ── Phone step ─────────────────────────────────────── */}
            {step === STEPS.PHONE && (
              <>
                <Text style={s.label}>Phone Number</Text>
                <TextInput
                  style={s.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+254 7XX XXX XXX or 07XX XXX XXX"
                  placeholderTextColor={C.subtle}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleSendOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={s.btnText}>Send Code</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {/* ── OTP step ───────────────────────────────────────── */}
            {step === STEPS.OTP && (
              <>
                <Text style={s.label}>OTP Code</Text>
                <TextInput
                  ref={otpRef}
                  style={[s.input, s.otpInput]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={C.subtle}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOTP}
                />
                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={s.btnText}>Verify Code</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.resendBtn}
                  onPress={() => { setOtp(''); handleSendOTP(); }}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <Text style={s.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── New password step ──────────────────────────────── */}
            {step === STEPS.PASSWORD && (
              <>
                <Text style={s.label}>New Password</Text>
                <View style={s.pwdRow}>
                  <TextInput
                    style={[s.input, { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 }]}
                    value={newPwd}
                    onChangeText={setNewPwd}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={C.subtle}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd(v => !v)}>
                    <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
                  </TouchableOpacity>
                </View>

                <Text style={[s.label, { marginTop: 16 }]}>Confirm Password</Text>
                <TextInput
                  style={s.input}
                  value={confirmPwd}
                  onChangeText={setConfirmPwd}
                  placeholder="Repeat new password"
                  placeholderTextColor={C.subtle}
                  secureTextEntry={!showPwd}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />

                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={C.white} />
                    : <Text style={s.btnText}>Set Password & Sign In</Text>
                  }
                </TouchableOpacity>
              </>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 20 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backText: { fontSize: 14, fontWeight: '700', color: C.c700 },

  iconWrap: { alignItems: 'center', marginBottom: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.c050, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.c200 },

  title: { fontSize: 28, fontWeight: '900', color: C.c900, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 22, textAlign: 'center', marginBottom: 32 },

  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, fontSize: 16, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200, marginBottom: 0 },
  otpInput: { textAlign: 'center', fontSize: 28, fontWeight: '900', letterSpacing: 12 },

  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  eyeBtn: { height: 54, width: 54, backgroundColor: C.steel100, borderWidth: 1.5, borderLeftWidth: 0, borderColor: C.steel200, borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },

  btn: { backgroundColor: C.c700, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: C.c700, fontWeight: '700' },
});
