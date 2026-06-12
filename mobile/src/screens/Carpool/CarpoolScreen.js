import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../../theme/theme';
import FindRides from './FindRides';
import ScheduleRide from './ScheduleRide';
import RideHistory from './RideHistory';

const TABS = [
  { k: 'find', label: 'Find' },
  { k: 'schedule', label: 'Schedule' },
  { k: 'history', label: 'History' },
];

const CarpoolScreen = () => {
  const [tab, setTab] = useState('find');
  // Bump to force the history tab to reload after scheduling.
  const [reload, setReload] = useState(0);
  const goHistory = useCallback(() => { setReload((n) => n + 1); setTab('history'); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>🚗 Smart Carpool</Text>
        <Text style={styles.sub}>Share rides, cut emissions</Text>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Text
            key={t.k}
            onPress={() => setTab(t.k)}
            style={[styles.tab, tab === t.k && styles.tabOn]}
          >
            {t.label}
          </Text>
        ))}
      </View>

      <View style={styles.body}>
        {tab === 'find' && <FindRides />}
        {tab === 'schedule' && <ScheduleRide onScheduled={goHistory} />}
        {tab === 'history' && <RideHistory reloadKey={reload} />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  title: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  sub: { color: colors.textSubtle, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: 8, padding: spacing.lg },
  tab: {
    flex: 1, textAlign: 'center', paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.surface, color: colors.textSubtle, fontWeight: '700', overflow: 'hidden',
  },
  tabOn: { backgroundColor: colors.primary, color: '#04210f' },
  body: { flex: 1 },
});

export default CarpoolScreen;
