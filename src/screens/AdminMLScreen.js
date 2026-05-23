import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminAPI } from '../services/api';
import { C } from '../theme';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const InfoRow = ({ label, value, accent }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={[s.infoVal, accent && { color: accent }]}>{value ?? '—'}</Text>
  </View>
);

const MetricBar = ({ label, value, maxVal = 1, color }) => {
  const pct = Math.min(100, Math.max(0, (value ?? 0) / maxVal * 100));
  return (
    <View style={s.metricRow}>
      <Text style={s.metricLabel}>{label}</Text>
      <View style={s.metricBarBg}>
        <View style={[s.metricBarFill, { width: `${pct}%`, backgroundColor: color || C.c700 }]} />
      </View>
      <Text style={s.metricVal}>{value != null ? (value < 1 ? `${(value * 100).toFixed(1)}%` : value.toFixed(2)) : '—'}</Text>
    </View>
  );
};

const STATUS_COLOR = {
  ready: C.eudrLow,
  training: C.eudrMedium,
  failed: C.eudrHigh,
  idle: C.steel700,
};

export default function AdminMLScreen() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [stRes, logRes] = await Promise.all([
        adminAPI.getMLStatus(),
        adminAPI.getMLLogs().catch(() => ({ data: [] })),
      ]);
      setStatus(stRes.data);
      const logData = logRes.data;
      setLogs(Array.isArray(logData) ? logData : logData?.logs || []);
    } catch (e) {
      console.warn('ML status:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleRetrain = () => {
    Alert.alert(
      'Retrain ML Classifier',
      'This will queue a new XGBoost training run using current labelled data. It may take 10-30 minutes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Training',
          onPress: async () => {
            setRetraining(true);
            try {
              await adminAPI.retrainML({ retrain_reason: 'Manual admin trigger' });
              Alert.alert('Training Started', 'ML retraining has been queued. Check back in ~15 minutes.');
              await load(true);
            } catch (e) {
              Alert.alert('Error', e.response?.data?.detail || 'Failed to start retraining.');
            } finally {
              setRetraining(false);
            }
          },
        },
      ]
    );
  };

  const modelStatus = status?.model_status || 'unknown';
  const statusColor = STATUS_COLOR[modelStatus] || C.steel700;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />

      <View style={s.hero}>
        <SafeAreaView>
          <Text style={s.heroTitle}>ML Engine</Text>
          <Text style={s.heroSub}>XGBoost EUDR Classifier</Text>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={C.c700} size="large" /></View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.c700} />}
        >
          {/* Status card */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Model Status</Text>
            <View style={[s.statusCard, { borderColor: statusColor + '40' }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.statusLabel, { color: statusColor }]}>
                  {modelStatus.toUpperCase()}
                </Text>
                <Text style={s.statusSub}>
                  {modelStatus === 'ready' ? 'Classifier is operational'
                    : modelStatus === 'training' ? 'Retraining in progress...'
                    : modelStatus === 'failed' ? 'Last training failed'
                    : 'Awaiting training data'}
                </Text>
              </View>
              {modelStatus === 'training' && (
                <ActivityIndicator color={C.eudrMedium} size="small" />
              )}
            </View>
          </View>

          {/* Model info */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Model Info</Text>
            <View style={s.card}>
              <InfoRow label="Version" value={status?.model_version} />
              <InfoRow label="Algorithm" value={status?.algorithm || 'XGBoost'} />
              <InfoRow label="Features" value={status?.feature_count != null ? `${status.feature_count} features` : null} />
              <InfoRow label="Training samples" value={status?.training_samples} />
              <InfoRow label="Last trained" value={fmtDate(status?.last_trained_at)} />
              <InfoRow label="Last retrain by" value={status?.trained_by || '—'} />
            </View>
          </View>

          {/* Performance metrics */}
          {status?.metrics && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Performance Metrics</Text>
              <View style={s.card}>
                <MetricBar label="Accuracy" value={status.metrics.accuracy} maxVal={1} color={C.eudrLow} />
                <MetricBar label="Precision" value={status.metrics.precision} maxVal={1} color={C.c700} />
                <MetricBar label="Recall" value={status.metrics.recall} maxVal={1} color="#6366f1" />
                <MetricBar label="F1 Score" value={status.metrics.f1_score} maxVal={1} color="#0284c7" />
                {status.metrics.auc_roc != null && (
                  <MetricBar label="AUC-ROC" value={status.metrics.auc_roc} maxVal={1} color={C.eudrMedium} />
                )}
              </View>
            </View>
          )}

          {/* Feature importance preview */}
          {status?.top_features?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Top Features</Text>
              <View style={s.card}>
                {status.top_features.slice(0, 8).map((f, i) => (
                  <View key={f.name} style={[s.featureRow, i < status.top_features.length - 1 && s.borderBottom]}>
                    <Text style={s.featureRank}>{i + 1}</Text>
                    <Text style={s.featureName} numberOfLines={1}>{f.name}</Text>
                    <View style={s.featureBarBg}>
                      <View style={[s.featureBarFill, { width: `${Math.min(100, (f.importance ?? 0) * 100)}%` }]} />
                    </View>
                    <Text style={s.featureScore}>{f.importance != null ? f.importance.toFixed(3) : '—'}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <View style={s.section}>
              <TouchableOpacity style={s.logToggle} onPress={() => setShowLogs(!showLogs)}>
                <Text style={s.sectionTitle}>Training Logs</Text>
                <Ionicons name={showLogs ? 'chevron-up' : 'chevron-down'} size={16} color={C.steel700} />
              </TouchableOpacity>
              {showLogs && (
                <View style={[s.card, s.logCard]}>
                  {logs.slice(0, 20).map((log, i) => (
                    <View key={i} style={[s.logRow, i < logs.length - 1 && s.borderBottom]}>
                      <Text style={[s.logLevel, { color: log.level === 'error' ? C.eudrHigh : C.muted }]}>
                        [{log.level?.toUpperCase() || 'INFO'}]
                      </Text>
                      <Text style={s.logMsg} numberOfLines={2}>{log.message}</Text>
                      <Text style={s.logTime}>{fmtDate(log.timestamp)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Retrain button */}
          <View style={s.section}>
            <TouchableOpacity
              style={[s.retrainBtn, (retraining || modelStatus === 'training') && s.btnDisabled]}
              onPress={handleRetrain}
              disabled={retraining || modelStatus === 'training'}
              activeOpacity={0.85}
            >
              {retraining ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Ionicons name="refresh-circle-outline" size={22} color={C.white} />
                  <Text style={s.retrainText}>
                    {modelStatus === 'training' ? 'Training in Progress...' : 'Trigger Retraining'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={s.retrainNote}>
              Retraining uses all labelled parcels with confirmed EUDR status. Requires ≥100 samples.
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
  hero: { backgroundColor: C.c800, paddingHorizontal: 24, paddingBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: C.white, marginTop: 8 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.steel700, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  card: { backgroundColor: C.white, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.white, borderRadius: 18, padding: 18, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  statusLabel: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  statusSub: { fontSize: 13, color: C.muted },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.steel100 },
  infoLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  infoVal: { fontSize: 14, color: C.ink, fontWeight: '700' },

  metricRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.steel100, gap: 10 },
  metricLabel: { width: 70, fontSize: 12, fontWeight: '700', color: C.muted },
  metricBarBg: { flex: 1, height: 8, backgroundColor: C.steel100, borderRadius: 4, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 4 },
  metricVal: { fontSize: 12, fontWeight: '800', color: C.ink, width: 46, textAlign: 'right' },

  featureRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: C.steel100 },
  featureRank: { width: 20, fontSize: 12, fontWeight: '800', color: C.subtle, textAlign: 'center' },
  featureName: { width: 120, fontSize: 12, fontWeight: '700', color: C.ink },
  featureBarBg: { flex: 1, height: 6, backgroundColor: C.steel100, borderRadius: 3, overflow: 'hidden' },
  featureBarFill: { height: '100%', borderRadius: 3, backgroundColor: C.c700 },
  featureScore: { fontSize: 11, fontWeight: '700', color: C.muted, width: 38, textAlign: 'right' },

  logToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  logCard: { paddingVertical: 4 },
  logRow: { paddingHorizontal: 14, paddingVertical: 10 },
  logLevel: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  logMsg: { fontSize: 12, color: C.ink, fontWeight: '500', marginBottom: 2 },
  logTime: { fontSize: 10, color: C.subtle },

  retrainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.c700, borderRadius: 18, paddingVertical: 18, shadowColor: C.c700, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  btnDisabled: { backgroundColor: C.steel300, shadowOpacity: 0 },
  retrainText: { fontSize: 16, fontWeight: '800', color: C.white },
  retrainNote: { fontSize: 12, color: C.subtle, textAlign: 'center', marginTop: 12, lineHeight: 18 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
});
