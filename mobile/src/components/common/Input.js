import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius, font, spacing } from '../../theme/theme';

const Input = ({ label, style, ...props }) => (
  <View style={styles.wrap}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      placeholderTextColor={colors.textSubtle}
      style={[styles.input, style]}
      {...props}
    />
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { color: colors.textSubtle, fontSize: font.small, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: colors.text,
    fontSize: font.body,
    minHeight: 50,
  },
});

export default Input;
