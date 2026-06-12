import { useState, useCallback } from 'react';
import routeService from '../services/routeService';
import { useMapContext } from '../context/MapContext';
import toast from 'react-hot-toast';

// Map of complementary optimization modes. Each mode is paired with the
// one users most likely want to compare against side-by-side.
export const PROFILE_PAIR = {
  carbon: 'time',
  time: 'carbon',
  distance: 'balanced',
  balanced: 'distance',
};

// Combine a primary route with extra candidates (the complementary mode and
// any API-provided alternatives) into a de-duplicated list of at most 3
// routes — the set drawn on the map and shown as selectable cards.
const buildRouteOptions = (primaryRoute, extras = []) => {
  const seen = new Set();
  const out = [];
  for (const r of [primaryRoute, ...extras]) {
    if (!r || !(r.route_geometry?.length || r.routeGeometry?.length)) continue;
    const key = `${r.profile || r.label}-${r.total_distance_km}-${r.total_time_minutes}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= 3) break;
  }
  return out;
};

export const useRoute = () => {
  const {
    setCurrentRoute, setPairedRoute, setAlternatives, setTrafficData,
    setRouteOptions, setSelectedRouteIdx,
  } = useMapContext();
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(null);
  const [routeResult,    setRouteResult]    = useState(null);
  const [rideHistory,    setRideHistory]    = useState([]);
  const [favorites,      setFavorites]      = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const calculateRoute = useCallback(async (orig, dest, options = {}) => {
    if (!orig || !dest) {
      toast.error('Please set both origin and destination');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await routeService.calculateRoute(orig, dest, options);
      if (result.primary_route) {
        setCurrentRoute(result.primary_route);
        setAlternatives(result.alternatives || []);
        const options3 = buildRouteOptions(result.primary_route, result.alternatives || []);
        setRouteOptions(options3);
        setSelectedRouteIdx(0);
        setRouteResult(result);
        // Surface the bbox-grid traffic overlay returned by the AI service so
        // the existing TrafficLayer renders it without a separate fetch.
        if (result.traffic_overlay?.length) {
          setTrafficData({ segments: result.traffic_overlay });
        }
        const co2 = result.primary_route.carbon_saved_g;
        if (co2 > 0) {
          toast.success(
            `🌿 Route found! Saving ${Math.round(co2)}g CO₂`,
            { duration: 3000 }
          );
        } else {
          toast.success('Route calculated!');
        }
      }
      return result;
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || 'Failed to calculate route';
      setError(msg);
      // DISTANCE_TOO_FAR is a UX message, not an error — show it longer
      // and as a regular toast instead of red.
      if (data?.code === 'DISTANCE_TOO_FAR') {
        toast(msg, { icon: '🌍', duration: 6000 });
      } else {
        toast.error(msg);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [setCurrentRoute, setAlternatives, setTrafficData, setRouteOptions, setSelectedRouteIdx]);

  // Calculate the selected mode + its pair in parallel. The selected one
  // becomes currentRoute (drawn solid); the pair becomes pairedRoute
  // (drawn dotted). Used by the mode buttons so users always see their
  // chosen mode plus its complementary mode for visual comparison.
  const calculateBoth = useCallback(async (orig, dest, options = {}) => {
    if (!orig || !dest) {
      toast.error('Please set both origin and destination');
      return null;
    }
    const primaryMode = options.optimizeFor || 'carbon';
    const pairMode = PROFILE_PAIR[primaryMode] || 'time';
    setLoading(true);
    setError(null);
    try {
      const [primary, paired] = await Promise.all([
        routeService.calculateRoute(orig, dest, { ...options, optimizeFor: primaryMode })
          .catch((e) => { throw e; }),
        // Don't fail the whole call if the pair fails — primary is what
        // matters; paired is purely a comparison hint.
        routeService.calculateRoute(orig, dest, { ...options, optimizeFor: pairMode, saveRoute: false })
          .catch((e) => null),
      ]);

      if (primary?.primary_route) {
        setCurrentRoute(primary.primary_route);
        setAlternatives(primary.alternatives || []);
        // 3-route set: selected mode + complementary mode + one API alternative.
        const options3 = buildRouteOptions(primary.primary_route, [
          paired?.primary_route,
          ...(primary.alternatives || []),
        ]);
        setRouteOptions(options3);
        setSelectedRouteIdx(0);
        setRouteResult(primary);
        if (primary.traffic_overlay?.length) {
          setTrafficData({ segments: primary.traffic_overlay });
        }
        const co2 = primary.primary_route.carbon_saved_g;
        if (co2 > 0) {
          toast.success(`🌿 Route found! Saving ${Math.round(co2)}g CO₂`, { duration: 2500 });
        } else {
          toast.success('Route calculated!');
        }
      }
      setPairedRoute(paired?.primary_route || null);
      return primary;
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || 'Failed to calculate route';
      setError(msg);
      if (data?.code === 'DISTANCE_TOO_FAR') {
        toast(msg, { icon: '🌍', duration: 6000 });
      } else {
        toast.error(msg);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [setCurrentRoute, setPairedRoute, setAlternatives, setTrafficData, setRouteOptions, setSelectedRouteIdx]);

  const loadHistory = useCallback(async (page = 1, filters = {}) => {
    setHistoryLoading(true);
    try {
      const data = await routeService.getRideHistory(page, 10, filters);
      setRideHistory(data.rides || []);
      return data;
    } catch (err) {
      console.error('History error:', err);
      return null;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadFavorites = useCallback(async () => {
    try {
      const data = await routeService.getFavorites();
      setFavorites(data.routes || []);
    } catch (err) {
      console.error('Favorites error:', err);
    }
  }, []);

  const saveFavorite = useCallback(async (routeData) => {
    try {
      await routeService.saveFavorite(routeData);
      toast.success('Route saved to favorites! ⭐');
      loadFavorites();
    } catch {
      toast.error('Failed to save route');
    }
  }, [loadFavorites]);

  return {
    loading,
    error,
    routeResult,
    rideHistory,
    favorites,
    historyLoading,
    calculateRoute,
    calculateBoth,
    loadHistory,
    loadFavorites,
    saveFavorite,
  };
};