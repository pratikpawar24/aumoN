import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing, TAB_BAR_HEIGHT } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import locationService from '../../services/locationService';
import { apiError, estimateEtaMinutes, estimateFare } from '../../utils/helpers';
import Loading from '../../components/common/Loading';
import BookingSheet from '../../components/carpool/BookingSheet';

const FindRides = ({ onOpenChat }) => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [booking, setBooking] = useState(null); // ride being booked
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      let params = { sort: 'time' };
      try {
        const loc = await locationService.getCurrent();
        params = { fromLat: loc.lat, fromLng: loc.lng, fromRadius: 10, sort: 'proximity' };
      } catch (_) { /* no location → list all upcoming */ }
      const data = await carpoolService.getAvailable(params);
      setRides(data.rides || []);
    } catch (e) {
      setErr(apiError(e, 'Could not load rides.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading full label="Finding rides…" />;

  return (
    <>
      <FlatList
        data={rides}
        keyExtractor={(r) => r._id}
        contentContainerStyle={{ padding: spacing.lg, gap: 10, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + spacing.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{err || 'No rides available right now'}</Text>
            <Text style={styles.emptySub}>Pull to refresh or schedule one yourself.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const driver = item.userId || {};
          return (
            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(driver.name || 'D')[0].toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{driver.name || 'Driver'}</Text>
                  <Text style={styles.meta}>{driver.vehicleType || 'car'} · score {driver.greenScore ?? 50}</Text>
                </View>
                {item.price != null && <Text style={styles.price}>₹{item.price}</Text>}
              </View>
              <Text style={styles.route} numberOfLines={1}>🟢 {item.pickup?.address || 'Pickup'}</Text>
              <Text style={styles.route} numberOfLines={1}>🔴 {item.dropoff?.address || 'Drop-off'}</Text>
              <Text style={styles.when}>🕑 {new Date(item.departureTime).toLocaleString()} · {item.seatsAvailable} seat{item.seatsAvailable === 1 ? '' : 's'} left</Text>
              <View style={styles.estRow}>
                <Text style={styles.estChip}>₹{item.price != null ? item.price : estimateFare(item.pickup, item.dropoff)}{item.price == null ? ' est' : ''}</Text>
                <Text style={styles.estChip}>~{estimateEtaMinutes(item.pickup, item.dropoff)} min</Text>
                {item.pickupDistanceKm != null && <Text style={styles.estChip}>{item.pickupDistanceKm} km away</Text>}
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.bookBtn} onPress={() => setBooking(item)}>
                  <Ionicons name="car-outline" size={16} color="#04210f" />
                  <Text style={styles.bookText}>Book</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.msgBtn} onPress={() => onOpenChat?.(item)}>
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />
                  <Text style={styles.msgText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      <BookingSheet
        ride={booking}
        visible={!!booking}
        onClose={() => setBooking(null)}
        onBooked={load}
        onMessage={onOpenChat}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: 4 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  name: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.textSubtle, fontSize: font.small },
  price: { color: colors.primary, fontWeight: '800', fontSize: font.h3 },
  route: { color: colors.textMuted, fontSize: font.small },
  when: { color: colors.textSubtle, fontSize: font.tiny, marginTop: 4 },
  estRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  estChip: { color: colors.primary, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, fontSize: font.tiny, fontWeight: '700', overflow: 'hidden' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: spacing.sm },
  bookBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10 },
  bookText: { color: '#04210f', fontWeight: '800', fontSize: font.small },
  msgBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 10 },
  msgText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.text, fontWeight: '600' },
  emptySub: { color: colors.textSubtle, fontSize: font.small, marginTop: 6 },
});

export default FindRides;
