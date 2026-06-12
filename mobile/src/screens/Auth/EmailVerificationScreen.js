import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing, radius } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import { apiError } from '../../utils/helpers';
import Button from '../../components/common/Button';

const COOLDOWN = 60;

const EmailVerificationScreen = () => {
  const { user, verifyEmail, logout, refreshUser } = useAuth();
  const inputs = useRef([]);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sentOnce, setSentOnce] = useState(false);

  const otp = digits.join('');

  // Auto-send once on mount (token-based; backend knows who we are).
  useEffect(() => {
    if (sentOnce) return;
    setSentOnce(true);
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = async () => {
    try {
      const res = await authService.sendVerification();
      setCooldown(COOLDOWN);
      if (res?.alreadyVerified) { refreshUser(); return; }
      Alert.alert('Code sent', res?.devFallback
        ? 'Dev mode: the OTP was logged to the backend console.'
        : `We sent a 6-digit code to ${user?.email}.`);
    } catch (e) {
      const wait = e?.response?.data?.retryAfter;
      if (wait) setCooldown(wait);
      Alert.alert('Could not send', apiError(e, 'Try again shortly.'));
    }
  };

  const setDigit = (i, v) => {
    const c = v.replace(/\D/g, '').slice(-1);
    setDigits((d) => { const n = [...d]; n[i] = c; return n; });
    if (c && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKey = (i, e) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const onVerify = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      await verifyEmail(otp);
      // emailVerified flips true → navigator switches to Main automatically.
    } catch (e) {
      Alert.alert('Verification failed', apiError(e, 'Incorrect or expired code.'));
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.sub}>Code sent to{'\n'}<Text style={styles.email}>{user?.email}</Text></Text>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChangeText={(v) => setDigit(i, v)}
              onKeyPress={(e) => onKey(i, e)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.otpBox}
              editable={!verifying}
            />
          ))}
        </View>

        <Button title="Verify email" onPress={onVerify} loading={verifying} disabled={otp.length !== 6} style={{ width: '100%' }} />

        <View style={styles.row}>
          <TouchableOpacity onPress={send} disabled={cooldown > 0}>
            <Text style={[styles.resend, cooldown > 0 && styles.resendOff]}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.signout}>Sign out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  icon: { fontSize: 52, marginBottom: spacing.md },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: { color: colors.textSubtle, textAlign: 'center', marginTop: 8, marginBottom: spacing.xl, fontSize: font.body },
  email: { color: colors.primary, fontWeight: '700' },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: spacing.xl, gap: 8 },
  otpBox: {
    flex: 1, height: 56, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: spacing.xl },
  resend: { color: colors.primary, fontWeight: '700' },
  resendOff: { color: colors.textSubtle },
  signout: { color: colors.textSubtle },
});

export default EmailVerificationScreen;
