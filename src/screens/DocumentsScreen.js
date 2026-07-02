import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { farmerAPI } from '../services/api';
import { C } from '../theme';

// Document type definitions for EUDR / KYC compliance
const REQUIRED_DOCS = [
  {
    key: 'national_id',
    label: 'National ID',
    description: 'Front and back of your national identity card.',
    icon: 'card-outline',
    category: 'identity',
    required: true,
  },
  {
    key: 'passport_photo',
    label: 'Passport Photo',
    description: 'A recent passport-size photograph.',
    icon: 'person-circle-outline',
    category: 'identity',
    required: true,
  },
  {
    key: 'land_title',
    label: 'Land Title / Ownership Proof',
    description: 'Title deed, lease agreement, or customary ownership document for your farm land.',
    icon: 'document-text-outline',
    category: 'farm',
    required: true,
  },
];

const CATEGORIES = [
  { key: 'identity', label: 'Identity Documents', icon: 'person-outline' },
  { key: 'farm',     label: 'Farm Documents',     icon: 'leaf-outline' },
];

const statusInfo = (doc, uploadedMap) => {
  const uploaded = uploadedMap[doc.key];
  if (uploaded?.status === 'approved') return { label: 'Approved', color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' };
  if (uploaded?.status === 'rejected') return { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' };
  if (uploaded)                        return { label: 'Under Review', color: '#0891b2', bg: '#e0f2fe', icon: 'time-outline' };
  if (doc.required)                    return { label: 'Required', color: '#b45309', bg: '#fef3c7', icon: 'alert-circle-outline' };
  return { label: 'Optional', color: C.steel600, bg: C.steel100, icon: 'ellipse-outline' };
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const [documents,  setDocuments]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState(null); // key of doc being uploaded

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await farmerAPI.getDocuments();
      const list = Array.isArray(res.data) ? res.data : (res.data?.documents || []);
      setDocuments(list);
    } catch (e) {
      console.warn('Documents load:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Build a map from doc_type → document record for quick lookup
  const uploadedMap = documents.reduce((acc, d) => {
    if (d.doc_type || d.document_type) {
      acc[d.doc_type || d.document_type] = d;
    }
    return acc;
  }, {});

  const requiredCount = REQUIRED_DOCS.filter(d => d.required).length;
  const uploadedRequiredCount = REQUIRED_DOCS.filter(d => d.required && uploadedMap[d.key]).length;
  const completeness = requiredCount > 0 ? Math.round((uploadedRequiredCount / requiredCount) * 100) : 0;

  const handleUpload = (doc) => {
    // expo-image-picker / expo-document-picker not yet installed.
    // This stub shows the user the action path; wire up the picker when the package is added.
    Alert.alert(
      `Upload: ${doc.label}`,
      'To upload documents, please use the Plotra web portal or contact your cooperative officer.\n\nWeb portal: dev.plotra.eu',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Contact Cooperative',
          onPress: () => Alert.alert(
            'Contact Your Cooperative',
            'Bring your documents to your cooperative office. Your cooperative officer can upload them on your behalf.'
          ),
        },
      ]
    );
  };

  const allDone = uploadedRequiredCount === requiredCount;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.headerTitle}>My Documents</Text>
            <Text style={s.headerSub}>KYC & EUDR compliance files</Text>
          </View>
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Progress summary */}
          <View style={[s.progressCard, { borderColor: allDone ? '#bbf7d0' : '#fde68a' }]}>
            <View style={s.progressTop}>
              <Ionicons
                name={allDone ? 'checkmark-circle' : 'document-outline'}
                size={24}
                color={allDone ? '#15803d' : '#d97706'}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.progressTitle}>
                  {allDone ? 'All Required Documents Submitted' : 'Documents Incomplete'}
                </Text>
                <Text style={s.progressSub}>
                  {uploadedRequiredCount} of {requiredCount} required documents submitted
                </Text>
              </View>
              <Text style={[s.progressPct, { color: allDone ? '#15803d' : '#d97706' }]}>{completeness}%</Text>
            </View>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${completeness}%`, backgroundColor: allDone ? '#15803d' : '#f59e0b' }]} />
            </View>
          </View>

          {CATEGORIES.map((cat) => {
            const catDocs = REQUIRED_DOCS.filter(d => d.category === cat.key);
            return (
              <View key={cat.key} style={s.section}>
                <View style={s.sectionHeader}>
                  <Ionicons name={cat.icon} size={16} color={C.c700} />
                  <Text style={s.sectionTitle}>{cat.label}</Text>
                </View>
                <View style={s.card}>
                  {catDocs.map((doc, i) => {
                    const st = statusInfo(doc, uploadedMap);
                    const uploaded = uploadedMap[doc.key];
                    return (
                      <View key={doc.key} style={[s.docRow, i < catDocs.length - 1 && s.docRowBorder]}>
                        <View style={[s.docIconBox, { backgroundColor: st.bg }]}>
                          <Ionicons name={doc.icon} size={18} color={st.color} />
                        </View>
                        <View style={s.docInfo}>
                          <View style={s.docTitleRow}>
                            <Text style={s.docLabel}>{doc.label}</Text>
                            <View style={[s.statusPill, { backgroundColor: st.bg }]}>
                              <Ionicons name={st.icon} size={10} color={st.color} />
                              <Text style={[s.statusPillText, { color: st.color }]}>{st.label}</Text>
                            </View>
                          </View>
                          <Text style={s.docDesc}>{doc.description}</Text>
                          {uploaded?.file_name && (
                            <Text style={s.docFileName} numberOfLines={1}>
                              {uploaded.file_name}
                              {uploaded.uploaded_at ? `  ·  ${fmtDate(uploaded.uploaded_at)}` : ''}
                            </Text>
                          )}
                          {uploaded?.rejection_reason && (
                            <Text style={s.docReject}>Reason: {uploaded.rejection_reason}</Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={[s.uploadBtn, uploaded && s.uploadBtnRe]}
                          onPress={() => handleUpload(doc)}
                          disabled={uploading === doc.key}
                          activeOpacity={0.8}
                        >
                          {uploading === doc.key
                            ? <ActivityIndicator size="small" color={C.white} />
                            : <Ionicons name={uploaded ? 'refresh-outline' : 'cloud-upload-outline'} size={16} color={uploaded ? C.c700 : C.white} />
                          }
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Info note */}
          <View style={s.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
            <Text style={s.infoText}>
              Documents are used to verify your identity and farm ownership for EUDR compliance. All files are encrypted and stored securely. Contact your cooperative officer if you need help uploading.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.steel100 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { backgroundColor: C.white, paddingLeft: 56, paddingRight: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.steel200 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.ink },
  headerSub: { fontSize: 11, color: C.muted, marginTop: 1 },

  scroll: { flex: 1 },
  content: { padding: 16 },

  progressCard: { backgroundColor: C.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  progressTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: '800', color: C.ink },
  progressSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  progressPct: { fontSize: 22, fontWeight: '900', marginLeft: 8 },
  progressBar: { height: 8, backgroundColor: C.steel200, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  section: { marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: { backgroundColor: C.white, borderRadius: 16, marginBottom: 10, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  docIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  docInfo: { flex: 1 },
  docTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' },
  docLabel: { fontSize: 13, fontWeight: '800', color: C.ink },
  docDesc: { fontSize: 11, color: C.muted, lineHeight: 16, marginTop: 2 },
  docFileName: { fontSize: 11, color: C.c700, fontWeight: '600', marginTop: 4 },
  docReject: { fontSize: 11, color: '#dc2626', fontWeight: '600', marginTop: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillText: { fontSize: 10, fontWeight: '800' },

  uploadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.c700, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  uploadBtnRe: { backgroundColor: C.c050, borderWidth: 1.5, borderColor: C.c200 },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { flex: 1, fontSize: 12, color: '#1e40af', lineHeight: 18, fontWeight: '500' },
});
