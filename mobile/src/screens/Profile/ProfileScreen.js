import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, font, radius, spacing } from '../../theme/theme';
import { CONFIG } from '../../constants/config';
import { useAuth } from '../../context/AuthContext';
import { apiError } from '../../utils/helpers';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Avatar may be an absolute (Cloudinary) URL or a backend-relative /uploads path.
const avatarUri = (avatar) =>
  !avatar ? null : avatar.startsWith('http') ? avatar : `${CONFIG.API_URL}${avatar}`;

const VEHICLES = [
  { k: 'car', l: '🚗 Car' },
  { k: 'electric', l: '⚡ Electric' },
  { k: 'motorcycle', l: '🏍️ Bike' },
];

const ProfileScreen = () => {
  const { user, updateUser, uploadAvatar, logout } = useAuth();
  const [vehicle, setVehicle] = useState(user?.vehicleType || 'car');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const dirty = vehicle !== (user?.vehicleType || 'car');

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', 'Allow photo access to set a picture.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const type = asset.mimeType || 'image/jpeg';
    const ext = type.split('/')[1] || 'jpg';
    setUploading(true);
    try {
      await uploadAvatar({ uri: asset.uri, name: `avatar.${ext}`, type });
    } catch (e) {
      Alert.alert('Upload failed', apiError(e));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateUser({ vehicleType: vehicle });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', apiError(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);

  const stats = [
    { label: 'Green score', value: user?.greenScore ?? 0 },
    { label: 'CO₂ saved', value: `${Math.round((user?.totalCO2Saved || 0) / 1000)} kg` },
    { label: 'Trips', value: user?.totalTrips ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatar} onPress={pickAvatar} disabled={uploading} activeOpacity={0.8}>
            {avatarUri(user?.avatar) ? (
              <Image source={{ uri: avatarUri(user?.avatar) }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
            )}
            <View style={styles.camBadge}>
              {uploading ? <ActivityIndicator size="small" color="#04210f" /> : <Ionicons name="camera" size={14} color="#04210f" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.emailVerified ? <Text style={styles.verified}>✓ Verified</Text> : null}
        </View>

        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Card>
          <Text style={styles.cardTitle}>Default vehicle</Text>
          <Text style={styles.cardSub}>Used for route emissions &amp; carpool.</Text>
          <View style={styles.row}>
            {VEHICLES.map((v) => (
              <TouchableOpacity key={v.k} style={[styles.chip, vehicle === v.k && styles.chipOn]} onPress={() => setVehicle(v.k)}>
                <Text style={[styles.chipText, vehicle === v.k && styles.chipTextOn]}>{v.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button title="Save changes" onPress={save} loading={saving} disabled={!dirty} style={{ marginTop: spacing.md }} />
        </Card>

        <Button title="Sign out" variant="danger" onPress={confirmLogout} icon="⎋" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingTop: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  avatarImg: { width: 80, height: 80, borderRadius: 40 },
  avatarText: { color: colors.primary, fontSize: 32, fontWeight: '800' },
  camBadge: { position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg },
  name: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  email: { color: colors.textSubtle, marginTop: 2 },
  verified: { color: colors.primary, marginTop: 4, fontWeight: '700', fontSize: font.small },
  grid: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  statLabel: { color: colors.textSubtle, fontSize: font.small, marginTop: 4, textAlign: 'center' },
  cardTitle: { color: colors.text, fontWeight: '700' },
  cardSub: { color: colors.textSubtle, fontSize: font.small, marginTop: 2, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textSubtle, fontWeight: '700' },
  chipTextOn: { color: colors.primary },
});

export default ProfileScreen;
