import { useState, useCallback } from 'react';
import mapService from '../services/mapService';
import { useMapContext } from '../context/MapContext';
import toast from 'react-hot-toast';

export const useMap = () => {
  const ctx = useMapContext();
  const [loadingPOIs,  setLoadingPOIs]  = useState(false);
  const [loadingLoc,   setLoadingLoc]   = useState(false);

  const getUserLocation = useCallback(async () => {
    setLoadingLoc(true);
    ctx.setIsLocating(true);
    try {
      const loc = await mapService.getUserLocation();
      ctx.setUserLocation(loc);
      ctx.flyTo(loc.lat, loc.lng, 15);
      // Reverse geocode
      const addr = await mapService.nominatimReverse(loc.lat, loc.lng);
      return { ...loc, address: addr?.display_name || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` };
    } catch (err) {
      toast.error('Could not get your location. Please enable GPS.');
      return null;
    } finally {
      setLoadingLoc(false);
      ctx.setIsLocating(false);
    }
  }, [ctx]);

  const loadPOIs = useCallback(async (lat, lng, radius = 1000) => {
    setLoadingPOIs(true);
    try {
      const data = await mapService.getPOIs(lat, lng, radius);
      ctx.setPois(data.pois || []);
      ctx.setBusStops(data.busStops || []);
      ctx.setBuildings(data.buildings || []);
    } catch (err) {
      console.warn('Failed to load POIs:', err.message);
    } finally {
      setLoadingPOIs(false);
    }
  }, [ctx]);

  const searchAndFly = useCallback(async (query) => {
    try {
      const results = await mapService.nominatimSearch(query, 1);
      if (results.length > 0) {
        const r = results[0];
        ctx.flyTo(parseFloat(r.lat), parseFloat(r.lon), 15);
        return r;
      }
      toast.error('Location not found');
      return null;
    } catch {
      return null;
    }
  }, [ctx]);

  return {
    ...ctx,
    loadingPOIs,
    loadingLoc,
    getUserLocation,
    loadPOIs,
    searchAndFly,
  };
};