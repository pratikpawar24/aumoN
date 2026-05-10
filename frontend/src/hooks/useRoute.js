import { useState, useCallback } from 'react';
import routeService from '../services/routeService';
import { useMapContext } from '../context/MapContext';
import toast from 'react-hot-toast';

export const useRoute = () => {
  const { setCurrentRoute, setAlternatives, setTrafficData } = useMapContext();
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
  }, [setCurrentRoute, setAlternatives, setTrafficData]);

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
    loadHistory,
    loadFavorites,
    saveFavorite,
  };
};