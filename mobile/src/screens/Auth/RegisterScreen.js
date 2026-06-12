import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, spacing } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/helpers';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const onRegister = async () => {
    if (!form.name || !form.email || !form.password) return Alert.alert('Missing info', 'Name, email and password are required.');
    if (form.password.length < 6) return Alert.alert('Weak password', 'Use at least 6 characters.');
    if (form.password !== form.confirm) return Alert.alert('Mismatch', 'Passwords do not match.');
    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password,
      });
      // Auth state flips to authenticated+unverified → Verify screen shows.
    } catch (e) {
      Alert.alert('Registration failed', apiError(e, 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.sub}>Join AumoN and start saving CO₂</Text>

          <View style={styles.form}>
            <Input label="Full name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Darshan" editable={!loading} />
            <Input label="Email" value={form.email} onChangeText={(v) => set('email', v)}
              autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" editable={!loading} />
            <Input label="Mobile (optional)" value={form.mobile} onChangeText={(v) => set('mobile', v)}
              keyboardType="phone-pad" maxLength={10} placeholder="10-digit number" editable={!loading} />
            <Input label="Password" value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry placeholder="min 6 characters" editable={!loading} />
            <Input label="Confirm password" value={form.confirm} onChangeText={(v) => set('confirm', v)} secureTextEntry placeholder="repeat password" editable={!loading} />
            <Button title="Register" onPress={onRegister} loading={loading} style={{ marginTop: 6 }} />

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link} disabled={loading}>
              <Text style={styles.linkText}>Already a member? <Text style={styles.linkBold}>Log in</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { color: colors.textSubtle, textAlign: 'center', marginTop: 6, marginBottom: spacing.xl, fontSize: font.body },
  form: { width: '100%' },
  link: { marginTop: spacing.lg, alignItems: 'center' },
  linkText: { color: colors.textSubtle },
  linkBold: { color: colors.primary, fontWeight: '700' },
});

export default RegisterScreen;
