import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, spacing } from '../../theme/theme';
import { CONFIG } from '../../constants/config';
import { toLatLngList, formatDistance, formatDuration, formatEmission, apiError } from '../../utils/helpers';
import routeService from '../../services/routeService';
import tripService from '../../services/tripService';
import locationService from '../../services/locationService';
import LocationSearchInput from '../../components/common/LocationSearchInput';

const MODE_COLORS = { carbon: colors.primary, time: colors.danger, distance: colors.info, balanced: colors.warning };
const dedupeKey = (r) => `${Math.round((r.total_distance_km || 0) * 10)}-${Math.round(r.total_time_minutes || 0)}`;

const MapScreen = () => {
  const mapRef = useRef(null);
  const watchRef = useRef(null);

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [optimizeFor, setOptimizeFor] = useState('carbon'); // carbon | time
  const [routes, setRoutes] = useState([]);                 // up to 3 options
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);

  const [userLoc, setUserLoc] = useState(null);
  const [trip, setTrip] = useState(null);    // { _id }
  const [progress, setProgress] = useState(null);

  useEffect(() => () => { if (watchRef.current) watchRef.current.remove(); }, []);

  const fitTo = useCallback((coords) => {
    if (mapRef.current && coords.length >= 2) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 220, right: 60, bottom: 220, left: 60 }, animated: true,
      });
    }
  }, []);

  const calculate = useCallback(async () => {
    if (!origin || !destination) return Alert.alert('Set both points', 'Choose an origin and a destination.');
    setLoading(true);
    try {
      // Eco (selected) + the complementary mode, in parallel — gives distinct
      // route lines when ORS is configured on the backend.
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
      fitTo(toLatLngList(opts[0].route_geometry));
    } catch (e) {
      Alert.alert('Routing failed', apiError(e, 'Could not calculate a route.'));
    } finally {
      setLoading(false);
    }
  }, [origin, destination, optimizeFor, fitTo]);

  const recenter = useCallback(async () => {
    try {
      const loc = await locationService.getCurrent();
      setUserLoc(loc);
      mapRef.current?.animateCamera({ center: { latitude: loc.lat, longitude: loc.lng }, zoom: 14 });
    } catch (e) {
      Alert.alert('Location', apiError(e, 'Could not get your location.'));
    }
  }, []);

  const startTrip = useCallback(async () => {
    const route = routes[selected];
    if (!route || !origin || !destination) return;
    try {
      const { trip: t } = await tripService.start({
        origin, destination,
        plannedGeometry: route.route_geometry,
        rideId: route.rideId,
      });
      setTrip(t);
      watchRef.current = await locationService.watch(async (loc) => {
        setUserLoc(loc);
        mapRef.current?.animateCamera({ center: { latitude: loc.lat, longitude: loc.lng }, zoom: 16 });
        try {
          const res = await tripService.appendWaypoint(t._id, {
            lat: loc.lat, lng: loc.lng, speedMps: loc.speed, accuracyM: loc.accuracy,
          });
          if (res.remainingKm != null) {
            setProgress({ remainingKm: res.remainingKm, progressPercent: res.progressPercent, speed: loc.speed });
          }
          if (res.shouldReroute) {
            Alert.alert('Off route', 'Recalculating…');
            calculate();
          }
        } catch (_) { /* keep tracking through network blips */ }
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
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          mapType="none"
          initialRegion={CONFIG.INITIAL_REGION}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* OSM raster tiles → no Google base imagery required (key-free look). */}
          <UrlTile urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} flipY={false} />

          {routes.map((r, i) => (
            <Polyline
              key={i}
              coordinates={toLatLngList(r.route_geometry)}
              strokeColor={i === selected ? (r.color || MODE_COLORS[r.profile] || colors.primary) : 'rgba(148,163,184,0.6)'}
              strokeWidth={i === selected ? 6 : 3}
              lineDashPattern={i === selected ? undefined : [8, 6]}
              tappable
              onPress={() => { setSelected(i); fitTo(toLatLngList(r.route_geometry)); }}
              zIndex={i === selected ? 10 : 1}
            />
          ))}

          {origin && <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} pinColor={colors.primary} title="From" />}
          {destination && <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} pinColor={colors.danger} title="To" />}
        </MapView>

        {/* Search / controls card */}
        <View style={styles.panel} pointerEvents="box-none">
          <View style={styles.card}>
            <LocationSearchInput label="From" placeholder="Origin" value={origin?.address}
              dotColor={colors.primary} onSelect={setOrigin} />
            <LocationSearchInput label="To" placeholder="Destination" value={destination?.address}
              dotColor={colors.danger} onSelect={setDestination} />

            <View style={styles.modes}>
              {[{ k: 'carbon', label: '🍃 Eco' }, { k: 'time', label: '⚡ Fastest' }].map((m) => (
                <TouchableOpacity key={m.k}
                  style={[styles.mode, optimizeFor === m.k && styles.modeOn]}
                  onPress={() => setOptimizeFor(m.k)}>
                  <Text style={[styles.modeText, optimizeFor === m.k && styles.modeTextOn]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.calcBtn} onPress={calculate} disabled={loading}>
              {loading ? <ActivityIndicator color="#04210f" /> : <Text style={styles.calcText}>Find route</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Recenter */}
        <TouchableOpacity style={styles.fab} onPress={recenter}>
          <Ionicons name="locate" size={22} color={colors.primary} />
        </TouchableOpacity>

        {/* Route option cards */}
        {routes.length > 0 && !trip && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cards} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}>
            {routes.map((r, i) => (
              <TouchableOpacity key={i} style={[styles.routeCard, i === selected && styles.routeCardOn]}
                onPress={() => { setSelected(i); fitTo(toLatLngList(r.route_geometry)); }}>
                <Text style={styles.routeName}>{r.label || (r.profile === 'time' ? 'Fastest' : r.profile === 'carbon' ? 'Eco' : `Route ${i + 1}`)}</Text>
                <Text style={styles.routeMeta}>🕑 {formatDuration(r.total_time_minutes)}  ·  📏 {formatDistance(r.total_distance_km)}</Text>
                <Text style={styles.routeCo2}>{formatEmission(r.total_emissions_g)} CO₂</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Trip progress / start-stop */}
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
  fab: {
    position: 'absolute', right: spacing.lg, bottom: 190, width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  cards: { position: 'absolute', bottom: 96, left: 0, right: 0 },
  routeCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minWidth: 170 },
  routeCardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  routeName: { color: colors.text, fontWeight: '700', marginBottom: 4 },
  routeMeta: { color: colors.textSubtle, fontSize: font.small },
  routeCo2: { color: colors.primary, fontSize: font.small, marginTop: 4 },
  tripBar: {
    position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  tripText: { color: colors.text, fontWeight: '600', flex: 1 },
  barTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.primary },
  tripBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  tripBtnStop: { backgroundColor: colors.danger },
  tripBtnText: { color: colors.white, fontWeight: '800' },
});

export default MapScreen;
