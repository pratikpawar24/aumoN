import { useState, useCallback } from 'react';
import carpoolService from '../services/carpoolService';
import toast from 'react-hot-toast';

export const useCarpool = () => {
  const [requests,    setRequests]    = useState([]);
  const [available,   setAvailable]   = useState([]);
  const [history,     setHistory]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  const createRequest = useCallback(async (data) => {
    setLoading(true);
    try {
      const result = await carpoolService.createRequest(data);
      setMatchResult(result);
      if (result.match) {
        toast.success(`🎉 Matched with ${result.match.passengerCount - 1} passenger(s)!`);
      } else {
        toast.success('Carpool request submitted! Looking for matches...');
      }
      return result;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create request');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await carpoolService.getMyRequests();
      setRequests(data.requests || []);
    } catch { } finally {
      setLoading(false);
    }
  }, []);

  const loadAvailable = useCallback(async (lat, lng) => {
    try {
      const data = await carpoolService.getAvailableRides(lat, lng);
      setAvailable(data.rides || []);
    } catch { }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await carpoolService.getCarpoolHistory();
      setHistory(data.requests || []);
    } catch { }
  }, []);

  const cancelRequest = useCallback(async (id) => {
    try {
      await carpoolService.cancelRequest(id);
      toast.success('Request cancelled');
      loadMyRequests();
    } catch {
      toast.error('Failed to cancel request');
    }
  }, [loadMyRequests]);

  return {
    requests, available, history, loading, matchResult,
    createRequest, loadMyRequests, loadAvailable, loadHistory, cancelRequest,
  };
};