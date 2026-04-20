import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { dashboardAPI } from '../../api/client';
import { COLORS } from '../../config';

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ icon, label, value, color }) {
  return (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ResultBar({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barCount}>{value} ({pct.toFixed(0)}%)</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function UserStatRow({ stat }) {
  const passColor = stat.passRate >= 80 ? COLORS.success
                  : stat.passRate >= 50 ? COLORS.warning
                  : COLORS.error;
  return (
    <View style={styles.userRow}>
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>{stat.name?.[0]?.toUpperCase() || '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{stat.name}</Text>
        <Text style={styles.userMeta}>
          {stat.total} runs · {stat.total_results} results
        </Text>
      </View>
      <View style={[styles.passRateBadge, { backgroundColor: passColor + '20', borderColor: passColor }]}>
        <Text style={[styles.passRateText, { color: passColor }]}>{stat.passRate}%</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [metrics,   setMetrics]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { data } = await dashboardAPI.getMetrics();
      setMetrics(data);
    } catch (err) {
      setError('Failed to load dashboard. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dist  = metrics?.resultDistribution || [];
  const total = dist.reduce((s, d) => s + (d.value || 0), 0);

  const DIST_COLORS = { Pass: COLORS.success, Fail: COLORS.error, Blocked: COLORS.warning, 'Not Executed': COLORS.textMuted };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.greetingSub}>Here's your QA overview</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <SummaryCard icon="documents-outline"   label="Test Cases"  value={metrics?.totalTestCases ?? '—'} color={COLORS.primary} />
        <SummaryCard icon="play-circle-outline" label="Test Runs"   value={metrics?.totalTestRuns  ?? '—'} color={COLORS.info} />
        <SummaryCard icon="checkmark-circle-outline" label="Completed" value={metrics?.completedRuns ?? '—'} color={COLORS.success} />
        <SummaryCard icon="time-outline"        label="In Progress" value={(metrics?.totalTestRuns ?? 0) - (metrics?.completedRuns ?? 0)} color={COLORS.warning} />
      </View>

      {/* Result Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Result Distribution</Text>
        {dist.length === 0
          ? <Text style={styles.emptyText}>No results yet.</Text>
          : dist.map(d => (
              <ResultBar
                key={d.name}
                label={d.name}
                value={d.value}
                total={total}
                color={DIST_COLORS[d.name] || COLORS.textMuted}
              />
            ))
        }
      </View>

      {/* User Stats */}
      {metrics?.userStats?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Performance</Text>
          {metrics.userStats.map(s => (
            <UserStatRow key={s.userId} stat={s} />
          ))}
        </View>
      )}

      {/* Release Stats */}
      {metrics?.releaseStats?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Release Stats</Text>
          {metrics.releaseStats.map((r, i) => (
            <View key={i} style={styles.releaseRow}>
              <Text style={styles.releaseName}>{r.name}</Text>
              <View style={styles.releaseChips}>
                <View style={[styles.chip, { backgroundColor: COLORS.success + '20' }]}>
                  <Text style={[styles.chipText, { color: COLORS.success }]}>P {r.pass}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: COLORS.error + '20' }]}>
                  <Text style={[styles.chipText, { color: COLORS.error }]}>F {r.fail}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: COLORS.warning + '20' }]}>
                  <Text style={[styles.chipText, { color: COLORS.warning }]}>B {r.blocked}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: COLORS.background },
  content:     { padding: 16, paddingBottom: 32 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  greetRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  greetingSub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  logoutBtn:   { padding: 8 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  summaryCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 14, borderLeftWidth: 4,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  summaryValue: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  summaryLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  section:      { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },

  barRow:       { marginBottom: 12 },
  barLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel:     { fontSize: 13, color: COLORS.text },
  barCount:     { fontSize: 12, color: COLORS.textMuted },
  barTrack:     { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  barFill:      { height: '100%', borderRadius: 4 },

  userRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  userAvatar:   { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  userAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  userName:     { fontSize: 14, fontWeight: '600', color: COLORS.text },
  userMeta:     { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  passRateBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  passRateText: { fontSize: 13, fontWeight: '700' },

  releaseRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  releaseName:  { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 1 },
  releaseChips: { flexDirection: 'row', gap: 6 },
  chip:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  chipText:     { fontSize: 12, fontWeight: '600' },

  errorText:    { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12, marginBottom: 20 },
  retryBtn:     { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontWeight: '600' },
  emptyText:    { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
});
