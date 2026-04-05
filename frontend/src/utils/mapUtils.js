import L from 'leaflet';
import { ROUTE_COLORS, POI_CATEGORIES } from './constants';

// Fix default Leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export const createCustomIcon = (emoji, color = '#22c55e', size = 36) => {
  return L.divIcon({
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
      ">
        <span style="transform:rotate(45deg); font-size:${size * 0.45}px; line-height:1;">
          ${emoji}
        </span>
      </div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor:[0, -size],
  });
};

export const createPulsingIcon = (color = '#22c55e') => {
  return L.divIcon({
    html: `
      <div style="position:relative; width:20px; height:20px;">
        <div style="
          position:absolute; inset:0;
          background:${color}; border-radius:50%;
          animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;
          opacity:0.4;
        "></div>
        <div style="
          position:absolute; inset:4px;
          background:${color}; border-radius:50%;
          border:2px solid white;
        "></div>
      </div>`,
    className: '',
    iconSize:   [20, 20],
    iconAnchor: [10, 10],
  });
};

export const createPOIIcon = (category) => {
  const cat  = POI_CATEGORIES[category] || POI_CATEGORIES['building'];
  const size = 28;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px; height:${size}px;
        background:${cat.color};
        border-radius:8px;
        border:2px solid white;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex; align-items:center; justify-content:center;
        font-size:14px;
      ">${cat.icon}</div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -size / 2],
  });
};

export const getRouteStyle = (profile, isSelected = false) => ({
  color:   ROUTE_COLORS[profile] || '#6b7280',
  weight:  isSelected ? 6 : 4,
  opacity: isSelected ? 1 : 0.6,
  dashArray: isSelected ? null : '8, 4',
  lineCap: 'round',
  lineJoin: 'round',
});

export const fitMapToRoute = (map, routeGeometry) => {
  if (!map || !routeGeometry || routeGeometry.length < 2) return;
  const bounds = L.latLngBounds(routeGeometry);
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
};

export const fitMapToMarkers = (map, markers) => {
  if (!map || !markers || markers.length === 0) return;
  const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
  map.fitBounds(bounds, { padding: [40, 40] });
};

export const formatPopupContent = (poi) => `
  <div style="font-family:Inter,sans-serif; min-width:160px;">
    <div style="font-weight:600; font-size:14px; margin-bottom:4px;">
      ${poi.icon || '📍'} ${poi.name}
    </div>
    ${poi.address ? `<div style="font-size:12px; color:#6b7280;">${poi.address}</div>` : ''}
    ${poi.category ? `
      <div style="
        display:inline-block; margin-top:6px; padding:2px 8px;
        background:#f0fdf4; color:#16a34a;
        border-radius:999px; font-size:11px; font-weight:500;
      ">${poi.category}</div>` : ''}
  </div>
`;