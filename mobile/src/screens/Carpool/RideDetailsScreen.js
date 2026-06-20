import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError } from '../../utils/helpers';
import Button from '../../components/common/Button';

const STATUS_COLOR = { matched: colors.primary, pending: colors.warning, matching: colors.warning, completed: colors.info, cancelled: colors.textSubtle };

const Row = ({ icon, label, value }) => (
  <View style={styles.row}>
    <Ionicons name={icon} size={16} color={colors.textSubtle} style={{ width: 22 }} />
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
  </View>
);

const RideDetailsScreen = ({ ride, onClose, onCancelled, onMessages }) => {
  const [cancelling, setCancelling] = useState(false);
  if (!ride) return null;

  const cancellable = ['pending', 'matching', 'matched'].includes(ride.status);
  const matchedCount = (ride.matchedWith || []).length;

  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const msToDeparture = new Date(ride.departureTime).getTime() - Date.now();
  const withinDeleteWindow = msToDeparture >= 0 && msToDeparture < SIX_HOURS_MS;
  const canDelete = cancellable && !withinDeleteWindow;

  const cancel = () => {
    Alert.alert('Cancel ride', 'This will cancel your ride. Continue?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel ride', style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await carpoolService.cancelRequest(ride._id);
            onCancelled?.();
          } catch (e) {
            Alert.alert('Error', apiError(e));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity>
        <Text style={styles.title}>Ride details</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[ride.status] || colors.textSubtle }]}>{ride.status}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <View style={styles.card}>
          <View style={styles.legRow}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><Text style={styles.leg} numberOfLines={2}>{ride.pickup?.address || 'Pickup'}</Text></View>
          <View style={styles.legLine} />
          <View style={styles.legRow}><View style={[styles.dot, { backgroundColor: colors.danger }]} /><Text style={styles.leg} numberOfLines={2}>{ride.dropoff?.address || 'Drop-off'}</Text></View>
        </View>

        <View style={styles.card}>
          <Row icon="time-outline" label="Departs" value={new Date(ride.departureTime).toLocaleString()} />
          <Row icon="person-outline" label="Role" value={ride.role === 'driver' ? 'Driver (offering)' : 'Passenger'} />
          <Row icon="people-outline" label={ride.role === 'driver' ? 'Seats left' : 'Seats needed'} value={String(ride.role === 'driver' ? ride.seatsAvailable : ride.seatsNeeded)} />
          {ride.price != null && <Row icon="cash-outline" label="Fare" value={`₹${ride.price}`} />}
          <Row icon="car-outline" label="Vehicle" value={ride.vehicleType || 'car'} />
          {matchedCount > 0 && <Row icon="checkmark-circle-outline" label="Matched" value={`${matchedCount} rider${matchedCount === 1 ? '' : 's'}`} />}
          {ride.notes ? <Row icon="chatbox-outline" label="Notes" value={ride.notes} /> : null}
        </View>

        <Button title="💬 Open messages" variant="ghost" onPress={onMessages} />
        {cancellable && (
          canDelete ? (
            <Button title="Cancel ride" variant="danger" onPress={cancel} loading={cancelling} />
          ) : (
            <View>
              <Button title="Cancel ride" variant="danger" onPress={cancel} loading={cancelling} disabled />
              <Text style={styles.windowNote}>Rides can only be deleted more than 6 hours before departure.</Text>
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { padding: 4 },
  title: { flex: 1, color: colors.text, fontWeight: '800', fontSize: font.h3 },
  status: { fontWeight: '700', textTransform: 'capitalize', fontSize: font.small },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  legLine: { width: 2, height: 18, backgroundColor: colors.border, marginLeft: 5, marginVertical: 2 },
  leg: { color: colors.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.textSubtle, width: 90, fontSize: font.small },
  rowValue: { color: colors.text, flex: 1, textAlign: 'right', fontSize: font.small },
  windowNote: { color: colors.textSubtle, fontSize: font.tiny, textAlign: 'center', marginTop: 6 },
});

export default RideDetailsScreen;
