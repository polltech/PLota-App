import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ImageBackground, Image, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Required', 'Please fill in all required fields.');
      shake();
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      shake();
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters.');
      shake();
      return;
    }

    setLoading(true);
    const result = await register({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password,
    });
    setLoading(false);

    if (!result.success) {
      shake();
      Alert.alert('Registration Failed', result.error || 'Could not create account.');
    }
    // On success AuthContext sets user → AppNavigator navigates automatically
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
                  <Image source={require('../../assets/logo.jpeg')} style={s.logo} resizeMode="cover" />
                </View>
                <Text style={s.brand}>PLOTRA</Text>
                <Text style={s.tagline}>Mapping Sustainability, Empowering Farmers</Text>
              </View>

              {/* Card */}
              <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>
                <Text style={s.title}>Create Account</Text>
                <Text style={s.subtitle}>Register as a farmer to manage your farms and deliveries.</Text>

                {/* Name row */}
                <View style={s.row}>
                  <View style={[s.field, s.half]}>
                    <Text style={s.label}>First Name *</Text>
                    <TextInput
                      style={s.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="John"
                      placeholderTextColor={C.subtle}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={[s.field, s.half]}>
                    <Text style={s.label}>Last Name *</Text>
                    <TextInput
                      style={s.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      placeholderTextColor={C.subtle}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Email *</Text>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={C.subtle}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Phone <Text style={s.optional}>(optional)</Text></Text>
                  <TextInput
                    style={s.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+254 700 000 000"
                    placeholderTextColor={C.subtle}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Password *</Text>
                  <View style={s.pwdRow}>
                    <TextInput
                      style={[s.input, s.pwdInput]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={C.subtle}
                      secureTextEntry={!showPwd}
                      returnKeyType="next"
                    />
                    <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPwd((v) => !v)}>
                      <Text style={s.eyeText}>{showPwd ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.field}>
                  <Text style={s.label}>Confirm Password *</Text>
                  <View style={s.pwdRow}>
                    <TextInput
                      style={[s.input, s.pwdInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter password"
                      placeholderTextColor={C.subtle}
                      secureTextEntry={!showConfirmPwd}
                      returnKeyType="done"
                      onSubmitEditing={handleRegister}
                    />
                    <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirmPwd((v) => !v)}>
                      <Text style={s.eyeText}>{showConfirmPwd ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={s.btnText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                <View style={s.divider}>
                  <View style={s.line} />
                  <Text style={s.divText}>Already have an account?</Text>
                  <View style={s.line} />
                </View>

                <TouchableOpacity style={s.signInBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
                  <Text style={s.signInText}>Sign In</Text>
                </TouchableOpacity>
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
  title: { fontSize: 26, fontWeight: '800', color: C.c900, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 24 },

  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  optional: { fontWeight: '500', color: C.subtle, textTransform: 'none' },
  input: { backgroundColor: C.steel100, borderRadius: 14, height: 54, paddingHorizontal: 16, fontSize: 16, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },
  pwdRow: { flexDirection: 'row', alignItems: 'center' },
  pwdInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn: { height: 54, width: 54, backgroundColor: C.steel100, borderWidth: 1.5, borderLeftWidth: 0, borderColor: C.steel200, borderTopRightRadius: 14, borderBottomRightRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyeText: { fontSize: 18 },

  btn: { backgroundColor: C.c700, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  btnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: C.steel200 },
  divText: { marginHorizontal: 12, fontSize: 10, fontWeight: '800', color: C.subtle, textTransform: 'uppercase', letterSpacing: 1 },

  signInBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.c700 },
  signInText: { color: C.c700, fontSize: 16, fontWeight: '800' },

  version: { textAlign: 'center', marginTop: 28, color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600' },
});
