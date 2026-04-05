import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { createCustomIcon } from '../../utils/mapUtils';
import { MAP_TILES } from '../../utils/constants';
import 'leaflet/dist/leaflet.css';

const CarpoolMap = ({ group, height = '300px' }) => {
  if (!group?.passengers?.length) return null;

  const pickupIcon  = createCustomIcon('🟢', '#22c55e', 32);
  const dropoffIcon = createCustomIcon('🔴', '#ef4444', 32);

  const allPoints = group.passengers.flatMap((p) => [
    [p.pickup?.lat,  p.pickup?.lng],
    [p.dropoff?.lat, p.dropoff?.lng],
  ]).filter(([lat, lng]) => lat && lng);

  const center = allPoints.length > 0
    ? [allPoints[0][0], allPoints[0][1]]
    : [20.5937, 78.9629];

  return (
    <div style={{ height }} className="rounded-xl overflow-hidden">
      <MapContainer center={center} zoom={13} style={{ width: '100%', height: '100%' }}
                    zoomControl={false}>
        <TileLayer url={MAP_TILES.dark} />
        {group.passengers.map((p, i) => (
          <React.Fragment key={i}>
            {p.pickup?.lat && (
              <Marker position={[p.pickup.lat, p.pickup.lng]} icon={pickupIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>Pickup #{i + 1}</strong>
                    <p className="text-gray-500 text-xs">{p.pickup.address || ''}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            {p.dropoff?.lat && (
              <Marker position={[p.dropoff.lat, p.dropoff.lng]} icon={dropoffIcon}>
                <Popup>
                  <div className="text-sm">
                    <strong>Drop-off #{i + 1}</strong>
                    <p className="text-gray-500 text-xs">{p.dropoff.address || ''}</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}
        {allPoints.length >= 2 && (
          <Polyline
            positions={allPoints}
            pathOptions={{ color: '#8b5cf6', weight: 3, dashArray: '6,4', opacity: 0.8 }}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default CarpoolMap;