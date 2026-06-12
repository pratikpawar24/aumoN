import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError } from '../../utils/helpers';
import Loading from '../../components/common/Loading';

const STATUS_COLOR = { matched: colors.primary, pending: colors.warning, completed: colors.info, cancelled: colors.textSubtle };

const RideHistory = ({ reloadKey, onOpenDetail }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const data = await carpoolService.getHistory({ status: 'pending,matching,matched,completed,cancelled' });
      setItems(data.requests || []);
    } catch (e) {
      setErr(apiError(e, 'Could not load history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  if (loading) return <Loading full label="Loading history…" />;

  return (
    <FlatList
      data={items}
      keyExtractor={(r) => r._id}
      contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{err || 'No rides yet'}</Text>
          <Text style={styles.emptySub}>Your scheduled and matched rides appear here.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => onOpenDetail?.(item)} activeOpacity={0.8}>
          <View style={styles.head}>
            <Text style={styles.roleTxt}>{item.role === 'driver' ? '🚗 Driving' : '🧍 Passenger'}</Text>
            <Text style={[styles.status, { color: STATUS_COLOR[item.status] || colors.textSubtle }]}>{item.status}</Text>
          </View>
          <Text style={styles.route} numberOfLines={1}>🟢 {item.pickup?.address || 'Pickup'}</Text>
          <Text style={styles.route} numberOfLines={1}>🔴 {item.dropoff?.address || 'Drop-off'}</Text>
          <Text style={styles.when}>🕑 {new Date(item.departureTime).toLocaleString()}{item.price != null ? ` · ₹${item.price}` : ''}</Text>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  roleTxt: { color: colors.text, fontWeight: '700' },
  status: { fontWeight: '700', textTransform: 'capitalize', fontSize: font.small },
  route: { color: colors.textMuted, fontSize: font.small },
  when: { color: colors.textSubtle, fontSize: font.tiny, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.text, fontWeight: '600' },
  emptySub: { color: colors.textSubtle, fontSize: font.small, marginTop: 6 },
});

export default RideHistory;
