import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import adminService from '../../services/adminService';
import { apiError } from '../../utils/helpers';
import Loading from '../../components/common/Loading';

const AdminScreen = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const timer = useRef(null);

  const loadStats = useCallback(async () => {
    try { const d = await adminService.getStats(); setStats(d.stats); } catch (_) {}
  }, []);

  const loadUsers = useCallback(async (q = '') => {
    try {
      const d = await adminService.listUsers(q ? { search: q } : {});
      setUsers(d.users || []);
    } catch (e) {
      Alert.alert('Admin', apiError(e, 'Could not load users (admin only).'));
    }
  }, []);

  const initial = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers('')]);
    setLoading(false);
  }, [loadStats, loadUsers]);

  useEffect(() => { initial(); }, [initial]);

  const onSearch = (t) => {
    setSearch(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => loadUsers(t.trim()), 400);
  };

  const act = async (id, fn, label) => {
    setBusyId(id);
    try {
      await fn();
      await Promise.all([loadStats(), loadUsers(search.trim())]);
    } catch (e) {
      Alert.alert(label, apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const verify = (u) => act(u._id, () => adminService.verifyUser(u._id), 'Verify');
  const toggleBlock = (u) =>
    u.isBlocked
      ? act(u._id, () => adminService.unblockUser(u._id), 'Unblock')
      : Alert.alert('Block user', `Block ${u.name}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Block', style: 'destructive', onPress: () => act(u._id, () => adminService.blockUser(u._id, 'Blocked from mobile'), 'Block') },
        ]);

  if (loading) return <Loading full label="Loading admin console…" />;

  const STAT_CARDS = stats ? [
    { label: 'Users', value: stats.users?.total ?? 0 },
    { label: 'Verified', value: stats.users?.verified ?? 0 },
    { label: 'Blocked', value: stats.users?.blocked ?? 0 },
    { label: 'Active trips', value: stats.rides?.activeTrips ?? 0 },
    { label: 'Rides today', value: stats.rides?.today ?? 0 },
    { label: 'CO₂ 30d', value: `${Math.round((stats.emissions?.co2SavedG_30d || 0) / 1000)} kg` },
  ] : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={users}
        keyExtractor={(u) => u._id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={initial} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
            <Text style={styles.title}>🛡️ Admin console</Text>
            <View style={styles.grid}>
              {STAT_CARDS.map((s) => (
                <View key={s.label} style={styles.stat}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={16} color={colors.textSubtle} />
              <TextInput
                value={search} onChangeText={onSearch} placeholder="Search users by name / email…"
                placeholderTextColor={colors.textSubtle} style={styles.searchInput} autoCapitalize="none"
              />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>No users found.</Text>}
        renderItem={({ item: u }) => (
          <View style={styles.userCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
              <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
              <View style={styles.badges}>
                {u.isBlocked ? <Text style={[styles.badge, styles.badgeRed]}>blocked</Text> : null}
                {!u.emailVerified ? <Text style={[styles.badge, styles.badgeAmber]}>unverified</Text> : <Text style={[styles.badge, styles.badgeGreen]}>verified</Text>}
              </View>
            </View>
            <View style={styles.actions}>
              {!u.emailVerified && (
                <TouchableOpacity style={[styles.actBtn, styles.actGreen]} onPress={() => verify(u)} disabled={busyId === u._id}>
                  <Ionicons name="checkmark" size={16} color={colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actBtn, u.isBlocked ? styles.actGreen : styles.actRed]} onPress={() => toggleBlock(u)} disabled={busyId === u._id}>
                <Ionicons name={u.isBlocked ? 'lock-open' : 'ban'} size={16} color={u.isBlocked ? colors.primary : colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stat: { width: '30%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  statLabel: { color: colors.textSubtle, fontSize: font.tiny, marginTop: 2, textAlign: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, minHeight: 48 },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 10 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  userName: { color: colors.text, fontWeight: '700' },
  userEmail: { color: colors.textSubtle, fontSize: font.small },
  badges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge: { fontSize: font.tiny, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  badgeRed: { color: colors.danger, backgroundColor: 'rgba(239,68,68,0.12)' },
  badgeAmber: { color: colors.warning, backgroundColor: 'rgba(245,158,11,0.12)' },
  badgeGreen: { color: colors.primary, backgroundColor: colors.primarySoft },
  actions: { flexDirection: 'row', gap: 8 },
  actBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actGreen: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  actRed: { borderColor: colors.danger, backgroundColor: 'rgba(239,68,68,0.1)' },
  empty: { color: colors.textSubtle, textAlign: 'center', paddingTop: 30 },
});

export default AdminScreen;
