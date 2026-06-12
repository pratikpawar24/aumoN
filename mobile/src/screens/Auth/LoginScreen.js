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

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    if (!email || !password) return Alert.alert('Missing info', 'Enter your email and password.');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Navigation switches automatically via auth state (Main / Verify).
    } catch (e) {
      Alert.alert('Login failed', apiError(e, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🌿 AumoN</Text>
          <Text style={styles.tag}>Sustainable carpooling</Text>

          <View style={styles.form}>
            <Input label="Email" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" editable={!loading} />
            <Input label="Password" value={password} onChangeText={setPassword}
              secureTextEntry placeholder="••••••••" editable={!loading} />
            <Button title="Log in" onPress={onLogin} loading={loading} style={{ marginTop: 6 }} />

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link} disabled={loading}>
              <Text style={styles.linkText}>No account? <Text style={styles.linkBold}>Create one</Text></Text>
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
  logo: { fontSize: 40, fontWeight: '800', color: colors.text, textAlign: 'center' },
  tag: { color: colors.textSubtle, textAlign: 'center', marginTop: 6, marginBottom: spacing.xxl, fontSize: font.body },
  form: { width: '100%' },
  link: { marginTop: spacing.xl, alignItems: 'center' },
  linkText: { color: colors.textSubtle },
  linkBold: { color: colors.primary, fontWeight: '700' },
});

export default LoginScreen;
