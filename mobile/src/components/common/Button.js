import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius, font } from '../../theme/theme';

const Button = ({ title, onPress, loading, disabled, variant = 'primary', style, icon }) => {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.btn, { backgroundColor: v.bg, borderColor: v.border }, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.text, { color: v.fg }]}>{icon ? `${icon}  ` : ''}{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const VARIANTS = {
  primary: { bg: colors.primary, fg: '#04210f', border: colors.primary },
  danger: { bg: colors.danger, fg: colors.white, border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
};

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: font.body, fontWeight: '700' },
});

export default Button;
