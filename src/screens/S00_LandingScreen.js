import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

// Floating gold particles scattered around the screen
const PARTICLES = [
  { x: 0.08, y: 0.12, size: 5, delay: 0,   duration: 2400 },
  { x: 0.88, y: 0.18, size: 3, delay: 400, duration: 2800 },
  { x: 0.04, y: 0.55, size: 7, delay: 200, duration: 2200 },
  { x: 0.93, y: 0.48, size: 4, delay: 600, duration: 3000 },
  { x: 0.12, y: 0.80, size: 4, delay: 150, duration: 2600 },
  { x: 0.82, y: 0.75, size: 6, delay: 500, duration: 2500 },
  { x: 0.48, y: 0.06, size: 3, delay: 100, duration: 2700 },
  { x: 0.52, y: 0.94, size: 4, delay: 350, duration: 2300 },
  { x: 0.30, y: 0.88, size: 3, delay: 250, duration: 2900 },
  { x: 0.72, y: 0.10, size: 5, delay: 450, duration: 2100 },
];

const Particle = ({ x, y, size, delay, duration }) => {
  const float = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.65, duration: duration * 0.45, delay, useNativeDriver: true }),
          Animated.timing(float,   { toValue: -14,  duration: duration,        delay, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.15, duration: duration * 0.45, useNativeDriver: true }),
          Animated.timing(float,   { toValue: 0,    duration: duration,        useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x * width,
        top:  y * height,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#d4a853',
        opacity,
        transform: [{ translateY: float }],
      }}
    />
  );
};

export default function LandingScreen() {
  const navigation = useNavigation();

  const logoScale   = useRef(new Animated.Value(0.25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoGlow    = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(30)).current;
  const titleOp     = useRef(new Animated.Value(0)).current;
  const dividerW    = useRef(new Animated.Value(0)).current;
  const taglineOp   = useRef(new Animated.Value(0)).current;
  const badgeOp     = useRef(new Animated.Value(0)).current;
  const footerOp    = useRef(new Animated.Value(0)).current;
  const shimmer     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry sequence
    Animated.sequence([
      // Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      // Title slides up
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(titleY,  { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
      // Divider draws out
      Animated.timing(dividerW, { toValue: 120, duration: 400, useNativeDriver: false }),
      // Tagline fades
      Animated.timing(taglineOp, { toValue: 1, duration: 380, useNativeDriver: true }),
      // Badge + footer
      Animated.parallel([
        Animated.timing(badgeOp,  { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(footerOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    // Glow pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoGlow, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(logoGlow, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Shimmer on divider
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      navigation.replace('FarmIDEntry');
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  const glowOpacity = logoGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] });
  const shimmerOp   = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0803" translucent />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      {/* Radial glow behind logo */}
      <Animated.View style={[s.glow, { opacity: glowOpacity }]} />

      <View style={s.content}>
        {/* Logo */}
        <Animated.View
          style={[s.logoWrap, {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }]}
        >
          <Image
            source={require('../../assets/logo.jpeg')}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[s.title, { opacity: titleOp, transform: [{ translateY: titleY }] }]}
        >
          PLOTRA
        </Animated.Text>

        {/* Gold shimmer divider */}
        <Animated.View style={[s.divider, { width: dividerW, opacity: shimmerOp }]} />

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: taglineOp }]}>
          Verifiable Sustainability{'\n'}from Farm to Cup
        </Animated.Text>

        {/* EUDR badge */}
        <Animated.View style={[s.badge, { opacity: badgeOp }]}>
          <View style={s.badgeDot} />
          <Text style={s.badgeText}>EUDR Compliant · East Africa</Text>
        </Animated.View>
      </View>

      {/* Bottom footer */}
      <Animated.Text style={[s.footer, { opacity: footerOp }]}>
        Mapping Africa's Coffee Story
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0803',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#d4a853',
    // React Native doesn't have radial gradient natively; simulate with border radius + blur via shadow
    shadowColor: '#d4a853',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    width: 220,
    height: 220,
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 28,
    // Subtle border glow
    shadowColor: '#d4a853',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#d4a853',
    letterSpacing: 10,
    marginBottom: 14,
    textShadowColor: 'rgba(212, 168, 83, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  divider: {
    height: 2,
    backgroundColor: '#d4a853',
    borderRadius: 2,
    marginBottom: 18,
  },
  tagline: {
    fontSize: 15,
    color: '#c4a882',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
    borderColor: 'rgba(212, 168, 83, 0.35)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 7,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  badgeText: {
    fontSize: 11,
    color: '#d4a853',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 11,
    color: '#5c3a1e',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
