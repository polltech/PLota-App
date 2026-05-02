import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Image, StatusBar, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { C } from '../theme';

const SatelliteAnalysisScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, areaHectares, pointsCount } = route.params || {};

  const scanAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [status, setStatus] = useState('Initializing Satellite Link...');

  useEffect(() => {
    // Native animation for the scan line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // JS-driven animation for the progress bar (width)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 8000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    // Fade in content
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const steps = [
      { t: 1500, m: 'Fetching Historical Imagery (2020)...' },
      { t: 3000, m: 'Cross-referencing Global Forest Watch...' },
      { t: 4500, m: 'Calculating Canopy Density Change...' },
      { t: 6000, m: 'Verifying EUDR Compliance Status...' },
      { t: 7500, m: 'Finalizing Submission...' },
    ];

    steps.forEach(step => {
      setTimeout(() => setStatus(step.m), step.t);
    });

    const timer = setTimeout(() => {
      navigation.replace('Submitted', route.params);
    }, 8500);

    return () => clearTimeout(timer);
  }, []);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={s.mapContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1524334228333-0f6db392f8a1?q=80&w=1000&auto=format&fit=crop' }}
          style={s.mapImage}
        />
        <View style={s.mapOverlay} />

        <Animated.View style={[s.scanLine, { transform: [{ translateY }] }]} />
      </View>

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View style={s.logoBadge}>
            <Image source={require('../../assets/logo.jpeg')} style={s.logoBadgeImg} />
          </View>
          <Text style={s.brandName}>PLOTRA <Text style={s.brandLight}>VERIFY</Text></Text>
        </View>

        <Animated.View style={[s.content, { opacity: fadeAnim }]}>
          <View style={s.analysisCard}>
             <View style={s.radarContainer}>
                <View style={s.radarRing1} />
                <View style={s.radarRing2} />
                <View style={s.radarDot} />
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2092/2092712.png' }}
                  style={s.satelliteIcon}
                />
             </View>

             <Text style={s.statusText}>{status}</Text>

             <View style={s.progressBarContainer}>
                <Animated.View style={[s.progressBar, { width: progressWidth }]} />
             </View>

             <View style={s.farmBrief}>
                <Text style={s.briefLabel}>Analyzing Farm ID</Text>
                <Text style={s.briefValue}>{farmId}</Text>
                <Text style={s.briefMeta}>{areaHectares?.toFixed(4)} ha • {pointsCount} coordinates</Text>
             </View>
          </View>
        </Animated.View>

        <View style={s.footer}>
           <Text style={s.footerText}>Global Satellite Verification Engine</Text>
           <Text style={s.footerSub}>Powered by Sentinel-2 & Planet Labs</Text>
        </View>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.c900 },
  mapContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  mapImage: { width: '100%', height: '100%', opacity: 0.6 },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.4)' },

  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },

  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 20 },
  logoBadge: { width: 32, height: 32, borderRadius: 8, overflow: 'hidden', marginRight: 10 },
  logoBadgeImg: { width: '100%', height: '100%' },
  brandName: { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 2 },
  brandLight: { fontWeight: '300', color: C.c400 },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  analysisCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 32,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },

  radarContainer: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  radarRing1: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  radarRing2: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.4)' },
  radarDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
  satelliteIcon: { width: 60, height: 60, tintColor: C.c700 },

  statusText: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 20, textAlign: 'center', height: 40 },

  progressBarContainer: { width: '100%', height: 6, backgroundColor: C.steel200, borderRadius: 3, overflow: 'hidden', marginBottom: 25 },
  progressBar: { height: '100%', backgroundColor: C.c700 },

  farmBrief: { alignItems: 'center', borderTopWidth: 1, borderTopColor: C.steel200, paddingTop: 20, width: '100%' },
  briefLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  briefValue: { fontSize: 20, fontWeight: '800', color: C.ink, marginBottom: 4 },
  briefMeta: { fontSize: 13, color: C.muted, fontWeight: '600' },

  footer: { paddingBottom: 40, alignItems: 'center' },
  footerText: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  footerSub: { color: 'rgba(255, 255, 255, 0.5)', fontSize: 10, marginTop: 4 },
});

export default SatelliteAnalysisScreen;
