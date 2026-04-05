import { useState, useCallback } from 'react';
import trafficService from '../services/trafficService';

export const useTraffic = () => {
  const [trafficData, setTrafficData]   = useState(null);
  const [loading,     setLoading]       = useState(false);
  const [conditions,  setConditions]    = useState(null);

  const loadTraffic = useCallback(async (lat, lng, radius = 5) => {
    setLoading(true);
    try {
      const data = await trafficService.predictTraffic(lat, lng, radius);
      setTrafficData(data);
      setConditions(data.summary);
      return data;
    } catch (err) {
      console.warn('Traffic data unavailable:', err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCurrentConditions = useCallback(async (lat, lng) => {
    try {
      const data = await trafficService.getCurrentConditions(lat, lng);
      setConditions(data.currentConditions);
      return data;
    } catch {
      return null;
    }
  }, []);

  return { trafficData, conditions, loading, loadTraffic, getCurrentConditions };
};