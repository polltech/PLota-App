import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ImageBackground,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    const result = await register({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role: 'farmer',
    });
    if (!result.success) {
      Alert.alert('Registration failed', result.error);
    }
    setIsLoading(false);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1497933321188-ee29a888069a?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />

        <SafeAreaView style={s.safe}>
          <KeyboardAvoidingView
            style={s.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={s.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={s.header}>
                <View style={s.logoContainer}>
                  <Image
                    source={require('../../assets/logo.jpeg')}
                    style={s.logo}
                    resizeMode="cover"
                  />
                </View>
                <Text style={s.brandName}>PLOTRA</Text>
              </View>

              <View style={s.card}>
                <Text style={s.title}>Agent Access</Text>
                <Text style={s.subtitle}>Create your profile to start mapping sustainable farm boundaries.</Text>

                <View style={s.inputGrid}>
                  <View style={s.inputHalf}>
                    <Text style={s.label}>First Name</Text>
                    <TextInput
                      style={s.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Jane"
                      placeholderTextColor={C.subtle}
                    />
                  </View>
                  <View style={s.inputHalf}>
                    <Text style={s.label}>Last Name</Text>
                    <TextInput
                      style={s.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Doe"
                      placeholderTextColor={C.subtle}
                    />
                  </View>
                </View>

                <View style={s.inputWrapper}>
                  <Text style={s.label}>Email Address</Text>
                  <TextInput
                    style={s.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="jane@plotra.africa"
                    placeholderTextColor={C.subtle}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={s.inputWrapper}>
                  <Text style={s.label}>Password</Text>
                  <TextInput
                    style={s.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.subtle}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, isLoading && s.btnDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={s.primaryBtnText}>Register Account</Text>
                  )}
                </TouchableOpacity>

                <View style={s.footerLinks}>
                  <Text style={s.footerLinkText}>Already an agent? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={s.link}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.complianceRow}>
                 <Text style={s.complianceText}>EUDR Certified Mapping Protocol</Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.5)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },

  header: { alignItems: 'center', marginBottom: 30 },
  logoContainer: { width: 70, height: 70, borderRadius: 18, backgroundColor: C.white, padding: 4, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10 },
  logo: { width: '100%', height: '100%', borderRadius: 14 },
  brandName: { fontSize: 24, fontWeight: '900', color: C.white, letterSpacing: 4 },

  card: { backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: 32, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 25, elevation: 15 },
  title: { fontSize: 28, fontWeight: '800', color: C.c900, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.muted, lineHeight: 20, marginBottom: 25 },

  inputGrid: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  inputHalf: { flex: 1 },
  inputWrapper: { marginBottom: 15 },
  label: { fontSize: 11, fontWeight: '800', color: C.c700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: C.steel100, borderRadius: 16, height: 56, paddingHorizontal: 16, fontSize: 16, color: C.ink, fontWeight: '600', borderWidth: 1.5, borderColor: C.steel200 },

  primaryBtn: { backgroundColor: C.c700, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 15, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  primaryBtnText: { color: C.white, fontSize: 17, fontWeight: '800' },

  footerLinks: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerLinkText: { fontSize: 14, color: C.muted, fontWeight: '500' },
  link: { fontSize: 14, color: C.c700, fontWeight: '800' },

  complianceRow: { marginTop: 30, alignItems: 'center' },
  complianceText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
});

export default RegisterScreen;
