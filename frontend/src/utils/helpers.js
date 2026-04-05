import { GREEN_SCORE_LABELS, EMISSION_FACTORS } from './constants';

export const formatDistance = (km) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatEmission = (grams) => {
  if (grams === 0) return '0 g';
  if (grams < 1000) return `${Math.round(grams)} g`;
  return `${(grams / 1000).toFixed(2)} kg`;
};

export const formatCO2Saved = (grams) => {
  if (grams <= 0) return null;
  if (grams < 1000) return `${Math.round(grams)}g CO₂ saved`;
  return `${(grams / 1000).toFixed(2)}kg CO₂ saved`;
};

export const getGreenScoreInfo = (score) => {
  return GREEN_SCORE_LABELS.find((l) => score >= l.min) || GREEN_SCORE_LABELS[GREEN_SCORE_LABELS.length - 1];
};

export const getEmissionFactor = (vehicleType) => EMISSION_FACTORS[vehicleType] || 150;

export const calculateEmission = (distanceKm, vehicleType) => {
  return distanceKm * getEmissionFactor(vehicleType);
};

export const formatAddress = (address) => {
  if (!address) return '';
  if (typeof address === 'string') return address;
  const parts = [];
  if (address.road || address.street) parts.push(address.road || address.street);
  if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
  if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
  return parts.join(', ') || address.display || 'Unknown Location';
};

export const truncateText = (text, maxLen = 40) => {
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
};

export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const getCongestionColor = (level) => {
  const map = { free_flow: '#22c55e', moderate: '#f59e0b', heavy: '#f97316', gridlock: '#ef4444' };
  return map[level] || '#6b7280';
};

export const getVehicleIcon = (type) => {
  const map = { car: '🚗', electric: '⚡', bus: '🚌', bike: '🚲', walk: '🚶', motorcycle: '🏍️' };
  return map[type] || '🚗';
};

export const classNames = (...classes) => classes.filter(Boolean).join(' ');

export const localStorageGet = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
};

export const localStorageSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

export const formatRelativeTime = (date) => {
  const now = new Date();
  const d = new Date(date);
  const diff = (now - d) / 1000;
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};