import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../context/NetworkContext';
import { C } from '../theme';

export function OfflineBanner() {
  const { isOnline, isSyncing, pendingCount, syncNow } = useNetwork();
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-80)).current;

  const visible = !isOnline || isSyncing || pendingCount > 0;

  useEffect(() => {
    Animated.timing(slideY, {
      toValue: visible ? 0 : -80,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  if (!visible && slideY._value === -80) return null;

  const bgColor  = !isOnline ? '#1e293b'         : isSyncing ? C.c800 : '#166534';
  const icon     = !isOnline ? 'cloud-offline'   : isSyncing ? 'sync' : 'checkmark-circle';
  const label    = !isOnline
    ? `Offline${pendingCount > 0 ? ` · ${pendingCount} pending` : ''}`
    : isSyncing
    ? `Syncing ${pendingCount} capture${pendingCount !== 1 ? 's' : ''}…`
    : `${pendingCount} capture${pendingCount !== 1 ? 's' : ''} synced`;

  return (
    <Animated.View
      style={[s.bar, { backgroundColor: bgColor, paddingTop: insets.top || 0, transform: [{ translateY: slideY }] }]}
    >
      <View style={s.inner}>
        <Ionicons name={icon} size={14} color={C.white} style={s.icon} />
        <Text style={s.label} numberOfLines={1}>{label}</Text>

        {!isOnline && pendingCount > 0 && (
          <TouchableOpacity onPress={syncNow} style={s.syncBtn} activeOpacity={0.8}>
            <Text style={s.syncText}>Sync now</Text>
          </TouchableOpacity>
        )}
        {isOnline && !isSyncing && pendingCount > 0 && (
          <TouchableOpacity onPress={syncNow} style={s.syncBtn} activeOpacity={0.8}>
            <Text style={s.syncText}>Sync</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  icon: { marginRight: 6 },
  label: {
    flex: 1,
    color: C.white,
    fontSize: 12,
    fontWeight: '600',
  },
  syncBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  syncText: {
    color: C.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
