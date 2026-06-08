import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ImageBackground, Image, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Network from 'expo-network';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const checkNet = async () => {
      try {
        const net = await Network.getNetworkStateAsync();
        if (mounted) setIsOnline(!!net.isConnected && net.isInternetReachable !== false);
      } catch (_) {}
    };
    checkNet();
    const interval = setInterval(checkNet, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!identifier.trim() || !password) {
      Alert.alert('Required', 'Please enter your email/phone and password.');
      return;
    }
    setLoading(true);
    const result = await login(identifier.trim(), password);
    setLoading(false);
    if (!result.success) {
      shake();
      Alert.alert('Login Failed', result.error || 'Incorrect credentials.');
    }
    // On success AuthContext sets user → AppNavigator renders MainTabs automatically
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bg}
      >
        <View style={s.overlay} />

        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
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

              {/* Card */}
              <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>
                {!isOnline && (
                  <View style={s.offlineBanner}>
                    <Text style={s.offlineIcon}>📴</Text>
                    <View style={s.offlineTextWrap}>
                      <Text style={s.offlineTitle}>You're offline</Text>
                      <Text style={s.offlineMsg}>Using cached credentials from your last online login.</Text>
                    </View>
                  </View>
                )}

                <Text style={s.title}>Sign In</Text>
                <Text style={s.subtitle}>
                  {isOnline
                    ? 'Enter your email or phone number to continue.'
                    : 'Enter the same credentials you used when last online.'}
                </Text>

                <View style={s.field}>
                  <Text style={s.label}>Email or Phone</Text>
                  <TextInput
                    style={s.input}
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="you@example.com or +254..."
                    placeholderTextColor={C.subtle}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Password</Text>
                  <View style={s.pwdRow}>
                    <TextInput
                      style={[s.input, s.pwdInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={C.subtle}
                      secureTextEntry={!showPwd}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd((v) => !v)}>
                      <Text style={s.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={s.btnText}>Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.forgotBtn}
                  onPress={() => navigation.navigate('ForgotPassword')}
                  activeOpacity={0.8}
                >
                  <Text style={s.forgotText}>Forgot password? Reset it here</Text>
                </TouchableOpacity>

                <View style={s.divider}>
                  <View style={s.line} />
                  <Text style={s.divText}>New user?</Text>
                  <View style={s.line} />
                </View>

                <TouchableOpacity
                  style={s.registerBtn}
                  onPress={() => navigation.navigate('Register')}
                  activeOpacity={0.8}
                >
                  <Text style={s.registerText}>Create Account</Text>
                </TouchableOpacity>

              </Animated.View>

              <Text style={s.version}>Plotra App • v1.1.0</Text>
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

  offlineBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 1.5, borderColor: '#fed7aa', borderRadius: 14, padding: 12, marginBottom: 20, gap: 10 },
  offlineIcon: { fontSize: 22 },
  offlineTextWrap: { flex: 1 },
  offlineTitle: { fontSize: 13, fontWeight: '800', color: '#9a3412', marginBottom: 2 },
  offlineMsg: { fontSize: 12, color: '#c2410c', lineHeight: 16 },

  title: { fontSize: 26, fontWeight: '800', color: C.c900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 24 },

  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, fontSize: 16, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  pwdInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: { height: 54, width: 54, backgroundColor: C.steel100, borderWidth: 1.5, borderLeftWidth: 0, borderColor: C.steel200, borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontSize: 18 },

  btn: { backgroundColor: C.c700, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  forgotBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 6 },
  forgotText: { fontSize: 14, color: C.c700, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: C.steel200 },
  divText: { marginHorizontal: 12, fontSize: 10, fontWeight: '800', color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 },

  registerBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.c700, marginBottom: 16 },
  registerText: { color: C.c700, fontSize: 16, fontWeight: '800' },

  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginTop: 4 },
  footText: { flex: 1, fontSize: 12, color: C.muted, lineHeight: 18 },

  version: { textAlign: 'center', marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
});
