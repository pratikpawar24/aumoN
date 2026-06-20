import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError, estimateEtaMinutes, estimateFare } from '../../utils/helpers';

// Cab-style confirmation sheet. Books a seat by creating a passenger request on
// the same route (existing endpoint) — no new backend flow.
const BookingSheet = ({ ride, visible, onClose, onBooked, onMessage }) => {
  const [loading, setLoading] = useState(false);
  if (!ride) return null;

  const eta = estimateEtaMinutes(ride.pickup, ride.dropoff);
  const fare = ride.price != null ? ride.price : estimateFare(ride.pickup, ride.dropoff);

  const book = async () => {
    setLoading(true);
    try {
      await carpoolService.createRequest({
        pickup: { lat: ride.pickup.lat, lng: ride.pickup.lng, address: ride.pickup.address || '' },
        dropoff: { lat: ride.dropoff.lat, lng: ride.dropoff.lng, address: ride.dropoff.address || '' },
        departureTime: ride.departureTime,
        role: 'passenger',
        seatsNeeded: 1,
        vehicleType: ride.vehicleType || 'car',
        price: ride.price ?? null,
      });
      Alert.alert('Seat requested 🚗', 'Your booking request was sent. Coordinate with the driver in chat.', [
        { text: 'Open chat', onPress: () => { onClose?.(); onMessage?.(ride); } },
        { text: 'OK', onPress: () => { onClose?.(); onBooked?.(); } },
      ]);
    } catch (e) {
      Alert.alert('Could not book', apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Confirm booking</Text>
          <View style={styles.leg}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.legText} numberOfLines={1}>{ride.pickup?.address || 'Pickup'}</Text></View>
          <View style={styles.leg}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.legText} numberOfLines={1}>{ride.dropoff?.address || 'Drop-off'}</Text></View>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}><Ionicons name="cash-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>₹{fare}{ride.price == null ? ' est.' : ''}</Text></View>
            <View style={styles.metaChip}><Ionicons name="time-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>~{eta} min</Text></View>
            <View style={styles.metaChip}><Ionicons name="people-outline" size={16} color={colors.primary} /><Text style={styles.metaText}>{ride.seatsAvailable} left</Text></View>
          </View>
          <TouchableOpacity style={styles.bookBtn} onPress={book} disabled={loading}>
            <Text style={styles.bookText}>{loading ? 'Booking…' : 'Book this ride'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onClose}><Text style={styles.ghostText}>Cancel</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 6 },
  title: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  leg: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legText: { color: colors.textMuted, flex: 1 },
  metaRow: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  metaText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  bookBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  bookText: { color: '#04210f', fontWeight: '800', fontSize: font.body },
  ghostBtn: { alignItems: 'center', paddingVertical: 10 },
  ghostText: { color: colors.textSubtle, fontWeight: '700' },
});

export default BookingSheet;
