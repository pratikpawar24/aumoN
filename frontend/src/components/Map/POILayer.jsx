import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { createPOIIcon } from '../../utils/mapUtils';
import { POI_CATEGORIES } from '../../utils/constants';

const POIMarker = ({ item, category }) => {
  const icon = createPOIIcon(category);
  const cat  = POI_CATEGORIES[category] || {};
  if (!item.lat || !item.lng) return null;

  return (
    <Marker position={[item.lat, item.lng]} icon={icon}>
      <Popup maxWidth={220}>
        <div style={{ fontFamily: 'Inter, sans-serif', padding: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>{cat.icon || '📍'}</span>
            <strong style={{ fontSize: '14px', color: '#0f172a' }}>{item.name}</strong>
          </div>
          {item.address && (
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
              📮 {item.address}
            </p>
          )}
          {item.routes && (
            <p style={{ fontSize: '11px', color: '#f59e0b' }}>
              🚌 Routes: {item.routes}
            </p>
          )}
          {item.opening_hours && (
            <p style={{ fontSize: '11px', color: '#64748b' }}>
              🕐 {item.opening_hours}
            </p>
          )}
          <span style={{
            display: 'inline-block', marginTop: '6px',
            padding: '2px 8px', borderRadius: '999px',
            background: cat.color || '#e2e8f0', color: 'white',
            fontSize: '11px', fontWeight: '500',
          }}>
            {cat.label || category}
          </span>
        </div>
      </Popup>
    </Marker>
  );
};

const POILayer = ({ pois = [], busStops = [], buildings = [] }) => {
  // Limit rendered POIs for performance
  const limitedPois      = pois.slice(0, 30);
  const limitedBusStops  = busStops.slice(0, 20);
  const limitedBuildings = buildings.slice(0, 15);

  return (
    <>
      {limitedBusStops.map((stop) => (
        <POIMarker key={`bus_${stop.id}`} item={stop} category="bus_stop" />
      ))}
      {limitedBuildings.map((bld) => (
        <POIMarker key={`bld_${bld.id}`} item={bld} category="building" />
      ))}
      {limitedPois.map((poi) => (
        <POIMarker key={`poi_${poi.id}`} item={poi} category={poi.category || 'other'} />
      ))}
    </>
  );
};

export default POILayer;