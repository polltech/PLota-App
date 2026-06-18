import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { C } from '../theme';
import { ROLES } from '../utils/roles';

export default function ProfileAvatar() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);

  const initials = ((user?.first_name?.[0] || '') + (user?.last_name?.[0] || '')).toUpperCase()
    || user?.email?.[0]?.toUpperCase() || '?';

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'User';

  const goToProfile = () => {
    setOpen(false);
    const role = user?.role;
    if (!role || role === ROLES.FARMER) {
      navigation.navigate('Dashboard', { screen: 'Profile' });
    } else {
      navigation.navigate('CoopProfile');
    }
  };

  const handleSignOut = () => {
    setOpen(false);
    logout();
  };

  return (
    <>
      <TouchableOpacity style={s.avatar} onPress={() => setOpen(true)} activeOpacity={0.85}>
        <Text style={s.avatarText}>{initials}</Text>
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={open} onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={s.menu}>
            <View style={s.menuHeader}>
              <View style={s.menuAvatar}>
                <Text style={s.menuAvatarText}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuName} numberOfLines={1}>{fullName}</Text>
                <Text style={s.menuEmail} numberOfLines={1}>{user?.email || user?.phone || ''}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <TouchableOpacity style={s.item} onPress={goToProfile} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={18} color={C.steel700} />
              <Text style={s.itemText}>My Profile</Text>
            </TouchableOpacity>
            <View style={s.divider} />
            <TouchableOpacity style={s.item} onPress={handleSignOut} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text style={[s.itemText, { color: '#dc2626' }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.c700,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '900', color: C.white },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  menu: {
    position: 'absolute', top: 88, right: 18, width: 230,
    backgroundColor: C.white, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
    overflow: 'hidden',
  },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  menuAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center',
  },
  menuAvatarText: { fontSize: 14, fontWeight: '900', color: C.white },
  menuName: { fontSize: 13, fontWeight: '800', color: C.ink },
  menuEmail: { fontSize: 11, color: C.muted, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.steel100 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  itemText: { fontSize: 14, fontWeight: '600', color: C.ink },
});
