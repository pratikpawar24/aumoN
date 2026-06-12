import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../../theme/theme';
import routeService from '../../services/routeService';
import mapService from '../../services/mapService';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/helpers';
import Loading from '../../components/common/Loading';

const PERIODS = [{ k: 'week', l: 'Week' }, { k: 'month', l: 'Month' }, { k: 'year', l: 'Year' }];

const DashboardScreen = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const [a, lb] = await Promise.all([
        routeService.analytics(period),
        mapService.leaderboard().catch(() => []),
      ]);
      setData(a);
      setBoard(lb.slice(0, 5));
    } catch (e) {
      setErr(apiError(e, 'Could not load dashboard.'));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const totals = data?.totals || {};
  const series = data?.co2Series || [];
  const maxCo2 = Math.max(1, ...series.map((s) => s.co2SavedKg || 0));

  const stats = [
    { label: 'CO₂ saved', value: `${totals.co2SavedKg ?? 0} kg`, icon: '🌿' },
    { label: 'Trips', value: totals.trips ?? 0, icon: '🧭' },
    { label: 'Distance', value: `${totals.distanceKm ?? 0} km`, icon: '📏' },
    { label: 'Time saved', value: `${totals.timeSavedHours ?? 0} h`, icon: '⏱️' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      >
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.sub}>{user?.name ? `Hi ${user.name.split(' ')[0]} · ` : ''}your green impact</Text>
        </View>

        <View style={styles.periods}>
          {PERIODS.map((p) => (
            <TouchableOpacity key={p.k} style={[styles.period, period === p.k && styles.periodOn]} onPress={() => setPeriod(p.k)}>
              <Text style={[styles.periodText, period === p.k && styles.periodTextOn]}>{p.l}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && !data ? (
          <Loading label="Crunching numbers…" />
        ) : err ? (
          <Text style={styles.err}>{err}</Text>
        ) : (
          <>
            <View style={styles.grid}>
              {stats.map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>CO₂ saved over time</Text>
              {series.length === 0 ? (
                <Text style={styles.muted}>No trips in this period yet.</Text>
              ) : (
                <View style={styles.chart}>
                  {series.slice(-12).map((s, i) => (
                    <View key={i} style={styles.barCol}>
                      <View style={[styles.bar, { height: 8 + (s.co2SavedKg / maxCo2) * 90 }]} />
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>🏆 Green leaderboard</Text>
              {board.length === 0 ? (
                <Text style={styles.muted}>Leaderboard unavailable.</Text>
              ) : board.map((u, i) => (
                <View key={u._id || i} style={styles.lbRow}>
                  <Text style={styles.lbRank}>{i + 1}</Text>
                  <Text style={styles.lbName} numberOfLines={1}>{u.name || 'User'}</Text>
                  <Text style={styles.lbScore}>{Math.round((u.totalCO2Saved || 0) / 1000)} kg</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  sub: { color: colors.textSubtle, marginTop: 2 },
  periods: { flexDirection: 'row', gap: 8 },
  period: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  periodOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  periodText: { color: colors.textSubtle, fontWeight: '700' },
  periodTextOn: { color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  statIcon: { fontSize: 20 },
  statValue: { color: colors.text, fontSize: font.h2, fontWeight: '800', marginTop: 6 },
  statLabel: { color: colors.textSubtle, fontSize: font.small, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardTitle: { color: colors.text, fontWeight: '700', marginBottom: spacing.md },
  muted: { color: colors.textSubtle, fontSize: font.small },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 110 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.primary, borderRadius: 3 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  lbRank: { color: colors.primary, fontWeight: '800', width: 18 },
  lbName: { color: colors.text, flex: 1 },
  lbScore: { color: colors.textSubtle, fontWeight: '700' },
  err: { color: colors.danger },
});

export default DashboardScreen;
