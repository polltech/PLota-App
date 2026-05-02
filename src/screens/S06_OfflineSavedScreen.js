import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { C } from '../theme';

const OfflineSavedScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { farmId, areaHectares } = route.params || {};

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1459755486867-b55449bb39ff?q=80&w=1000&auto=format&fit=crop' }}
        style={s.bgImage}
      >
        <View style={s.overlay} />

        <SafeAreaView style={s.safe}>
          <View style={s.miniHeader}>
            <View style={s.miniLogoWrap}>
              <Image source={require('../../assets/logo.jpeg')} style={s.miniLogo} />
            </View>
            <Text style={s.miniBrand}>PLOTRA</Text>
          </View>

          <View style={s.content}>
            <View style={s.statusCircle}>
              <View style={s.iconBg}>
                <Text style={s.icon}>☁</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.title}>Saved Locally</Text>
              <Text style={s.subtitle}>
                Connection was unstable. Farm <Text style={s.bold}>{farmId}</Text> is safely stored on your device and will sync later.
              </Text>

              <View style={s.statGrid}>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Captured Area</Text>
                  <Text style={s.statVal}>{areaHectares?.toFixed(4)} <Text style={s.statUnit}>ha</Text></Text>
                </View>
                <View style={s.vLine} />
                <View style={s.statItem}>
                  <Text style={s.statLabel}>Sync State</Text>
                  <Text style={[s.statVal, { color: C.pendingText }]}>Pending</Text>
                </View>
              </View>

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => navigation.navigate('FarmIDEntry')}
              >
                <Text style={s.primaryBtnText}>Continue to Next Farm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={() => navigation.navigate('QueueList')}
              >
                <Text style={s.secondaryBtnText}>View Sync Queue</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>Offline mapping enabled • Data is encrypted & safe.</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 10, 0, 0.55)' },
  safe: { flex: 1 },

  miniHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10 },
  miniLogoWrap: { width: 32, height: 32, borderRadius: 8, overflow: 'hidden', marginRight: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  miniLogo: { width: '100%', height: '100%' },
  miniBrand: { fontSize: 16, fontWeight: '900', color: C.white, letterSpacing: 2 },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },

  statusCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: -45, zIndex: 10, borderWidth: 4, borderColor: C.white },
  iconBg: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.pendingText, alignItems: 'center', justifyContent: 'center' },
  icon: { color: C.white, fontSize: 32, fontWeight: '900' },

  card: { backgroundColor: C.white, borderRadius: 32, padding: 32, paddingTop: 60, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 15 },

  title: { fontSize: 28, fontWeight: '800', color: C.ink, marginBottom: 12 },
  subtitle: { fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  bold: { color: C.c700, fontWeight: '800' },

  statGrid: { flexDirection: 'row', backgroundColor: C.steel100, borderRadius: 20, padding: 20, marginBottom: 30, width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: C.ink },
  statUnit: { fontSize: 13, color: C.muted, fontWeight: '500' },
  vLine: { width: 1.5, backgroundColor: C.steel200, marginHorizontal: 10 },

  primaryBtn: { backgroundColor: C.c700, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12, width: '100%', shadowColor: C.c700, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: C.white, fontSize: 17, fontWeight: '800' },
  secondaryBtn: { height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: '100%' },
  secondaryBtnText: { color: C.steel600, fontSize: 15, fontWeight: '700' },

  footer: { paddingBottom: 30, alignItems: 'center' },
  footerText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },
});

export default OfflineSavedScreen;
