import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, font, spacing } from '../../theme/theme';

const Loading = ({ full, label }) => (
  <View style={[styles.wrap, full && styles.full]}>
    <ActivityIndicator size={full ? 'large' : 'small'} color={colors.primary} />
    {label ? <Text style={styles.label}>{label}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  full: { flex: 1, backgroundColor: colors.bg },
  label: { color: colors.textSubtle, marginTop: spacing.md, fontSize: font.small },
});

export default Loading;
