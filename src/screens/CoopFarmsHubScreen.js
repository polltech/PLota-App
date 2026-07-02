import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { coopAPI } from '../services/api';
import { C } from '../theme';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: C.white, paddingLeft: 56, paddingRight: 20, paddingBottom: 0,
    borderBottomWidth: 1, borderBottomColor: C.steel200,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 12, paddingLeft: 36 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.c900 },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  segmentRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  segBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: C.steel200,
    backgroundColor: C.steel100,
  },
  segBtnActive: { borderColor: C.c700, backgroundColor: C.c050 },
  segBtnText: { fontSize: 13, fontWeight: '700', color: C.muted },
  segBtnTextActive: { color: C.c700 },
  segBadge: { backgroundColor: C.c700, borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  segBadgeText: { fontSize: 10, fontWeight: '800', color: C.white },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', margin: 14, marginBottom: 8,
    backgroundColor: C.white, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: C.steel200,
  },
  search: { flex: 1, fontSize: 14, color: C.ink, height: 20 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.steel200 },
  filterChipActive: { backgroundColor: C.c700, borderColor: C.c700 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: C.steel700 },
  filterChipTextActive: { color: C.white },

  list: { paddingBottom: 24 },

  // Farmer row
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel100,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { fontSize: 14, fontWeight: '900', color: C.white },
  rowBody: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', color: C.ink },
  rowMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
  rowSub: { fontSize: 11, color: C.subtle, marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  // Farm card
  farmCard: {
    backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.steel100,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  farmCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  farmIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  farmCardBody: { flex: 1 },
  farmActions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingLeft: 52 },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.c700, borderRadius: 8, paddingVertical: 9,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: C.white },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 8, paddingVertical: 9, borderWidth: 1, borderColor: '#fecaca',
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.steel700, marginTop: 14 },
  emptyMsg: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
