import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import { formatDistance, formatDuration, formatEmission, apiError } from '../../utils/helpers';
import routeService from '../../services/routeService';
import tripService from '../../services/tripService';
import locationService from '../../services/locationService';
import LocationSearchInput from '../../components/common/LocationSearchInput';
import LeafletMap from '../../components/map/LeafletMap';

const dedupeKey = (r) => `${Math.round((r.total_distance_km || 0) * 10)}-${Math.round(r.total_time_minutes || 0)}`;

const MapScreen = () => {
  const watchRef = useRef(null);

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [optimizeFor, setOptimizeFor] = useState('carbon'); // carbon | time
  const [routes, setRoutes] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);

  const [userLoc, setUserLoc] = useState(null);
  const [trip, setTrip] = useState(null);
  const [progress, setProgress] = useState(null);

  // Tokens nudge the WebView to fit-to-route / recenter without re-fitting on
  // every GPS tick.
  const [fitToken, setFitToken] = useState(0);
  const [centerToken, setCenterToken] = useState(0);

  useEffect(() => () => { if (watchRef.current) watchRef.current.remove(); }, []);

  const calculate = useCallback(async () => {
    if (!origin || !destination) return Alert.alert('Set both points', 'Choose an origin and a destination.');
    setLoading(true);
    try {
      const pairMode = optimizeFor === 'carbon' ? 'time' : 'carbon';
      const [primary, paired] = await Promise.all([
        routeService.calculate(origin, destination, { optimizeFor }),
        routeService.calculate(origin, destination, { optimizeFor: pairMode, saveRoute: false }).catch(() => null),
      ]);
      const seen = new Set();
      const opts = [];
      for (const r of [primary?.primary_route, paired?.primary_route, ...(primary?.alternatives || [])]) {
        if (!r?.route_geometry?.length) continue;
        const k = dedupeKey(r);
        if (seen.has(k)) continue;
        seen.add(k); opts.push(r);
        if (opts.length >= 3) break;
      }
      if (!opts.length) throw new Error('No route found');
      setRoutes(opts);
      setSelected(0);
      setFitToken((t) => t + 1);
    } catch (e) {
      Alert.alert('Routing failed', apiError(e, 'Could not calculate a route.'));
    } finally {
      setLoading(false);
    }
  }, [origin, destination, optimizeFor]);

  const selectRoute = useCallback((i) => { setSelected(i); setFitToken((t) => t + 1); }, []);

  const recenter = useCallback(async () => {
    try {
      const loc = await locationService.getCurrent();
      setUserLoc(loc);
      setCenterToken((t) => t + 1);
    } catch (e) {
      Alert.alert('Location', apiError(e, 'Could not get your location.'));
    }
  }, []);

  const startTrip = useCallback(async () => {
    const route = routes[selected];
    if (!route || !origin || !destination) return;
    try {
      const { trip: t } = await tripService.start({
        origin, destination, plannedGeometry: route.route_geometry, rideId: route.rideId,
      });
      setTrip(t);
      watchRef.current = await locationService.watch(async (loc) => {
        setUserLoc(loc);
        try {
          const res = await tripService.appendWaypoint(t._id, {
            lat: loc.lat, lng: loc.lng, speedMps: loc.speed, accuracyM: loc.accuracy,
          });
          if (res.remainingKm != null) {
            setProgress({ remainingKm: res.remainingKm, progressPercent: res.progressPercent, speed: loc.speed });
          }
          if (res.shouldReroute) { Alert.alert('Off route', 'Recalculating…'); calculate(); }
        } catch (_) { /* keep tracking through blips */ }
      });
    } catch (e) {
      Alert.alert('Trip', apiError(e, 'Could not start trip.'));
    }
  }, [routes, selected, origin, destination, calculate]);

  const stopTrip = useCallback(async () => {
    if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; }
    try { if (trip?._id) await tripService.end(trip._id); } catch (_) {}
    setTrip(null); setProgress(null);
  }, [trip]);

  const etaMin = progress?.remainingKm != null
    ? Math.round((progress.remainingKm / (progress.speed > 0.5 ? progress.speed * 3.6 : 30)) * 60)
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.fill}>
        <View style={StyleSheet.absoluteFill}>
          <LeafletMap
            routes={routes}
            selected={selected}
            origin={origin}
            destination={destination}
            user={userLoc}
            fitToken={fitToken}
            centerToken={centerToken}
            follow={!!trip}
            onSelectRoute={selectRoute}
          />
        </View>

        {/* Search / controls card */}
        <View style={styles.panel} pointerEvents="box-none">
          <View style={styles.card}>
            <LocationSearchInput label="From" placeholder="Origin" value={origin?.address} dotColor={colors.primary} onSelect={setOrigin} />
            <LocationSearchInput label="To" placeholder="Destination" value={destination?.address} dotColor={colors.danger} onSelect={setDestination} />
            <View style={styles.modes}>
              {[{ k: 'carbon', label: '🍃 Eco' }, { k: 'time', label: '⚡ Fastest' }].map((m) => (
                <TouchableOpacity key={m.k} style={[styles.mode, optimizeFor === m.k && styles.modeOn]} onPress={() => setOptimizeFor(m.k)}>
                  <Text style={[styles.modeText, optimizeFor === m.k && styles.modeTextOn]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
              {loading ? <ActivityIndicator color="#04210f" /> : <Text style={styles.calcText}>Find route</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.fab} onPress={recenter}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>

        {routes.length > 0 && !trip && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cards} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}>
            {routes.map((r, i) => (
              <TouchableOpacity key={i} style={[styles.routeCard, i === selected && styles.routeCardOn]} onPress={() => selectRoute(i)}>
                <Text style={styles.routeName}>{r.label || (r.profile === 'time' ? 'Fastest' : r.profile === 'carbon' ? 'Eco' : `Route ${i + 1}`)}</Text>
                <Text style={styles.routeMeta}>🕑 {formatDuration(r.total_time_minutes)}  ·  📏 {formatDistance(r.total_distance_km)}</Text>
                <Text style={styles.routeCo2}>{formatEmission(r.total_emissions_g)} CO₂</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {routes.length > 0 && (
          <View style={styles.tripBar}>
            {trip && progress ? (
              <View style={{ flex: 1 }}>
                <Text style={styles.tripText}>{progress.remainingKm?.toFixed(1)} km left{etaMin != null ? `  ·  ~${etaMin} min` : ''}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress.progressPercent || 0}%` }]} /></View>
              </View>
            ) : (
              <Text style={styles.tripText}>{routes[selected]?.label || 'Route ready'} · tap Start to track</Text>
            )}
            <TouchableOpacity style={[styles.tripBtn, trip && styles.tripBtnStop]} onPress={trip ? stopTrip : startTrip}>
              <Text style={styles.tripBtnText}>{trip ? '⏹ Stop' : '▶ Start'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  panel: { position: 'absolute', top: spacing.sm, left: spacing.lg, right: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  modes: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  mode: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  modeOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  modeText: { color: colors.textSubtle, fontWeight: '700' },
  modeTextOn: { color: colors.primary },
  calcBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  calcText: { color: '#04210f', fontWeight: '800', fontSize: font.body },
  fab: { position: 'absolute', right: spacing.lg, bottom: 190, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cards: { position: 'absolute', bottom: 96, left: 0, right: 0 },
  routeCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minWidth: 170 },
  routeCardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  routeName: { color: colors.text, fontWeight: '700', marginBottom: 4 },
  routeMeta: { color: colors.textSubtle, fontSize: font.small },
  routeCo2: { color: colors.primary, fontSize: font.small, marginTop: 4 },
  tripBar: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  tripText: { color: colors.text, fontWeight: '600', flex: 1 },
  barTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.primary },
  tripBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  tripBtnStop: { backgroundColor: colors.danger },
  tripBtnText: { color: colors.white, fontWeight: '800' },
});

export default MapScreen;
