import { useCallback, useEffect, useRef, useState } from 'react';
import tripService from '../services/tripService';

/**
 * GPS-permission-aware trip tracker.
 *
 * Behavior matches Google Maps / Waze:
 *   - permissionState === 'unsupported' or 'denied'  →  hide Start Trip
 *   - permissionState === 'prompt'  →  Start triggers permission prompt
 *   - permissionState === 'granted'  →  Start immediately begins watching
 *
 * On each watchPosition tick we:
 *   1. Update local position (for marker)
 *   2. POST waypoint to backend, which runs deviation check
 *   3. If backend reports shouldReroute, surface a callback so the page can
 *      kick off a route recalculation.
 */
export const useTripTracker = ({ onReroute } = {}) => {
  const [permissionState, setPermissionState] = useState('unknown');
  const [tripId, setTripId] = useState(null);
  const [position, setPosition] = useState(null); // {lat, lng, accuracy, t}
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);

  // Detect support + permission state.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setPermissionState('unsupported');
      return;
    }
    if (!navigator.permissions?.query) {
      // Older browsers: assume 'prompt'
      setPermissionState('prompt');
      return;
    }
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled) return;
        setPermissionState(status.state);
        status.onchange = () => setPermissionState(status.state);
      })
      .catch(() => !cancelled && setPermissionState('prompt'));
    return () => { cancelled = true; };
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }, []);

  const startTrip = useCallback(async ({ origin, destination, route, rideId }) => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation not supported on this device');
    }

    const plannedGeometry = (route?.route_geometry || [])
      .map((c) => (Array.isArray(c) ? [c[0], c[1]] : [c.lat, c.lng]))
      .filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));

    const { trip } = await tripService.start({
      origin: { lat: origin.lat, lng: origin.lng, address: origin.address || '' },
      destination: { lat: destination.lat, lng: destination.lng, address: destination.address || '' },
      plannedGeometry,
      rideId,
    });
    setTripId(trip._id);
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed } = pos.coords;
        setPosition({
          lat: latitude, lng: longitude, accuracy, t: Date.now(),
        });
        try {
          const res = await tripService.appendWaypoint(trip._id, {
            lat: latitude, lng: longitude,
            speedMps: speed ?? null,
            accuracyM: accuracy ?? null,
          });
          if (res.shouldReroute && onReroute) onReroute(res);
        } catch (err) {
          // Network blip — keep tracking; don't tear down.
          console.warn('Waypoint send failed:', err.message);
        }
      },
      (err) => {
        setError(err.message || 'Location error');
        if (err.code === 1) {
          // PERMISSION_DENIED — drop tracking; UI will hide Start.
          setPermissionState('denied');
          stopWatch();
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    );

    return trip;
  }, [onReroute, stopWatch]);

  const endTrip = useCallback(async () => {
    stopWatch();
    if (!tripId) return null;
    const res = await tripService.end(tripId);
    setTripId(null);
    setPosition(null);
    return res.trip;
  }, [tripId, stopWatch]);

  // Cleanup watch on unmount
  useEffect(() => () => stopWatch(), [stopWatch]);

  // Restore an active trip on mount (e.g. user refreshed mid-trip)
  useEffect(() => {
    let cancelled = false;
    tripService.getActive().then((res) => {
      if (cancelled) return;
      if (res.trip && !tripId) setTripId(res.trip._id);
    }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAvailable = permissionState !== 'unsupported' && permissionState !== 'denied';

  return {
    permissionState,
    isAvailable,
    tracking,
    tripId,
    position,
    error,
    startTrip,
    endTrip,
  };
};
