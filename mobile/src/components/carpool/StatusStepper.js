import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font } from '../../theme/theme';

// Presentational stepper mapped from the existing CarpoolRequest status. No new
// state — purely reflects ride.status.
const STEPS = ['pending', 'matched', 'completed'];
const LABELS = { pending: 'Requested', matched: 'Matched', completed: 'Completed' };

const StatusStepper = ({ status }) => {
  if (status === 'cancelled') {
    return <View style={styles.cancelled}><Text style={styles.cancelledText}>Cancelled</Text></View>;
  }
  const normalized = status === 'matching' ? 'pending' : status;
  const activeIdx = Math.max(0, STEPS.indexOf(normalized));
  return (
    <View style={styles.row}>
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <View style={styles.step}>
            <View style={[styles.dot, i <= activeIdx && styles.dotOn]} />
            <Text style={[styles.label, i <= activeIdx && styles.labelOn]}>{LABELS[s]}</Text>
          </View>
          {i < STEPS.length - 1 && <View style={[styles.line, i < activeIdx && styles.lineOn]} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { alignItems: 'center', width: 80 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border, marginBottom: 4 },
  dotOn: { backgroundColor: colors.primary },
  label: { color: colors.textSubtle, fontSize: font.tiny },
  labelOn: { color: colors.primary, fontWeight: '700' },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 16 },
  lineOn: { backgroundColor: colors.primary },
  cancelled: { paddingVertical: 8, alignItems: 'center' },
  cancelledText: { color: colors.danger, fontWeight: '700' },
});

export default StatusStepper;
