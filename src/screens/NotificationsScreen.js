import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

const typeConfig = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'success': return { icon: 'checkmark-circle',  color: '#15803d', iconBg: '#dcfce7' };
    case 'warning': return { icon: 'warning',            color: '#d97706', iconBg: '#fef3c7' };
    case 'error':   return { icon: 'close-circle',       color: '#dc2626', iconBg: '#fee2e2' };
    default:        return { icon: 'information-circle', color: '#0891b2', iconBg: '#e0f2fe' };
  }
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const isProfileUpdateRequest = (n) =>
  (n.title || '').toLowerCase().includes('update') ||
  (n.message || '').toLowerCase().includes('update your profile') ||
  (n.reference_type || '') === 'farmer';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [selected,      setSelected]      = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const res = await farmerAPI.getNotifications();
      setNotifications(res.data?.notifications || (Array.isArray(res.data) ? res.data : []));
    } catch (e) { console.warn('Notifications load:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const markRead = async (notif) => {
    if (notif.is_read) return;
    try {
      await farmerAPI.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch (_) {}
  };

  const openNotif = (notif) => {
    setSelected(notif);
    markRead(notif);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderItem = ({ item: n }) => {
    const tc = typeConfig(n.type);
    return (
      <TouchableOpacity
        style={[s.row, !n.is_read && s.rowUnread]}
        onPress={() => openNotif(n)}
        activeOpacity={0.8}
      >
        <View style={[s.iconCircle, { backgroundColor: tc.iconBg }]}>
          <Ionicons name={tc.icon} size={22} color={tc.color} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.rowTop}>
            <Text style={[s.rowTitle, !n.is_read && { color: C.c900 }]} numberOfLines={1}>
              {n.title || 'Notification'}
            </Text>
            {!n.is_read && <View style={s.unreadDot} />}
          </View>
          <Text style={s.rowMsg} numberOfLines={2}>{n.message || ''}</Text>
          <Text style={s.rowTime}>{timeAgo(n.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 ? (
            <Text style={s.headerSub}>{unreadCount} unread</Text>
          ) : (
            <Text style={s.headerSub}>All caught up</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={s.unreadBadge}>
            <Text style={s.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </SafeAreaView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[s.list, notifications.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={60} color={C.steel300} />
              <Text style={s.emptyTitle}>No notifications yet</Text>
              <Text style={s.emptyMsg}>
                You'll be notified here when your cooperative approves your account, requests profile updates, or posts important messages.
              </Text>
            </View>
          }
        />
      )}

      {/* ── Detail bottom sheet ──────────────────────────────────────────── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setSelected(null)} />
          {!!selected && (() => {
            const tc = typeConfig(selected.type);
            const isUpdate = isProfileUpdateRequest(selected);
            return (
              <View style={s.sheet}>
                <View style={s.sheetHandle} />
                <View style={s.sheetHeader}>
                  <View style={[s.sheetIconCircle, { backgroundColor: tc.iconBg }]}>
                    <Ionicons name={tc.icon} size={30} color={tc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.sheetTitle}>{selected.title || 'Notification'}</Text>
                    <Text style={s.sheetTime}>{timeAgo(selected.created_at)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} style={s.closeBtn}>
                    <Ionicons name="close" size={20} color={C.steel700} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.sheetBody} showsVerticalScrollIndicator={false}>
                  <Text style={s.sheetMsg}>{selected.message || ''}</Text>

                  {isUpdate && (
                    <TouchableOpacity
                      style={s.updateBtn}
                      onPress={() => {
                        setSelected(null);
                        navigation.navigate('Profile');
                      }}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="create-outline" size={18} color={C.white} />
                      <Text style={s.updateBtnText}>Update My Profile Now</Text>
                    </TouchableOpacity>
                  )}

                  <View style={{ height: 20 }} />
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.steel200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: C.c900, marginTop: 8 },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  unreadBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  unreadBadgeText: { color: C.white, fontSize: 13, fontWeight: '800' },

  list: { padding: 16 },
  listEmpty: { flex: 1, justifyContent: 'center' },

  row: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: C.c700 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.c700, flexShrink: 0 },
  rowMsg: { fontSize: 13, color: C.muted, lineHeight: 19 },
  rowTime: { fontSize: 11, color: C.subtle, fontWeight: '600', marginTop: 5 },

  empty: { alignItems: 'center', paddingHorizontal: 40, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.steel700, marginTop: 18 },
  emptyMsg: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },

  // Modal / sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', paddingBottom: 20 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.steel300, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  sheetIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: C.ink },
  sheetTime: { fontSize: 12, color: C.muted, marginTop: 3 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.steel100, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16 },
  sheetMsg: { fontSize: 15, color: C.ink, lineHeight: 24, marginBottom: 24 },

  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.c700,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: C.c700,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 8,
  },
  updateBtnText: { color: C.white, fontSize: 15, fontWeight: '800' },
});
