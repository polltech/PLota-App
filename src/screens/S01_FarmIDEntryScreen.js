import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Network from 'expo-network';
import { polygonAPI } from '../services/api';
import { C } from '../theme';

const FarmIDEntryScreen = () => {
  const [farmId, setFarmId] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const navigation = useNavigation();

  const hasError = touched && !farmId.trim();

  const handleContinue = async () => {
    setTouched(true);
    setApiError(null);
    if (!farmId.trim()) return;

    setIsLoading(true);
    try {
      const net = await Network.getNetworkStateAsync();
      // Only attempt fetch if we have a connection AND internet is potentially reachable
      if (net.isConnected && net.isInternetReachable !== false) {
        try {
          const res = await polygonAPI.getFarm(farmId.trim());

          if (res.status === 200) {
            const farm = res.data;
            navigation.navigate('FarmConfirmation', { farmId: farmId.trim(), farm });
            return;
          }
        } catch (error) {
          if (error.response?.status === 404) {
            setApiError('Farm ID not found. Check the ID and try again.');
            return;
          }
          // If fetch fails (timeout or network), we still allow proceeding to WalkBoundary
        }
      }
      navigation.navigate('WalkBoundary', { farmId: farmId.trim() });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1000&auto=format&fit=crop' }}
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
                <View style={s.logoMiniContainer}>
                  <Image
                    source={require('../../assets/logo.jpeg')}
                    style={s.logoMini}
                    resizeMode="cover"
                  />
                </View>
                <Text style={s.headerTitle}>PLOTRA</Text>
              </View>

              <View style={s.card}>
                <Text style={s.title}>Identify Farm</Text>
                <Text style={s.subtitle}>
                  Enter the unique Farm ID from the portal to begin boundary mapping.
                </Text>

                <View style={s.inputWrapper}>
                  <Text style={s.label}>Farm ID / Code</Text>
                  <View style={[s.inputContainer, hasError && s.inputContainerError]}>
                    <Text style={s.inputIcon}>#</Text>
                    <TextInput
                      style={s.input}
                      value={farmId}
                      onChangeText={(v) => {
                        setFarmId(v);
                        setTouched(false);
                        setApiError(null);
                      }}
                      onBlur={() => setTouched(true)}
                      placeholder="e.g. 1042"
                      placeholderTextColor={C.subtle}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="default"
                      returnKeyType="go"
                      onSubmitEditing={handleContinue}
                    />
                  </View>

                  {hasError ? (
                    <Text style={s.errorText}>Please enter a valid Farm ID</Text>
                  ) : apiError ? (
                    <Text style={s.errorText}>{apiError}</Text>
                  ) : (
                    <Text style={s.hintText}>Verify against farmer's documentation.</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, (!farmId.trim() || isLoading) && s.btnDisabled]}
                  onPress={handleContinue}
                  disabled={isLoading || !farmId.trim()}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={s.primaryBtnText}>Confirm Identity</Text>
                  )}
                </TouchableOpacity>

                <View style={s.dividerContainer}>
                  <View style={s.line} />
                  <Text style={s.dividerText}>OR</Text>
                  <View style={s.line} />
                </View>

                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={() => navigation.navigate('QueueList')}
                  activeOpacity={0.7}
                >
                  <Text style={s.secondaryBtnText}>View Sync Queue</Text>
                </TouchableOpacity>
              </View>

              <View style={s.footer}>
                 <Text style={s.footerText}>Offline mode is enabled for remote areas.</Text>
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.45)' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24 },

  header: {
    position: 'absolute',
    top: 20,
    left: 24,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  logoMiniContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: C.white,
    padding: 2,
  },
  logoMini: { width: '100%', height: '100%', borderRadius: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.white, letterSpacing: 2 },

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
  },

  title: { fontSize: 32, fontWeight: '800', color: C.c900, marginBottom: 12 },
  subtitle: { fontSize: 16, color: C.muted, lineHeight: 24, marginBottom: 35 },

  inputWrapper: { marginBottom: 30 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: C.c700,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.steel100,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.steel200,
    paddingHorizontal: 20,
    height: 64,
  },
  inputContainerError: { borderColor: C.failedText, backgroundColor: C.failedBg },
  inputIcon: { fontSize: 20, color: C.c400, fontWeight: '800', marginRight: 15 },
  input: { flex: 1, fontSize: 18, color: C.c900, fontWeight: '700' },

  hintText: { fontSize: 13, color: C.subtle, marginTop: 12, marginLeft: 4, fontWeight: '500' },
  errorText: { fontSize: 13, color: C.failedText, fontWeight: '700', marginTop: 12, marginLeft: 4 },

  primaryBtn: {
    backgroundColor: C.c700,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.c700,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: C.white, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35 },
  line: { flex: 1, height: 1.5, backgroundColor: C.steel200 },
  dividerText: { marginHorizontal: 20, fontSize: 13, fontWeight: '800', color: C.steel300 },

  secondaryBtn: {
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.steel200,
  },
  secondaryBtnText: { color: C.steel700, fontSize: 16, fontWeight: '800' },

  footer: { marginTop: 30, paddingHorizontal: 20 },
  footerText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', fontWeight: '500' },
});

export default FarmIDEntryScreen;
