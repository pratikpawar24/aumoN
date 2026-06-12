// Straight-line distance in km between two {lat,lng} points.
export const haversineKm = (a, b) => {
  if (!a || !b) return 0;
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

export const formatDistance = (km) => {
  if (km == null) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
};

export const formatDuration = (min) => {
  if (min == null) return '—';
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

export const formatEmission = (grams) => {
  if (grams == null) return '—';
  return grams < 1000 ? `${Math.round(grams)} g` : `${(grams / 1000).toFixed(1)} kg`;
};

// react-native-maps wants {latitude, longitude}; the backend returns
// route_geometry as [lat, lng] pairs (or {lat,lng}).
export const toLatLngList = (geometry = []) =>
  geometry
    .map((p) => {
      if (Array.isArray(p)) return { latitude: p[0], longitude: p[1] };
      if (p && p.lat != null) return { latitude: p.lat, longitude: p.lng };
      return null;
    })
    .filter(Boolean);

export const apiError = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || err?.message || fallback;
