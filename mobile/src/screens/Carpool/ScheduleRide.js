import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors, font, radius, spacing } from '../../theme/theme';
import carpoolService from '../../services/carpoolService';
import { apiError, haversineKm, estimateEtaMinutes, estimateFare } from '../../utils/helpers';
import LocationSearchInput from '../../components/common/LocationSearchInput';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

// Preset departure times so we don't need a native date-time picker module.
const departurePresets = () => {
  const mk = (label, d) => ({ label, iso: d.toISOString() });
  const now = new Date();
  const plus = (mins) => new Date(now.getTime() + mins * 60000);
  const tmrw9 = new Date(now); tmrw9.setDate(now.getDate() + 1); tmrw9.setHours(9, 0, 0, 0);
  return [
    mk('Now', now),
    mk('+30 min', plus(30)),
    mk('+1 hr', plus(60)),
    mk('+2 hr', plus(120)),
    mk('Tomorrow 9 AM', tmrw9),
  ];
};

const ScheduleRide = ({ onScheduled }) => {
  const presets = useMemo(departurePresets, []);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [role, setRole] = useState('passenger');
  const [seats, setSeats] = useState(1);
  const [departure, setDeparture] = useState(presets[0].iso);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const suggested = useMemo(() => {
    if (role !== 'driver' || !pickup || !dropoff) return null;
    return Math.round(haversineKm(pickup, dropoff) * 4); // ₹4/km
  }, [role, pickup, dropoff]);

  const valid = pickup && dropoff && departure;

  const submit = async () => {
    if (!valid) return Alert.alert('Incomplete', 'Add a pickup, drop-off and departure time.');
    setLoading(true);
    try {
      const res = await carpoolService.createRequest({
        pickup: { lat: pickup.lat, lng: pickup.lng, address: pickup.address || '' },
        dropoff: { lat: dropoff.lat, lng: dropoff.lng, address: dropoff.address || '' },
        departureTime: departure,
        role,
        seatsAvailable: role === 'driver' ? seats : 0,
        seatsNeeded: role === 'passenger' ? seats : 1,
        vehicleType: 'car',
        price: price === '' ? null : Number(price),
      });
      Alert.alert(
        res.match ? 'Matched! 🎉' : 'Ride scheduled',
        res.match ? 'We found a carpool group for you.' : 'We\'ll notify you when a match is found.',
        [{ text: 'OK', onPress: onScheduled }]
      );
    } catch (e) {
      Alert.alert('Could not schedule', apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg }} keyboardShouldPersistTaps="handled">
      <LocationSearchInput label="Pickup" placeholder="Where do you start?" value={pickup?.address} dotColor={colors.primary} onSelect={setPickup} />
      <LocationSearchInput label="Drop-off" placeholder="Where are you going?" value={dropoff?.address} dotColor={colors.danger} onSelect={setDropoff} />

      <Text style={styles.label}>Role</Text>
      <View style={styles.row}>
        {['passenger', 'driver'].map((r) => (
          <TouchableOpacity key={r} style={[styles.chip, role === r && styles.chipOn]} onPress={() => setRole(r)}>
            <Text style={[styles.chipText, role === r && styles.chipTextOn]}>{r === 'driver' ? 'Driver (offering)' : 'Passenger'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{role === 'driver' ? 'Seats available' : 'Seats needed'}</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4].map((n) => (
          <TouchableOpacity key={n} style={[styles.numChip, seats === n && styles.chipOn]} onPress={() => setSeats(n)}>
            <Text style={[styles.chipText, seats === n && styles.chipTextOn]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Departure</Text>
      <View style={styles.wrapRow}>
        {presets.map((p) => (
          <TouchableOpacity key={p.label} style={[styles.chip, departure === p.iso && styles.chipOn]} onPress={() => setDeparture(p.iso)}>
            <Text style={[styles.chipText, departure === p.iso && styles.chipTextOn]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: spacing.md }}>
        <Input
          label={role === 'driver' ? `Fare per seat (₹)${suggested ? ` · suggested ₹${suggested}` : ''}` : 'Max fare (₹, optional)'}
          value={String(price)} onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad" placeholder="Leave blank to negotiate in chat"
        />
      </View>

      {pickup && dropoff && (
        <View style={styles.preview}>
          <Text style={styles.previewText}>~{estimateEtaMinutes(pickup, dropoff)} min · ₹{estimateFare(pickup, dropoff)} est.</Text>
        </View>
      )}

      <Button title="🚗 Schedule ride" onPress={submit} loading={loading} disabled={!valid} style={{ marginTop: 6 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  label: { color: colors.textSubtle, fontSize: font.small, marginBottom: 8, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexGrow: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  numChip: { width: 56, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { color: colors.textSubtle, fontWeight: '700' },
  chipTextOn: { color: colors.primary },
  preview: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center' },
  previewText: { color: colors.primary, fontWeight: '700' },
});

export default ScheduleRide;
