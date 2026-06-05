import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const { width } = Dimensions.get('window');

const VARIANTS = {
  confirm: {
    icon:      'help-circle',
    iconColor: C.c700,
    iconBg:    C.c100,
    iconBorder:C.c300,
    btnBg:     C.c700,
    btnText:   C.white,
  },
  danger: {
    icon:      'warning',
    iconColor: '#dc2626',
    iconBg:    '#fef2f2',
    iconBorder:'#fca5a5',
    btnBg:     '#dc2626',
    btnText:   C.white,
  },
  success: {
    icon:      'checkmark-circle',
    iconColor: '#15803d',
    iconBg:    '#f0fdf4',
    iconBorder:'#86efac',
    btnBg:     '#15803d',
    btnText:   C.white,
  },
  warning: {
    icon:      'alert-circle',
    iconColor: '#d97706',
    iconBg:    '#fffbeb',
    iconBorder:'#fcd34d',
    btnBg:     '#d97706',
    btnText:   C.white,
  },
  info: {
    icon:      'information-circle',
    iconColor: '#0369a1',
    iconBg:    '#e0f2fe',
    iconBorder:'#7dd3fc',
    btnBg:     '#0369a1',
    btnText:   C.white,
  },
};

/**
 * AppModal — modern confirm / alert replacement for Alert.alert
 *
 * Props:
 *   visible       boolean
 *   type          'confirm' | 'danger' | 'success' | 'warning' | 'info'
 *   icon          optional Ionicons name override
 *   title         string (required)
 *   message       string (optional body)
 *   confirmLabel  string  default 'OK'
 *   cancelLabel   string  — omit for single-button alert mode
 *   onConfirm     () => void
 *   onCancel      () => void — omit for single-button alert mode
 */
export default function AppModal({
  visible,
  type = 'confirm',
  icon,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  const scale   = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(0.82);
      opacity.setValue(0);
    }
  }, [visible]);

  const v = VARIANTS[type] || VARIANTS.confirm;
  const iconName = icon || v.icon;
  const isSingleBtn = !cancelLabel || !onCancel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
    >
      {/* Backdrop — tapping it cancels if possible */}
      <Pressable style={s.backdrop} onPress={isSingleBtn ? onConfirm : onCancel}>
        <Animated.View
          style={[s.sheet, { opacity, transform: [{ scale }] }]}
        >
          {/* Stop backdrop tap propagating inside card */}
          <Pressable>
            {/* ── Icon ── */}
            <View style={[s.iconWrap, { backgroundColor: v.iconBg, borderColor: v.iconBorder }]}>
              <Ionicons name={iconName} size={36} color={v.iconColor} />
            </View>

            {/* ── Text ── */}
            <Text style={s.title}>{title}</Text>
            {!!message && <Text style={s.message}>{message}</Text>}

            {/* ── Buttons ── */}
            {isSingleBtn ? (
              <TouchableOpacity
                style={[s.singleBtn, { backgroundColor: v.btnBg }]}
                onPress={onConfirm}
                activeOpacity={0.82}
              >
                <Text style={[s.btnLabel, { color: v.btnText }]}>{confirmLabel}</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.btnRow}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={onCancel}
                  activeOpacity={0.75}
                >
                  <Text style={s.cancelLabel}>{cancelLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.confirmBtn, { backgroundColor: v.btnBg }]}
                  onPress={onConfirm}
                  activeOpacity={0.82}
                >
                  <Text style={[s.btnLabel, { color: v.btnText }]}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/**
 * useAppModal — convenience hook
 *
 * const modal = useAppModal();
 * modal.show({ type, title, message, confirmLabel, cancelLabel, onConfirm, onCancel })
 * <AppModal {...modal.props} />
 */
export function useAppModal() {
  const [state, setState] = React.useState({ visible: false });

  const show = (opts) => setState({ ...opts, visible: true });
  const hide = () => setState(prev => ({ ...prev, visible: false }));

  const props = {
    ...state,
    onConfirm: () => { hide(); state.onConfirm?.(); },
    onCancel:  () => { hide(); state.onCancel?.(); },
  };

  return { show, hide, props };
}

const SHEET_WIDTH = Math.min(width - 48, 360);

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  sheet: {
    width: SHEET_WIDTH,
    backgroundColor: C.white,
    borderRadius: 28,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'stretch',
    // shadow
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 24,
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 26,
  },

  message: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 4,
  },

  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },

  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.steel200,
    backgroundColor: C.steel100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.steel700,
  },

  confirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },

  singleBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },

  btnLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
