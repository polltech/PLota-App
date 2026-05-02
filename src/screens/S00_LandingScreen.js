import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { C } from '../theme';

export default function LandingScreen() {
  const navigation = useNavigation();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStart = () => {
    navigation.replace('FarmIDEntry');
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />

        <SafeAreaView style={s.safe}>
          <View style={s.content}>
            <Animated.View
              style={[
                s.logoContainer,
                { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }
              ]}
            >
              <View style={s.imageShadow}>
                <Image
                  source={require('../../assets/logo.jpeg')}
                  style={s.logo}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
              <Text style={s.brandName}>PLOTRA</Text>
              <View style={s.divider} />
              <Text style={s.tagline}>
                Mapping Sustainability,{"\n"}Empowering Farmers
              </Text>
            </Animated.View>
          </View>

          <Animated.View style={[s.footer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.badge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeText}>EUDR COMPLIANT DATA CAPTURE</Text>
            </View>

            <TouchableOpacity
              style={s.button}
              onPress={handleStart}
              activeOpacity={0.8}
            >
              <Text style={s.buttonText}>Get Started</Text>
            </TouchableOpacity>

            <Text style={s.versionText}>Secure Mobile Agent • v1.0.1</Text>
          </Animated.View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  safe: { flex: 1 },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  imageShadow: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: C.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: C.white,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: C.white,
    letterSpacing: 6,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  divider: {
    width: 60,
    height: 4,
    backgroundColor: C.c400,
    borderRadius: 2,
    marginBottom: 20,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  footer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    alignItems: 'center',
  },
  button: {
    backgroundColor: C.c700,
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: C.c700,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 35,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 1,
  },
  versionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
